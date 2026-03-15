# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Symptom Chat API', type: :request do
  let(:session_id) { SecureRandom.uuid }

  # Stub external APIs globally for this spec
  before do
    allow(Resend::Emails).to receive(:send).and_return({ 'id' => 'test' })
  end

  # -----------------------------------------------------------------
  # Missing / blank params
  # -----------------------------------------------------------------
  describe 'POST /api/v1/symptom-chat/send' do
    context 'without session_id' do
      it 'returns 422 with error' do
        post '/api/v1/symptom-chat/send', params: { message: 'I have a headache for two days' }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(parsed_body['error']).to eq('session_id is required')
      end
    end

    context 'with a blank message' do
      it 'returns 422 with error' do
        post '/api/v1/symptom-chat/send', params: { session_id: session_id, message: '' }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(parsed_body['error']).to eq('message is required')
      end
    end

    context 'without a message param' do
      it 'returns 422 with error' do
        post '/api/v1/symptom-chat/send', params: { session_id: session_id }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(parsed_body['error']).to eq('message is required')
      end
    end

    # -----------------------------------------------------------------
    # Minimum message length enforcement
    # -----------------------------------------------------------------
    context 'with a message shorter than 30 characters' do
      it 'returns a prompt to provide more detail' do
        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'my head hurts'
        }

        expect(response).to have_http_status(:ok)
        expect(parsed_body['need_more_detail']).to be true
        expect(parsed_body['assistant_message']).to include('at least 30 characters')
        expect(parsed_body['analysis']).to be_nil
      end
    end

    # -----------------------------------------------------------------
    # Insufficient detail → follow-up question
    # -----------------------------------------------------------------
    context 'when the sufficiency check says more detail is needed' do
      before do
        sufficiency_double = instance_double(
          Triage::ConversationSufficiencyService,
          check: { sufficient: false, follow_up_question: 'How long have you had these symptoms?' }
        )
        allow(Triage::ConversationSufficiencyService).to receive(:new).and_return(sufficiency_double)
      end

      it 'returns a follow-up question and need_more_detail: true' do
        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'I have been feeling a strange pain in my lower back recently'
        }

        expect(response).to have_http_status(:ok)
        body = parsed_body
        expect(body['need_more_detail']).to be true
        expect(body['assistant_message']).to eq('How long have you had these symptoms?')
        expect(body['analysis']).to be_nil
        expect(body['providers']).to be_nil
        expect(body['session_id']).to eq(session_id)
      end

      it 'creates a conversation and persists both messages' do
        expect {
          post '/api/v1/symptom-chat/send', params: {
            session_id: session_id,
            message: 'I have been feeling a strange pain in my lower back recently'
          }
        }.to change(Conversation, :count).by(1)
         .and change(ConversationMessage, :count).by(2) # user + assistant

        conversation = Conversation.find_by(session_id: session_id)
        expect(conversation.conversation_messages.pluck(:role)).to eq(%w[user assistant])
      end
    end

    # -----------------------------------------------------------------
    # Sufficient detail → full analysis
    # -----------------------------------------------------------------
    context 'when the sufficiency check says detail is sufficient' do
      let(:analysis_result) do
        {
          specialty: 'orthopedics',
          urgency: 'routine',
          reasoning: 'Lower back pain suggests musculoskeletal issue.',
          keywords: [ 'back pain' ],
          red_flags: [],
          specialty_name: 'Orthopedics',
          urgency_details: { priority: 1, color: 'green', message: 'Schedule within 1-2 weeks' }
        }
      end

      before do
        sufficiency_double = instance_double(
          Triage::ConversationSufficiencyService,
          check: { sufficient: true, follow_up_question: nil }
        )
        allow(Triage::ConversationSufficiencyService).to receive(:new).and_return(sufficiency_double)

        analyzer_double = instance_double(Triage::SymptomAnalyzerService, analyze: analysis_result)
        allow(Triage::SymptomAnalyzerService).to receive(:new).and_return(analyzer_double)

        allow_any_instance_of(Providers::MatchAndSlotService).to receive(:call).and_return([])
      end

      it 'returns analysis results with need_more_detail: false' do
        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'I have had lower back pain for about two weeks now and it is getting worse'
        }

        expect(response).to have_http_status(:ok)
        body = parsed_body
        expect(body['need_more_detail']).to be false
        expect(body['analysis']['specialty']).to eq('orthopedics')
        expect(body['assistant_message']).to include('Orthopedics')
        expect(body['providers']).to be_an(Array)
      end

      it 'includes matching providers when available' do
        provider = create(:provider, specialty: 'Orthopedics', rating: 4.8)
        provider_data = provider.as_detail_json(next_available_slots: [])
        allow_any_instance_of(Providers::MatchAndSlotService).to receive(:call).and_return([ provider_data ])

        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'I have had lower back pain for about two weeks now and it is getting worse'
        }

        body = parsed_body
        expect(body['providers'].size).to eq(1)
        expect(body['assistant_message']).to include('1 provider')
      end
    end

    # -----------------------------------------------------------------
    # Guest flow (no auth)
    # -----------------------------------------------------------------
    context 'as a guest (no auth token)' do
      before do
        sufficiency_double = instance_double(
          Triage::ConversationSufficiencyService,
          check: { sufficient: false, follow_up_question: 'Tell me more.' }
        )
        allow(Triage::ConversationSufficiencyService).to receive(:new).and_return(sufficiency_double)
      end

      it 'creates a conversation without a user' do
        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'I have been experiencing persistent headaches for a while now'
        }

        expect(response).to have_http_status(:ok)
        conversation = Conversation.find_by(session_id: session_id)
        expect(conversation.user_id).to be_nil
      end
    end

    # -----------------------------------------------------------------
    # Authenticated flow
    # -----------------------------------------------------------------
    context 'as an authenticated user' do
      let(:user) { create(:user) }

      before do
        sufficiency_double = instance_double(
          Triage::ConversationSufficiencyService,
          check: { sufficient: false, follow_up_question: 'Tell me more.' }
        )
        allow(Triage::ConversationSufficiencyService).to receive(:new).and_return(sufficiency_double)
      end

      it 'binds the conversation to the user' do
        post '/api/v1/symptom-chat/send',
             params: { session_id: session_id, message: 'I have been having chest tightness for several days' },
             headers: auth_headers(user)

        expect(response).to have_http_status(:ok)
        conversation = Conversation.find_by(session_id: session_id)
        expect(conversation.user_id).to eq(user.id)
      end
    end

    # -----------------------------------------------------------------
    # User binding mid-conversation (guest → logged in)
    # -----------------------------------------------------------------
    context 'when a guest conversation is later claimed by a logged-in user' do
      let(:user) { create(:user) }

      before do
        sufficiency_double = instance_double(
          Triage::ConversationSufficiencyService,
          check: { sufficient: false, follow_up_question: 'Tell me more.' }
        )
        allow(Triage::ConversationSufficiencyService).to receive(:new).and_return(sufficiency_double)
      end

      it 'updates the conversation user_id on the second request' do
        # First message as guest
        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'I have been feeling dizzy and lightheaded for a few days'
        }
        expect(Conversation.find_by(session_id: session_id).user_id).to be_nil

        # Second message as authenticated user
        post '/api/v1/symptom-chat/send',
             params: { session_id: session_id, message: 'It started about three days ago and happens mostly in the morning' },
             headers: auth_headers(user)

        expect(Conversation.find_by(session_id: session_id).user_id).to eq(user.id)
      end
    end

    # -----------------------------------------------------------------
    # Reuses existing conversation on same session_id
    # -----------------------------------------------------------------
    context 'with the same session_id across multiple requests' do
      before do
        sufficiency_double = instance_double(
          Triage::ConversationSufficiencyService,
          check: { sufficient: false, follow_up_question: 'Tell me more.' }
        )
        allow(Triage::ConversationSufficiencyService).to receive(:new).and_return(sufficiency_double)
      end

      it 'appends to the existing conversation instead of creating a new one' do
        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'I have been having trouble sleeping for the past week or so'
        }

        expect {
          post '/api/v1/symptom-chat/send', params: {
            session_id: session_id,
            message: 'It gets worse at night and I feel anxious during the day too'
          }
        }.to change(Conversation, :count).by(0)
         .and change(ConversationMessage, :count).by(2) # user + assistant
      end
    end

    # -----------------------------------------------------------------
    # Error handling
    # -----------------------------------------------------------------
    context 'when an unexpected error occurs' do
      before do
        allow(Conversation).to receive(:find_or_create_by!).and_raise(StandardError, 'DB connection lost')
      end

      it 'returns 500 with a generic error message' do
        post '/api/v1/symptom-chat/send', params: {
          session_id: session_id,
          message: 'I have been having serious chest pain for the last few hours'
        }

        expect(response).to have_http_status(:internal_server_error)
        expect(parsed_body['error']).to eq('Something went wrong. Please try again.')
      end
    end

    # -----------------------------------------------------------------
    # PHI audit logging
    # -----------------------------------------------------------------
    context 'PHI access logging' do
      before do
        sufficiency_double = instance_double(
          Triage::ConversationSufficiencyService,
          check: { sufficient: false, follow_up_question: 'Tell me more.' }
        )
        allow(Triage::ConversationSufficiencyService).to receive(:new).and_return(sufficiency_double)
      end

      it 'creates a PHI access log entry' do
        expect {
          post '/api/v1/symptom-chat/send', params: {
            session_id: session_id,
            message: 'I have been experiencing a persistent rash on my arms for days'
          }
        }.to change(PhiAccessLog, :count).by(1)

        log = PhiAccessLog.last
        expect(log.resource_type).to eq('Conversation')
        expect(log.action).to eq('create')
      end
    end
  end
end
