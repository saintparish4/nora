# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ConversationMessage, type: :model do
  describe 'associations' do
    it { should belong_to(:conversation) }
  end

  describe 'validations' do
    it { should validate_presence_of(:role) }
    it { should validate_presence_of(:content) }
    it { should validate_inclusion_of(:role).in_array(%w[user assistant system]) }

    it 'rejects an invalid role' do
      msg = build(:conversation_message, role: 'admin')
      expect(msg).not_to be_valid
      expect(msg.errors[:role]).to be_present
    end
  end

  describe '.ordered scope' do
    let(:conversation) { create(:conversation) }

    it 'returns messages ordered by created_at ascending' do
      older = create(:conversation_message, conversation: conversation, created_at: 2.minutes.ago)
      newer = create(:conversation_message, conversation: conversation, created_at: 1.minute.ago)

      ordered = conversation.conversation_messages.ordered
      expect(ordered.first).to eq(older)
      expect(ordered.last).to eq(newer)
    end
  end

  describe 'factory traits' do
    it 'creates an assistant message' do
      msg = build(:conversation_message, :assistant)
      expect(msg.role).to eq('assistant')
    end

    it 'creates a system message' do
      msg = build(:conversation_message, :system)
      expect(msg.role).to eq('system')
    end
  end
end
