# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Conversation, type: :model do
  describe 'associations' do
    it { should belong_to(:user).optional }
    it { should have_many(:conversation_messages).dependent(:destroy) }
  end

  describe 'validations' do
    subject { build(:conversation) }

    it { should validate_presence_of(:session_id) }
    it { should validate_uniqueness_of(:session_id) }
  end

  describe 'scopes' do
    let!(:active_conversation)    { create(:conversation, status: 'active') }
    let!(:completed_conversation) { create(:conversation, :completed) }

    describe '.active' do
      it 'returns only active conversations' do
        expect(Conversation.active).to include(active_conversation)
        expect(Conversation.active).not_to include(completed_conversation)
      end
    end

    describe '.by_session' do
      it 'finds by session_id' do
        result = Conversation.by_session(active_conversation.session_id)
        expect(result).to include(active_conversation)
      end
    end
  end

  describe '#complete!' do
    let(:conversation) { create(:conversation, status: 'active') }

    it 'marks the conversation as completed with a timestamp' do
      freeze_time do
        conversation.complete!
        conversation.reload

        expect(conversation.status).to eq('completed')
        expect(conversation.completed_at).to eq(Time.current)
      end
    end
  end

  describe '#transcript' do
    let(:conversation) { create(:conversation) }

    before do
      create(:conversation_message, conversation: conversation, role: 'user',
             content: 'I have a headache', created_at: 1.minute.ago)
      create(:conversation_message, conversation: conversation, role: 'assistant',
             content: 'How long have you had it?', created_at: 30.seconds.ago)
      create(:conversation_message, conversation: conversation, role: 'user',
             content: 'About two days', created_at: Time.current)
    end

    it 'returns messages formatted as "Role: content" lines' do
      text = conversation.transcript
      expect(text).to include('User: I have a headache')
      expect(text).to include('Assistant: How long have you had it?')
      expect(text).to include('User: About two days')
    end

    it 'orders messages by created_at ascending' do
      text = conversation.transcript
      lines = text.split("\n")
      expect(lines.first).to start_with('User: I have a headache')
      expect(lines.last).to start_with('User: About two days')
    end

    it 'respects the limit parameter' do
      text = conversation.transcript(limit: 2)
      lines = text.split("\n")
      expect(lines.size).to eq(2)
    end
  end
end
