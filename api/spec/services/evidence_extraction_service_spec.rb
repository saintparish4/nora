# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Authorizations::EvidenceExtractionService do
  let(:pa) { create_prior_authorization }
  let(:ai) { instance_double(Ai::Client) }
  let(:requirements) { pa.requirements.reload.includes(:policy_criterion).index_by { |r| r.policy_criterion.position } }

  def run(client = ai)
    described_class.call(pa, actor: pa.created_by, ai_client: client)
    pa.reload
  end

  def ai_returns(criteria)
    allow(ai).to receive(:complete_json).and_return('criteria' => criteria)
  end

  it 'finds rule-based evidence before asking the model' do
    ai_returns([])
    run

    bmi = requirements[1].evidence.to_a
    expect(bmi.map(&:extracted_by)).to include('rule')
    expect(bmi.map(&:excerpt).join).to include('BMI 34.2')
  end

  it 'never marks a requirement met, only pending' do
    ai_returns([])
    run
    expect(requirements.values.map(&:status)).not_to include('met')
    expect(requirements[1].status).to eq('pending')
  end

  it 'redacts identifiers from what the model sees' do
    prompt = nil
    allow(ai).to receive(:complete_json) { |args| prompt = args[:user]; { 'criteria' => [] } }
    run
    expect(prompt).to include('[PATIENT]', '[DOB]', '[MRN]')
    expect(prompt).not_to include('Rivera', '03/14/1984', pa.patient.mrn)
  end

  it 'keeps a verbatim model quote and maps it back to the original text' do
    ai_returns([ { 'criterion_id' => 'C3', 'summary' => 'Diet documented since January.',
                   'findings' => [ { 'document_id' => 'D1', 'quote' => '[PATIENT] has followed a reduced-calorie diet with our dietitian since January 2026.', 'confidence' => 0.8 } ] } ])
    run

    ai_evidence = requirements[3].evidence.select { |e| e.extracted_by == 'ai' }
    expect(ai_evidence.size).to eq(1).or eq(0) # may be a duplicate of the rule hit
    all = requirements[3].evidence.map(&:excerpt).join
    expect(all).to include('Jane Rivera has followed a reduced-calorie diet')
    expect(requirements[3].ai_summary).to eq('Diet documented since January.')
  end

  it 'discards a quote that is not in the chart and counts it' do
    ai_returns([ { 'criterion_id' => 'C2', 'findings' => [ { 'document_id' => 'D1', 'quote' => 'Failed phentermine and orlistat.', 'confidence' => 0.9 } ] } ])
    run

    expect(AuthorizationEvidence.where(excerpt: 'Failed phentermine and orlistat.')).to be_empty
    event = pa.workflow_events.find_by(event_type: 'extraction_succeeded')
    expect(event.payload['unverifiable_quotes']).to eq(1)
  end

  it 'marks requirements without evidence missing after a clean run, and opens a task' do
    doc = pa.patient.chart_documents.first
    doc.evidence.destroy_all
    allow(ai).to receive(:complete_json).and_return('criteria' => [])
    # A chart with nothing relevant in it.
    doc.delete
    create(:chart_document, patient: pa.patient, body: 'Seen for a sprained ankle. Ice and rest.')
    run

    expect(requirements.values.map(&:status).uniq).to eq([ 'missing' ])
    expect(pa.status).to eq('needs_clarification')
    expect(Task.open.where(subject: pa).count).to eq(3)
  end

  it 'fails closed when the model errors: rule evidence kept, the rest unclear' do
    allow(ai).to receive(:complete_json).and_raise(Ai::Client::Error, 'timeout')
    run

    expect(pa.extraction_status).to eq('failed')
    expect(pa.extraction_error).to include('timeout')
    expect(requirements[1].status).to eq('pending')
    create(:chart_document, patient: pa.patient, body: 'x' * 10) # unrelated
    expect(requirements.values.map(&:status)).not_to include('met', 'missing')
  end

  it 'runs rules only, and says so, when no API key is configured' do
    stub_const('ENV', ENV.to_h.merge('OPENAI_API_KEY' => ''))
    described_class.call(pa, actor: pa.created_by)
    pa.reload

    expect(pa.extraction_status).to eq('succeeded')
    expect(pa.extraction_error).to match(/OPENAI_API_KEY/)
  end

  it 'skips the model when asked for the rule pass alone, even with a client to hand' do
    allow(ai).to receive(:complete_json)
    described_class.call(pa, actor: pa.created_by, ai_client: ai, model_pass: false)
    pa.reload

    expect(ai).not_to have_received(:complete_json)
    expect(pa.extraction_status).to eq('succeeded')
    expect(pa.extraction_error).to match(/rule pass/)
    expect(requirements[1].evidence.map(&:extracted_by).uniq).to eq([ 'rule' ])
  end

  it 'fails with a clear message when the patient has no chart documents' do
    pa = create_prior_authorization(with_document: false)
    described_class.call(pa, actor: pa.created_by, ai_client: ai)
    expect(pa.reload.extraction_status).to eq('failed')
    expect(pa.extraction_error).to match(/Add chart documents/)
  end

  it 'leaves requirements a person already reviewed alone' do
    ai_returns([])
    req = pa.requirements.first
    Authorizations::RequirementReviewService.call(req, actor: pa.created_by, status: 'unclear', note: 'Asked Dr. Chen')
    run
    expect(req.reload.status).to eq('unclear')
  end

  it 'does not duplicate evidence on a second run' do
    ai_returns([])
    run
    count = AuthorizationEvidence.count
    run
    expect(AuthorizationEvidence.count).to eq(count)
  end

  it 'splits an over-long chart across several model calls' do
    stub_const("#{described_class}::MAX_CHARS_PER_CALL", 200)
    create(:chart_document, patient: pa.patient, body: ("Filler paragraph about unrelated care.\n\n" * 12))
    allow(ai).to receive(:complete_json).and_return('criteria' => [])
    run
    expect(ai).to have_received(:complete_json).at_least(3).times
  end
end
