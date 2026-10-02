# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Authorizations::QuestionHelpService do
  let(:pa) { create_prior_authorization }
  let(:ai) { instance_double(Ai::Client) }
  let(:question) { 'Has the patient had an inadequate response to another anti-obesity medication?' }

  def ask(reply)
    allow(ai).to receive(:complete_json).and_return(reply)
    described_class.call(pa, question: question, ai_client: ai)
  end

  def reply(answer:, findings:, **rest)
    { 'plain_language' => 'They want to know whether another drug was tried and did not work.', 'what_counts' => [ 'drug name', 'outcome' ],
      'answer' => answer, 'findings' => findings, 'suggested_answer' => 'Yes. Saxenda, stopped for nausea.', 'ask_clinician' => '' }.merge(rest)
  end

  let(:real_quote) { 'Plan: Previously tried Saxenda from 2025-06 to 2025-10; discontinued due to nausea.' }

  it 'returns the explanation and a verified quote with its place in the chart' do
    result = ask(reply(answer: 'supported', findings: [ { 'document_id' => 'D1', 'quote' => real_quote, 'supports' => true, 'note' => 'names the drug and why it stopped' } ]))
    finding = result[:findings].sole
    document = pa.patient.chart_documents.first

    expect(result[:plain_language]).to include('another drug')
    expect(result[:answer]).to eq('supported')
    expect(result[:suggested_answer]).to include('Saxenda')
    expect(document.body[finding[:start_offset]...finding[:end_offset]]).to eq(finding[:excerpt])
    expect(finding).to include(supports: true, document: hash_including(id: document.id))
  end

  it 'throws away a quote that is not in the chart, and with it the claim' do
    result = ask(reply(answer: 'supported', findings: [ { 'document_id' => 'D1', 'quote' => 'Failed phentermine and orlistat.', 'supports' => true } ]))

    expect(result[:findings]).to be_empty
    expect(result[:discarded_quotes]).to eq(1)
    expect(result[:answer]).to eq('not_documented')
    expect(result[:suggested_answer]).to be_nil
  end

  it 'will not call it supported when no quote supports it' do
    result = ask(reply(answer: 'supported', findings: [ { 'document_id' => 'D1', 'quote' => 'Vitals: BMI 34.2. BP 128/82.', 'supports' => false } ]))

    expect(result[:answer]).to eq('mentioned_only')
    expect(result[:suggested_answer]).to be_nil
  end

  it 'treats an answer outside the list as not documented' do
    expect(ask(reply(answer: 'approve it', findings: []))[:answer]).to eq('not_documented')
  end

  it 'redacts identifiers and gives the request date' do
    prompt = nil
    allow(ai).to receive(:complete_json) { |args| prompt = args[:user]; reply(answer: 'not_documented', findings: []) }
    described_class.call(pa, question: question, ai_client: ai)

    expect(prompt).to include('[PATIENT]', "Request date: #{pa.created_at.to_date.iso8601}", question)
    expect(prompt).not_to include('Rivera', pa.patient.mrn)
  end

  it 'refuses a blank or over-long question without calling the model' do
    allow(ai).to receive(:complete_json)

    expect { described_class.call(pa, question: ' ', ai_client: ai) }.to raise_error(Authorizations::Error, /Paste the question/)
    expect { described_class.call(pa, question: 'x' * 2_001, ai_client: ai) }.to raise_error(Authorizations::Error, /too long/)
    expect(ai).not_to have_received(:complete_json)
  end

  it 'says so when the model is not available' do
    stub_const('ENV', ENV.to_h.merge('OPENAI_API_KEY' => ''))
    expect { described_class.call(pa, question: question) }.to raise_error(Authorizations::Error, /OPENAI_API_KEY is not set/)
  end

  it 'turns a model failure into a message for the user' do
    allow(ai).to receive(:complete_json).and_raise(Ai::Client::Error, 'timeout')
    expect { described_class.call(pa, question: question, ai_client: ai) }.to raise_error(Authorizations::Error, /could not answer/)
  end
end
