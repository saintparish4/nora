# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RequestForm::RecordAnswer do
  let(:source) { Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES) }
  let(:organization) { seed_demo_practice }
  let(:staff) { organization.users.find_by!(email: 'ma@nora.com') }

  def request_for(last_name) = PriorAuthorization.joins(:patient).find_by!(patients: { last_name: last_name })

  def form_items(pa)
    RequestForm::Builder.call(pa.reload, source: source).dig(:questions, :items).index_by { |i| i[:link_id] }
  end

  def record(pa, **answer) = described_class.call(pa, actor: staff, source: source, **answer)

  before { organization }

  it "records the prescriber's office's answer to a question Nora could not answer, as manual, and branches on it (Jane Rivera, Cigna)" do
    jane = request_for('Rivera')
    expect(form_items(jane)['bmi']).to include(status: 'ask_prescriber')

    answer = record(jane, link_id: 'bmi', codes: [ '27-29.9' ], note: 'Office faxed the 2025 BMI: 29.1 before Saxenda')

    expect(answer).to have_attributes(origin: 'manual', codes: [ '27-29.9' ], recorded_by: staff)
    items = form_items(jane)
    expect(items['bmi']).to include(status: 'answered', origin: 'manual', source: include(kind: 'staff', recorded_by: 'Jordan Blake', note: include('29.1')))
    expect(items['comorbidity'][:depends_on]).to eq([])
    expect(jane.workflow_events.last).to have_attributes(event_type: 'form_answer_recorded', payload: include('link_id' => 'bmi', 'origin' => 'manual'))

    record(jane, link_id: 'bmi', codes: [ '30-plus' ])
    expect(form_items(jane)).not_to have_key('comorbidity')
  end

  it "records a correction to Nora's answer as an override, and giving Nora's answer back clears it (Tom Okafor, FEP)" do
    tom = request_for('Okafor')

    expect(record(tom, link_id: 'pens-90-days', value: '18')).to have_attributes(origin: 'override', value: { 'value' => '18' })
    expect(form_items(tom)['pens-90-days']).to include(answer: { codes: nil, display: '18' }, origin: 'override', source: include(replaces: '15'))

    expect(record(tom, link_id: 'pens-90-days', value: '15')).to be_nil
    expect(tom.form_answers.reload).to be_empty
    expect(form_items(tom)['pens-90-days']).to include(origin: 'auto')
  end

  it 'refuses answers the question does not offer, and a request already submitted' do
    tom = request_for('Okafor')
    expect { record(tom, link_id: 'program', codes: [ 'maybe' ]) }.to raise_error(Authorizations::Error, /Not a choice/)
    expect { record(tom, link_id: 'program', codes: %w[yes no]) }.to raise_error(Authorizations::Error, /Choose one/)
    expect { record(tom, link_id: 'pens-90-days', value: 'lots') }.to raise_error(Authorizations::Error, /whole number/)

    Authorizations::SubmitService.call(tom, actor: staff)
    expect { record(tom.reload, link_id: 'program', codes: [ 'no' ]) }.to raise_error(Authorizations::Error, /submitted/)
  end
end
