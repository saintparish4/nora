# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Workspace API', type: :request do
  let(:organization) { create(:organization) }
  let(:admin) { create(:user, :admin, organization: organization) }
  let(:staff) { create(:user, organization: organization) }
  let(:outsider) { create(:user, :admin) }

  describe 'organization and members' do
    it 'shows the practice' do
      get '/api/v1/organization', headers: auth_headers(staff)
      expect(parsed_body['organization']['name']).to eq(organization.name)
    end

    it 'lets an admin add a member with a role' do
      post '/api/v1/organization/members', headers: auth_headers(admin),
           params: { email: 'dr.chen@example.com', first_name: 'Avery', last_name: 'Chen', role: 'clinician', password: 'temporary123' }

      expect(response).to have_http_status(:created)
      expect(organization.users.find_by(email: 'dr.chen@example.com').role).to eq('clinician')
    end

    it 'rejects an unknown role' do
      post '/api/v1/organization/members', headers: auth_headers(admin),
           params: { email: 'x@example.com', password: 'temporary123', role: 'owner' }
      expect(response).to have_http_status(:unprocessable_content)
    end

    it 'forbids staff from adding members' do
      post '/api/v1/organization/members', headers: auth_headers(staff), params: { email: 'x@example.com', password: 'temporary123' }
      expect(response).to have_http_status(:forbidden)
    end

    it 'stops an admin removing their own admin role' do
      patch "/api/v1/organization/members/#{admin.id}", headers: auth_headers(admin), params: { role: 'staff' }
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "cannot touch another practice's members" do
      patch "/api/v1/organization/members/#{staff.id}", headers: auth_headers(outsider), params: { role: 'admin' }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'patients' do
    let!(:patient) { create(:patient, organization: organization, first_name: 'Marcus', last_name: 'Bell') }

    it 'lists and searches patients in the practice, and logs PHI access' do
      create(:patient, first_name: 'Hidden', last_name: 'Elsewhere')

      expect {
        get '/api/v1/patients', params: { q: 'bell' }, headers: auth_headers(staff)
      }.to change(PhiAccessLog, :count).by(1)

      expect(parsed_body['patients'].map { |p| p['last_name'] }).to eq([ 'Bell' ])
      expect(parsed_body['meta']['total']).to eq(1)
    end

    it 'creates a patient' do
      post '/api/v1/patients', headers: auth_headers(staff),
           params: { first_name: 'Priya', last_name: 'Nair', date_of_birth: '1990-06-21', mrn: 'P-1' }
      expect(response).to have_http_status(:created)
      expect(PhiAccessLog.last.action).to eq('create')
    end

    it 'returns validation errors' do
      post '/api/v1/patients', headers: auth_headers(staff), params: { first_name: 'No' }
      expect(response).to have_http_status(:unprocessable_content)
      expect(parsed_body['errors']).to include(a_string_matching(/Last name/))
    end

    it "404s on another practice's patient" do
      get "/api/v1/patients/#{patient.id}", headers: auth_headers(outsider)
      expect(response).to have_http_status(:not_found)
    end

    it 'shows coverages, documents, and requests on the patient page' do
      create(:patient_coverage, patient: patient)
      create(:chart_document, patient: patient)
      get "/api/v1/patients/#{patient.id}", headers: auth_headers(staff)
      expect(parsed_body.keys).to include('coverages', 'chart_documents', 'prior_authorizations')
      expect(parsed_body['chart_documents'].first).not_to have_key('body')
    end

    it 'adds a coverage' do
      plan = create(:insurance_plan)
      post "/api/v1/patients/#{patient.id}/coverages", headers: auth_headers(staff),
           params: { insurance_plan_id: plan.id, member_id: 'W228841093' }
      expect(response).to have_http_status(:created)
      expect(parsed_body['coverage']['payer']['name']).to eq(plan.payer.name)
    end
  end

  describe 'chart documents' do
    let(:patient) { create(:patient, organization: organization) }

    it 'stores pasted text' do
      post "/api/v1/patients/#{patient.id}/chart_documents", headers: auth_headers(staff), as: :json,
           params: { kind: 'office_note', title: 'Visit', occurred_on: '2026-08-12', body: 'BMI 34.2. Obesity.' }
      expect(response).to have_http_status(:created)
      expect(parsed_body['chart_document']['body']).to eq('BMI 34.2. Obesity.')
      expect(parsed_body['chart_document']['source']).to eq('paste')
    end

    it 'reads an uploaded text file' do
      file = Rack::Test::UploadedFile.new(StringIO.new("Office note\nBMI 31.0"), 'text/plain', original_filename: 'note.txt')
      post "/api/v1/patients/#{patient.id}/chart_documents", headers: auth_headers(staff),
           params: { kind: 'office_note', file: file }
      expect(response).to have_http_status(:created)
      expect(parsed_body['chart_document']).to include('source' => 'upload', 'title' => 'note.txt', 'body' => "Office note\nBMI 31.0")
    end

    it 'explains an unreadable upload' do
      file = Rack::Test::UploadedFile.new(StringIO.new('x'), 'image/png', original_filename: 'scan.png')
      post "/api/v1/patients/#{patient.id}/chart_documents", headers: auth_headers(staff), params: { kind: 'office_note', file: file }
      expect(response).to have_http_status(:unprocessable_content)
      expect(parsed_body['errors'].first).to match(/PDF or a plain-text/)
    end

    it 'refuses to delete a document cited as evidence' do
      pa = create_prior_authorization(organization: organization)
      Authorizations::EvidenceExtractionService.call(pa, actor: staff, ai_client: instance_double(Ai::Client, complete_json: { 'criteria' => [] }))
      doc = pa.patient.chart_documents.first

      delete "/api/v1/chart_documents/#{doc.id}", headers: auth_headers(staff)
      expect(response).to have_http_status(:conflict)
    end
  end

  describe 'reference data' do
    it 'lists payers with plans and the policy library' do
      create(:insurance_plan)
      create(:policy_template)
      get '/api/v1/payers', headers: auth_headers(staff)
      expect(parsed_body['payers'].first['plans']).to be_present

      get '/api/v1/policy_templates', headers: auth_headers(staff)
      expect(parsed_body['items']).to eq([ 'Wegovy' ])

      get "/api/v1/policy_templates/#{PolicyTemplate.first.id}", headers: auth_headers(staff)
      expect(parsed_body['policy_template']['criteria'].size).to eq(3)
    end
  end

  it 'requires sign-in everywhere' do
    [ '/api/v1/today', '/api/v1/patients', '/api/v1/prior_authorizations', '/api/v1/tasks', '/api/v1/payers' ].each do |path|
      get path
      expect(response).to have_http_status(:unauthorized), path
    end
  end
end
