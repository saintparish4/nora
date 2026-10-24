# frozen_string_literal: true

require 'rails_helper'

# Against the demo practice's FHIR bundles (db/fhir/demo) and its seeded
# requests, whose requirements were resolved through the real services.
RSpec.describe RequestForm::ClinicalAnswers do
  let(:source) { Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES) }

  def answers_for(pa, fhir_id: pa.patient.fhir_id, set: RequestForm::QuestionSet.for(payer: pa.policy_template.payer.name, item: pa.item_name))
    chart = Fhir::Chart.new(source: source, patient_id: fhir_id)
    described_class.call(pa, chart: chart, question_set: set).index_by(&:link_id)
  end

  def seeded(last_name)
    seed_demo_practice
    PriorAuthorization.joins(:patient).find_by!(patients: { last_name: last_name })
  end

  context "Tom Okafor's Saxenda request on the FEP form, every requirement verified" do
    let(:answers) { answers_for(seeded('Okafor')) }

    it 'answers each question that applies, with its source' do
      expect(answers.transform_values { |a| a.answer&.dig(:display) }).to include(
        'brand-generic' => 'Brand', 'diagnosis' => 'Obesity, used for chronic weight management', 'pens-90-days' => '15',
        'program' => 'Yes', 'glp1' => 'No, the patient is not using another GLP-1', 'pa-combination' => 'No',
        'change-from-zepbound' => 'No', 'continuation' => 'NO – this is INITIATION of therapy',
        'initiation-bmi' => 'Greater than or equal to 30kg/m2'
      )
      expect(answers.values.map(&:status).uniq).to eq([ 'answered' ])
      expect(answers['initiation-bmi'].source).to include(reference: 'Observation/demo-1004-bmi-1', in_epic: 'Vitals', detail: 'BMI 36.5 on 08/28/2026')
      expect(answers['pens-90-days'].source).to include(reference: 'MedicationRequest/demo-1004-rx', detail: include('5 pen per 30 days'))
    end

    it 'answers the clinical questions from verified chart quotes, naming who verified them' do
      source = answers['program'].source
      expect(source[:kind]).to eq('quote')
      expect(source[:quotes]).to all(include(:excerpt, :document, :verified_by, :verified_at))
      expect(source[:quotes].map { |q| q[:verified_by] }).to all(be_present)
    end

    it 'leaves out the questions this patient does not get: pediatric, Blue Focus, renewal, and comorbidities at BMI 30+' do
      expect(answers.keys).not_to include('initiation-pediatric-bmi', 'focus-nonformulary', 'focus-switch-generic',
                                          'continuation-loss', 'continuation-maintained', 'initiation-comorbidity')
    end
  end

  it 'never answers a question it cannot source, across every seeded request' do
    seed_demo_practice
    PriorAuthorization.includes(:patient, policy_template: :payer).find_each do |pa|
      answers_for(pa).each_value do |a|
        if a.status == 'answered'
          expect(a.source).to be_present, "#{pa.patient.last_name} #{a.link_id}"
        else
          expect([ a.answer, a.source ]).to eq([ nil, nil ])
          expect(a.reason).to be_present
        end
      end
    end
  end

  it "hands a requirement nobody has verified to the prescriber's office (Marcus Bell, gathering)" do
    answers = answers_for(seeded('Bell'))

    expect(answers['program']).to have_attributes(status: 'ask_prescriber', answer: nil, reason: include('No verified chart quote'))
    expect(answers['age']).to have_attributes(status: 'answered', answer: include(display: 'Yes'))
    expect(answers['comorbidity'].depends_on).to eq([ "What was the patient's baseline BMI, before any weight-loss drug?" ])
  end

  context 'when each order references a Medication, as Epic sends it' do
    let(:source) { EpicShapedSource.new(Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES)) }

    it "gives the same answers as when the order carries its own code (Tom Okafor's Saxenda request)" do
      pa = seeded('Okafor')
      epic = answers_for(pa)
      plain = described_class.call(pa, chart: Fhir::Chart.new(source: Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES), patient_id: pa.patient.fhir_id),
                                       question_set: RequestForm::QuestionSet.for(payer: pa.policy_template.payer.name, item: pa.item_name)).index_by(&:link_id)

      expect(epic.transform_values { |a| [ a.status, a.answer ] }).to eq(plain.transform_values { |a| [ a.status, a.answer ] })
      expect(epic.values.map(&:status).uniq).to eq([ 'answered' ])
    end
  end

  context 'on the FEP Zepbound form with a BMI of 28.4 (Marcus Bell)' do
    let(:set) { RequestForm::QuestionSet.for(payer: 'Blue Cross Blue Shield Federal Employee Program', item: 'Zepbound') }
    let(:pa) { travel_to(Time.zone.local(2026, 10, 23)) { create_prior_authorization(item_name: 'Zepbound') } }

    it 'asks the comorbidity question and answers it from the problem list' do
      answers = answers_for(pa, fhir_id: 'demo-1002', set: set)

      expect(answers['initiation-bmi'].answer).to eq(codes: [ '27-29.9' ], display: 'Between 27 kg/m2 and 29.9 kg/m2')
      expect(answers['initiation-comorbidity'].answer[:codes]).to contain_exactly('type-2-diabetes-mellitus', 'hypertension')
      expect(answers['initiation-comorbidity'].source[:reference]).to include('Condition/demo-1002-condition-3', 'Condition/demo-1002-condition-4')
      expect(answers['pens-over-limit'].answer).to include(display: 'No')
      expect(answers['continuation'].answer).to include(codes: [ 'initiation' ])
      expect(answers['tried-saxenda-wegovy']).to have_attributes(status: 'ask_prescriber', reason: include('prescriber'))
    end

    it 'does not read "None of the above" into a problem list that lists none of them' do
      source.search('Condition', patient: 'demo-1002').each { |c| c['code']['coding'][0]['code'] = 'R73.03' if c['code']['coding'][0]['code'].match?(/\A(I10|E11)/) }
      answers = answers_for(pa, fhir_id: 'demo-1002', set: set)

      expect(answers['initiation-comorbidity']).to have_attributes(status: 'ask_prescriber', answer: nil, reason: include('None of the above'))
    end

    it 'calls a prescription older than four months a question for the office, not a renewal' do
      source.search('MedicationRequest', patient: 'demo-1002').first['authoredOn'] = '2026-03-01'
      answers = answers_for(pa, fhir_id: 'demo-1002', set: set)

      expect(answers['continuation']).to have_attributes(status: 'ask_prescriber', reason: include('03/01/2026'))
      question = '10. Has the patient been on this medication continuously for the last 4 months excluding samples? Please select answer below:'
      expect(answers.values_at('initiation-bmi', 'continuation-loss').map(&:depends_on)).to all(eq([ question ]))
    end
  end

  it 'keeps the questions that hang on a chart gap, and names the gap (no FEP option on the coverage)' do
    pa = seeded('Okafor')
    coverage = source.search('Coverage', patient: 'demo-1004').first
    coverage['class'].find { |c| c['type']['coding'][0]['code'] == 'plan' }.merge!('name' => 'Service Benefit Plan', 'value' => 'sbp')
    answers = answers_for(pa)

    expect(answers['plan-option']).to have_attributes(status: 'check_chart', reason: include('Coverages'))
    expect(answers['change-from-zepbound'].depends_on).to eq([ 'FEP plan option' ])
    expect(answers['focus-nonformulary'].depends_on).to eq([ 'FEP plan option' ])
  end
end
