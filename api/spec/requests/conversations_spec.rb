# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Conversations API', type: :request do
  let(:user) { create(:user) }

  # -----------------------------------------------------------------
  # GET /api/v1/conversations
  # -----------------------------------------------------------------
  describe 'GET /api/v1/conversations' do
    it 'returns 401 without a token' do
      get '/api/v1/conversations'

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns the caller\'s conversations, newest first' do
      older = create(:conversation, user: user, created_at: 3.days.ago)
      newer = create(:conversation, user: user, created_at: 1.hour.ago)

      get '/api/v1/conversations', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_body['conversations'].map { |c| c['id'] }).to eq([ newer.id, older.id ])
    end

    it 'excludes other patients\' conversations' do
      mine = create(:conversation, user: user)
      theirs = create(:conversation, user: create(:user))

      get '/api/v1/conversations', headers: auth_headers(user)

      ids = parsed_body['conversations'].map { |c| c['id'] }
      expect(ids).to eq([ mine.id ])
      expect(ids).not_to include(theirs.id)
    end

    it 'excludes guest conversations that belong to nobody' do
      create(:conversation, user: nil)

      get '/api/v1/conversations', headers: auth_headers(user)

      expect(parsed_body['conversations']).to be_empty
    end

    it 'previews the first patient message and counts the messages' do
      conversation = create(:conversation, user: user)
      create(:conversation_message, conversation: conversation, role: 'user',
                                    content: 'My lower back has hurt for two weeks')
      create(:conversation_message, :assistant, conversation: conversation, content: 'How bad is it?')

      get '/api/v1/conversations', headers: auth_headers(user)

      summary = parsed_body['conversations'].first
      expect(summary['preview']).to eq('My lower back has hurt for two weeks')
      expect(summary['message_count']).to eq(2)
    end

    it 'includes the latest risk assessment for the conversation' do
      conversation = create(:conversation, user: user)
      create(:risk_assessment, conversation: conversation, user: user,
                               care_level: 'routine', created_at: 2.days.ago)
      create(:risk_assessment, :emergency, conversation: conversation, user: user,
                                           created_at: 1.hour.ago)

      get '/api/v1/conversations', headers: auth_headers(user)

      latest = parsed_body['conversations'].first['latest_risk_assessment']
      expect(latest['care_level']).to eq('emergency')
    end

    it 'returns a null risk assessment when none was recorded' do
      create(:conversation, user: user)

      get '/api/v1/conversations', headers: auth_headers(user)

      expect(parsed_body['conversations'].first['latest_risk_assessment']).to be_nil
    end

    it 'writes a PHI access log for the conversations it returned' do
      create_list(:conversation, 2, user: user)

      expect {
        get '/api/v1/conversations', headers: auth_headers(user)
      }.to change { PhiAccessLog.where(resource_type: 'Conversation', action: 'view').count }.by(2)
    end
  end

  # -----------------------------------------------------------------
  # GET /api/v1/conversations/:id
  # -----------------------------------------------------------------
  describe 'GET /api/v1/conversations/:id' do
    let(:conversation) { create(:conversation, user: user) }

    it 'returns 401 without a token' do
      get "/api/v1/conversations/#{conversation.id}"

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns the full transcript in chronological order' do
      create(:conversation_message, conversation: conversation, role: 'user',
                                    content: 'First', created_at: 2.minutes.ago)
      create(:conversation_message, :assistant, conversation: conversation,
                                                content: 'Second', created_at: 1.minute.ago)

      get "/api/v1/conversations/#{conversation.id}", headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      messages = parsed_body['conversation']['messages']
      expect(messages.map { |m| m['content'] }).to eq(%w[First Second])
      expect(messages.map { |m| m['role'] }).to eq(%w[user assistant])
    end

    it 'returns the recorded risk assessments, newest first' do
      create(:risk_assessment, conversation: conversation, user: user,
                               care_level: 'routine', created_at: 2.days.ago)
      create(:risk_assessment, :urgent, conversation: conversation, user: user,
                                        created_at: 1.hour.ago)

      get "/api/v1/conversations/#{conversation.id}", headers: auth_headers(user)

      expect(parsed_body['conversation']['risk_assessments'].map { |a| a['care_level'] })
        .to eq(%w[urgent routine])
    end

    it 'returns 404 for another patient\'s conversation' do
      theirs = create(:conversation, user: create(:user))

      get "/api/v1/conversations/#{theirs.id}", headers: auth_headers(user)

      expect(response).to have_http_status(:not_found)
    end

    it 'returns 404 for a guest conversation' do
      guest = create(:conversation, user: nil)

      get "/api/v1/conversations/#{guest.id}", headers: auth_headers(user)

      expect(response).to have_http_status(:not_found)
    end

    it 'writes a PHI access log' do
      expect {
        get "/api/v1/conversations/#{conversation.id}", headers: auth_headers(user)
      }.to change {
        PhiAccessLog.where(resource_type: 'Conversation', resource_id: conversation.id.to_s,
                           action: 'view').count
      }.by(1)
    end
  end
end
