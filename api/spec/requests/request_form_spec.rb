# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'GET /api/v1/prior_authorizations/:id/request_form', type: :request do
  it "fills the featured demo request's fields from its FHIR chart, and names what is missing" do
    organization = seed_demo_practice
    staff = organization.users.find_by!(email: 'ma@nora.com')
    featured = Demo::Practice.featured_request

    get "/api/v1/prior_authorizations/#{featured.id}/request_form", headers: auth_headers(staff)

    form = parsed_body['request_form']
    fields = form['fields'].index_by { |f| f['key'] }
    expect(form).to include('available' => true, 'patient_fhir_id' => 'demo-1001', 'chart_source' => 'demo FHIR bundles')
    expect(fields['last_name']).to include('value' => 'Rivera', 'source' => include('in_epic' => 'Patient header and demographics'))
    expect(fields['rx_bin']).to include('value' => nil, 'missing' => include('call the pharmacy'))
    expect(PhiAccessLog.where(resource_id: featured.id.to_s, action: 'view')).to exist
  end

  it "adds the plan's clinical questions, each answered with its source or handed to the prescriber's office" do
    organization = seed_demo_practice
    staff = organization.users.find_by!(email: 'ma@nora.com')

    get "/api/v1/prior_authorizations/#{Demo::Practice.featured_request.id}/request_form", headers: auth_headers(staff)

    questions = parsed_body.dig('request_form', 'questions')
    expect(questions['set']).to include('id' => 'cigna-wegovy', 'kind' => 'derived')
    expect(questions['items'].map { |i| i['status'] }).to include('answered', 'ask_prescriber')
    expect(questions['items'].find { |i| i['link_id'] == 'age' }).to include('answer' => { 'codes' => [ 'yes' ], 'display' => 'Yes' },
                                                                             'source' => include('in_epic' => 'Patient header and demographics'))
  end

  it 'says so when the patient has no chart record to read' do
    pa = create_prior_authorization

    get "/api/v1/prior_authorizations/#{pa.id}/request_form", headers: auth_headers(pa.created_by)

    expect(parsed_body['request_form']).to eq('available' => false, 'reason' => 'This patient is not linked to a record on the FHIR server.')
  end

  it 'is scoped to the practice' do
    pa = create_prior_authorization
    get "/api/v1/prior_authorizations/#{pa.id}/request_form", headers: auth_headers(create(:user))
    expect(response).to have_http_status(:not_found)
  end

  it "keeps the fields when the plan's questions cannot be worked out" do
    organization = seed_demo_practice
    staff = organization.users.find_by!(email: 'ma@nora.com')
    allow(RequestForm::Cql).to receive(:call).and_raise(RequestForm::Cql::Error, 'CQL did not run: Node.js is not installed')

    get "/api/v1/prior_authorizations/#{Demo::Practice.featured_request.id}/request_form", headers: auth_headers(staff)

    form = parsed_body['request_form']
    expect(form['available']).to be(true)
    expect(form['questions']).to eq('available' => false, 'reason' => "Nora could not work out the plan's questions just now. Answer them from the requirements.")
  end
end
