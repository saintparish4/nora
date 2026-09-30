# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Ai::Client do
  let(:sdk) { instance_double(OpenAI::Client) }
  let(:client) { described_class.new(sdk: sdk) }

  def reply(content)
    { 'choices' => [ { 'message' => { 'content' => content } } ], 'usage' => { 'prompt_tokens' => 10, 'completion_tokens' => 5 } }
  end

  it 'returns the parsed JSON object' do
    allow(sdk).to receive(:chat).and_return(reply('{"criteria": []}'))
    expect(client.complete_json(system: 's', user: 'u')).to eq('criteria' => [])
  end

  it 'asks for JSON output at low temperature' do
    expect(sdk).to receive(:chat).with(parameters: hash_including(response_format: { type: 'json_object' }, temperature: 0.1))
                                  .and_return(reply('{}'))
    client.complete_json(system: 's', user: 'u')
  end

  it 'raises Ai::Client::Error on unparseable output' do
    allow(sdk).to receive(:chat).and_return(reply('not json'))
    expect { client.complete_json(system: 's', user: 'u') }.to raise_error(Ai::Client::Error, /unparseable/)
  end

  it 'wraps transport failures in Ai::Client::Error' do
    allow(sdk).to receive(:chat).and_raise(Faraday::TimeoutError)
    expect { client.complete_json(system: 's', user: 'u') }.to raise_error(Ai::Client::Error)
  end

  it 'never logs the prompt' do
    allow(sdk).to receive(:chat).and_return(reply('{}'))
    logged = []
    allow(Rails.logger).to receive(:info) { |msg| logged << msg }
    client.complete_json(system: 'SECRET-SYSTEM', user: 'SECRET-USER')
    expect(logged.join).not_to include('SECRET')
    expect(logged.join).to include('prompt_tokens')
  end

  it 'refuses to run without a key' do
    stub_const('ENV', ENV.to_h.merge('OPENAI_API_KEY' => ''))
    expect { described_class.new.complete_json(system: 's', user: 'u') }.to raise_error(Ai::Client::NotConfigured)
  end

  it 'refuses to send chart text in production until a BAA is confirmed' do
    allow(Rails.env).to receive(:production?).and_return(true)
    stub_const('ENV', ENV.to_h.merge('OPENAI_API_KEY' => 'k', 'AI_PHI_BAA_CONFIRMED' => nil))
    expect { described_class.new.complete_json(system: 's', user: 'u') }.to raise_error(Ai::Client::NotConfigured, /BAA/)
  end
end
