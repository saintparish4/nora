# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Triage::ConversationSufficiencyService do
  let(:conversation) { Conversation.create!(session_id: SecureRandom.uuid, status: 'active') }
  let(:service) { described_class.new(conversation) }

  describe '#check' do
    context 'with a single short user message (< 30 chars)' do
      before do
        conversation.conversation_messages.create!(role: 'user', content: 'I have a headache')
      end

      it 'returns insufficient without calling LLM' do
        result = service.check

        expect(result[:sufficient]).to be false
        expect(result[:follow_up_question]).to be_present
      end
    end

    context 'with two or more user messages' do
      before do
        conversation.conversation_messages.create!(role: 'user', content: 'I have a headache')
        conversation.conversation_messages.create!(role: 'assistant', content: 'Can you describe it more?')
        conversation.conversation_messages.create!(role: 'user', content: 'It started yesterday and is throbbing behind my eyes')
      end

      it 'returns sufficient without calling LLM' do
        result = service.check

        expect(result[:sufficient]).to be true
        expect(result[:follow_up_question]).to be_nil
      end
    end

    context 'with a single long user message (>= 30 chars) and LLM returns sufficient' do
      before do
        conversation.conversation_messages.create!(
          role: 'user',
          content: 'I have had a persistent headache for three days with nausea'
        )
      end

      it 'calls LLM and returns the parsed result' do
        llm_response = {
          'choices' => [
            { 'message' => { 'content' => '{"sufficient": true, "follow_up_question": null}' } }
          ]
        }
        client_double = instance_double(OpenAI::Client)
        allow(client_double).to receive(:chat).and_return(llm_response)
        allow(OpenAI::Client).to receive(:new).and_return(client_double)

        result = service.check

        expect(result[:sufficient]).to be true
      end
    end

    context 'when the LLM call raises an error (heuristic fallback)' do
      before do
        conversation.conversation_messages.create!(
          role: 'user',
          content: 'I have had a severe migraine since yesterday morning and it keeps getting worse'
        )
      end

      it 'falls back to heuristic and returns sufficient (long text with duration keyword)' do
        client_double = instance_double(OpenAI::Client)
        allow(client_double).to receive(:chat).and_raise(StandardError, 'API timeout')
        allow(OpenAI::Client).to receive(:new).and_return(client_double)

        result = service.check

        # Heuristic: >= 50 chars + contains "yesterday" => sufficient
        expect(result[:sufficient]).to be true
      end
    end

    context 'when the LLM call raises and heuristic says insufficient' do
      before do
        conversation.conversation_messages.create!(
          role: 'user',
          content: 'My knee hurts when I walk around the block'
        )
      end

      it 'falls back to heuristic and returns insufficient (no duration keyword)' do
        client_double = instance_double(OpenAI::Client)
        allow(client_double).to receive(:chat).and_raise(StandardError, 'API timeout')
        allow(OpenAI::Client).to receive(:new).and_return(client_double)

        result = service.check

        expect(result[:sufficient]).to be false
        expect(result[:follow_up_question]).to be_present
      end
    end
  end
end
