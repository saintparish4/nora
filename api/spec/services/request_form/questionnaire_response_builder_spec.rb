# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RequestForm::QuestionnaireResponseBuilder do
  let(:source) { Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES) }
  let(:organization) { seed_demo_practice }
  let(:staff) { organization.users.find_by!(email: 'ma@nora.com') }
  let(:tom) { PriorAuthorization.joins(:patient).find_by!(patients: { last_name: 'Okafor' }) }

  before { organization }

  it "marks each answer with where it came from, as DTR does, and links the response to the coverage and the order" do
    RequestForm::RecordAnswer.call(tom, actor: staff, link_id: 'pens-90-days', value: '18', source: source)
    response = RequestForm::Builder.call(tom.reload, source: source).dig(:questions, :questionnaire_response)

    expect(response).to include('resourceType' => 'QuestionnaireResponse', 'status' => 'completed', 'subject' => { 'reference' => 'Patient/demo-1004' },
                                'questionnaire' => 'https://nora.example/fhir/Questionnaire/fep-saxenda|2026-01-12')
    expect(response['extension'].map { |e| e.dig('valueReference', 'reference') }.compact).to eq([ 'Coverage/demo-1004-coverage', 'MedicationRequest/demo-1004-rx' ])
    origin = ->(link) { response['item'].find { |i| i['linkId'] == link }['answer'].first['extension'].first }
    expect(origin.call('program')['extension']).to eq([ { 'url' => 'source', 'valueCode' => 'auto' } ])
    expect(origin.call('pens-90-days')['extension']).to eq([
      { 'url' => 'source', 'valueCode' => 'override' },
      { 'url' => 'author', 'extension' => [ { 'url' => 'practitioner', 'valueReference' => { 'display' => 'Jordan Blake' } } ] }
    ])
    expect(response['item'].find { |i| i['linkId'] == 'pens-90-days' }['answer']).to contain_exactly(include('valueInteger' => 18))
  end

  it 'stays in progress while a question that applies has no answer (Jane Rivera)' do
    jane = PriorAuthorization.joins(:patient).find_by!(patients: { last_name: 'Rivera' })
    response = RequestForm::Builder.call(jane, source: source).dig(:questions, :questionnaire_response)
    expect(response['status']).to eq('in-progress')
    expect(response['item'].map { |i| i['linkId'] }).not_to include('bmi')
  end

  it 'is kept with the final check, as what was entered on CoverMyMeds' do
    Authorizations::SubmitService.call(tom, actor: staff)
    form = tom.approvals.last.submitted_form
    expect(form['fields']).to include(include('key' => 'rx_bin', 'value' => '999104'))
    expect(form.dig('questionnaire_response', 'item').size).to eq(11)
    expect(tom.workflow_events.find_by(event_type: 'final_check').payload['form_digest']).to match(/\A\h{64}\z/)
  end
end
