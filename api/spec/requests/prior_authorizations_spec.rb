# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Prior authorizations API', type: :request do
  let(:organization) { create(:organization) }
  let(:staff) { create(:user, organization: organization) }
  let(:clinician) { create(:user, :clinician, organization: organization) }
  let(:patient) { create(:patient, organization: organization) }
  let(:coverage) { create(:patient_coverage, patient: patient) }
  let!(:template) { create(:policy_template) }
  let!(:document) { create(:chart_document, patient: patient, uploaded_by: staff) }
  let(:ai) { instance_double(Ai::Client, complete_json: { 'criteria' => [] }) }

  before { allow(Ai::Client).to receive(:new).and_return(ai) }

  def create_pa
    post '/api/v1/prior_authorizations', headers: auth_headers(staff), as: :json,
         params: { patient_id: patient.id, patient_coverage_id: coverage.id, item_name: 'Wegovy', requested_by_id: clinician.id }
    expect(response).to have_http_status(:created)
    parsed_body['prior_authorization']
  end

  it 'runs the whole flow: create, extract, review, approve, packet, submit, decide' do
    pa = create_pa
    expect(pa['status']).to eq('gathering')
    expect(pa['requirements'].size).to eq(3)
    id = pa['id']

    perform_enqueued_jobs do
      post "/api/v1/prior_authorizations/#{id}/extract", headers: auth_headers(staff)
    end
    expect(response).to have_http_status(:accepted)

    get "/api/v1/prior_authorizations/#{id}", headers: auth_headers(staff)
    pa = parsed_body['prior_authorization']
    expect(pa['extraction_status']).to eq('succeeded')

    pa['requirements'].each do |req|
      if req['evidence'].empty?
        post "/api/v1/authorization_requirements/#{req['id']}/evidence", headers: auth_headers(staff), as: :json,
             params: { chart_document_id: document.id, quote: 'BMI 34.2.' }
        expect(response).to have_http_status(:created)
      else
        req['evidence'].each do |ev|
          patch "/api/v1/authorization_evidence/#{ev['id']}", headers: auth_headers(staff), as: :json, params: { review: 'verify' }
          expect(response).to have_http_status(:ok)
        end
      end
      patch "/api/v1/authorization_requirements/#{req['id']}", headers: auth_headers(staff), as: :json, params: { status: 'met' }
      expect(response).to have_http_status(:ok)
    end
    expect(parsed_body['prior_authorization']['status']).to eq('ready_for_review')

    post "/api/v1/prior_authorizations/#{id}/approve", headers: auth_headers(staff)
    expect(response).to have_http_status(:unprocessable_content)
    expect(parsed_body['error']).to match(/clinician or an admin/)

    post "/api/v1/prior_authorizations/#{id}/approve", headers: auth_headers(clinician)
    expect(parsed_body['prior_authorization']['status']).to eq('approved')
    expect(parsed_body['prior_authorization']['approval']['current']).to be true
    expect(parsed_body['prior_authorization']['allowed_transitions']).to include('submitted', 'cancelled')

    get "/api/v1/prior_authorizations/#{id}/packet", headers: auth_headers(staff)
    expect(response.media_type).to eq('application/pdf')
    expect(response.body).to start_with('%PDF')

    post "/api/v1/prior_authorizations/#{id}/transition", headers: auth_headers(staff), as: :json,
         params: { to: 'submitted', payer_reference: 'PA-1', prep_minutes_reported: 5 }
    expect(parsed_body['prior_authorization']['status']).to eq('submitted')

    post "/api/v1/prior_authorizations/#{id}/transition", headers: auth_headers(staff), as: :json, params: { to: 'approved_by_payer' }
    expect(parsed_body['prior_authorization']['status']).to eq('approved_by_payer')

    get "/api/v1/prior_authorizations/#{id}/events", headers: auth_headers(staff)
    types = parsed_body['events'].map { |e| e['event_type'] }
    expect(types).to include('created', 'extraction_started', 'extraction_succeeded', 'evidence_verified', 'approved', 'packet_downloaded')
    expect(types.last).to eq('status_changed')
  end

  it 'filters the list by status and returns counts' do
    create_pa
    get '/api/v1/prior_authorizations', params: { status: 'gathering' }, headers: auth_headers(staff)
    expect(parsed_body['prior_authorizations'].size).to eq(1)
    expect(parsed_body['prior_authorizations'].first['requirement_counts']['pending']).to eq(3)

    get '/api/v1/prior_authorizations', params: { status: 'approved' }, headers: auth_headers(staff)
    expect(parsed_body['prior_authorizations']).to be_empty
  end

  it 'explains a missing policy' do
    post '/api/v1/prior_authorizations', headers: auth_headers(staff), as: :json,
         params: { patient_id: patient.id, patient_coverage_id: coverage.id, item_name: 'Ozempic' }
    expect(response).to have_http_status(:unprocessable_content)
    expect(parsed_body['error']).to match(/no criteria for Ozempic/)
  end

  it 'reassigns and records the time a person reports' do
    id = create_pa['id']
    patch "/api/v1/prior_authorizations/#{id}", headers: auth_headers(staff), as: :json,
          params: { assigned_to_id: clinician.id, prep_minutes_reported: 7 }
    expect(parsed_body['prior_authorization']['assigned_to']['id']).to eq(clinician.id)
    expect(parsed_body['prior_authorization']['prep_minutes_reported']).to eq(7)
  end

  it 'refuses a packet before approval' do
    id = create_pa['id']
    get "/api/v1/prior_authorizations/#{id}/packet", headers: auth_headers(staff)
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "keeps other practices out of a request and its evidence" do
    id = create_pa['id']
    outsider = create(:user, :admin)
    requirement_id = AuthorizationRequirement.where(prior_authorization_id: id).first.id

    get "/api/v1/prior_authorizations/#{id}", headers: auth_headers(outsider)
    expect(response).to have_http_status(:not_found)
    patch "/api/v1/authorization_requirements/#{requirement_id}", headers: auth_headers(outsider), as: :json, params: { status: 'missing' }
    expect(response).to have_http_status(:not_found)
  end

  it 'rate-limits extraction per IP' do
    id = create_pa['id']
    11.times { post "/api/v1/prior_authorizations/#{id}/extract", headers: auth_headers(staff) }
    expect(response).to have_http_status(:too_many_requests)
    expect(parsed_body['throttle']).to eq('ai/ip')
  end

  describe 'Today and tasks' do
    it 'shows what needs attention and lets a person close a task' do
      id = create_pa['id']
      AuthorizationRequirement.where(prior_authorization_id: id).find_each do |req|
        patch "/api/v1/authorization_requirements/#{req.id}", headers: auth_headers(staff), as: :json, params: { status: 'missing' }
      end

      get '/api/v1/today', headers: auth_headers(clinician)
      expect(parsed_body['needs_attention'].first['kind']).to eq('needs_clarification')
      expect(parsed_body['my_tasks'].size).to eq(3)

      get '/api/v1/tasks', params: { mine: 'true', status: 'open' }, headers: auth_headers(clinician)
      task = parsed_body['tasks'].first
      expect(task['subject']['item_name']).to eq('Wegovy')

      get '/api/v1/tasks', params: { prior_authorization_id: id }, headers: auth_headers(staff)
      expect(parsed_body['tasks'].size).to eq(3)
      get '/api/v1/tasks', params: { prior_authorization_id: id + 1000 }, headers: auth_headers(staff)
      expect(parsed_body['tasks']).to be_empty

      patch "/api/v1/tasks/#{task['id']}", headers: auth_headers(clinician), as: :json, params: { status: 'done' }
      expect(parsed_body['task']['status']).to eq('done')
    end
  end

  describe 'POST /prior_authorizations/:id/question_help' do
    it 'returns the service result for a request in the practice, and nothing for another practice' do
      pa = create_prior_authorization
      allow(Authorizations::QuestionHelpService).to receive(:call).and_return({ answer: 'not_documented', findings: [] })

      post "/api/v1/prior_authorizations/#{pa.id}/question_help", headers: auth_headers(pa.created_by), params: { question: 'What is step therapy?' }
      expect(response).to have_http_status(:ok)
      expect(parsed_body['question_help']['answer']).to eq('not_documented')

      post "/api/v1/prior_authorizations/#{pa.id}/question_help", headers: auth_headers(create(:user)), params: { question: 'x' }
      expect(response).to have_http_status(:not_found)
    end

    it 'answers 422 with the reason when the model is not set up' do
      pa = create_prior_authorization
      stub_const('ENV', ENV.to_h.merge('OPENAI_API_KEY' => ''))

      post "/api/v1/prior_authorizations/#{pa.id}/question_help", headers: auth_headers(pa.created_by), params: { question: 'What is step therapy?' }
      expect(response).to have_http_status(:unprocessable_content)
      expect(parsed_body['error']).to match(/OPENAI_API_KEY is not set/)
    end
  end
end
