# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RiskAssessment, type: :model do
  describe 'associations' do
    it { should belong_to(:conversation) }
    it { should belong_to(:user) }
  end

  describe 'validations' do
    it { should validate_presence_of(:care_level) }

    it 'accepts the care levels the analyzer can produce' do
      RiskAssessment::CARE_LEVELS.each do |level|
        expect(build(:risk_assessment, care_level: level)).to be_valid
      end
    end

    it 'rejects a care level outside the known set' do
      assessment = build(:risk_assessment, care_level: 'mildly_concerned')

      expect(assessment).not_to be_valid
      expect(assessment.errors[:care_level]).to be_present
    end

    it 'allows a nil confidence (the analyzer does not always report one)' do
      expect(build(:risk_assessment, confidence: nil)).to be_valid
    end

    it 'rejects a confidence outside 0..100' do
      expect(build(:risk_assessment, confidence: 101)).not_to be_valid
      expect(build(:risk_assessment, confidence: -1)).not_to be_valid
    end

    it 'matches every care level in the analyzer urgency table' do
      expect(RiskAssessment::CARE_LEVELS)
        .to match_array(Triage::SymptomAnalyzerService::URGENCY_LEVELS.keys)
    end
  end

  describe 'scopes' do
    let(:conversation) { create(:conversation, :with_user) }

    it 'orders recent_first by created_at descending' do
      older = create(:risk_assessment, conversation: conversation, user: conversation.user,
                                       created_at: 2.days.ago)
      newer = create(:risk_assessment, conversation: conversation, user: conversation.user,
                                       created_at: 1.hour.ago)

      expect(described_class.recent_first.to_a).to eq([ newer, older ])
    end

    it 'returns only urgent and emergency from escalated' do
      routine = create(:risk_assessment, conversation: conversation, user: conversation.user)
      urgent = create(:risk_assessment, :urgent, conversation: conversation, user: conversation.user)
      emergency = create(:risk_assessment, :emergency, conversation: conversation, user: conversation.user)

      expect(described_class.escalated).to include(urgent, emergency)
      expect(described_class.escalated).not_to include(routine)
    end
  end

  describe '#as_summary_json' do
    it 'exposes the assessment without leaking internal columns' do
      assessment = create(:risk_assessment, :urgent)

      json = assessment.as_summary_json

      expect(json.keys).to match_array(%w[
        id care_level confidence reasoning created_at
        red_flags recommended_specialties self_care_options escalation_triggers
      ])
      expect(json['care_level']).to eq('urgent')
      expect(json['red_flags']).to eq([ 'worsening pain' ])
    end

    it 'returns arrays rather than nil for the json columns' do
      assessment = create(:risk_assessment, red_flags: nil, recommended_specialties: nil)

      json = assessment.as_summary_json

      expect(json['red_flags']).to eq([])
      expect(json['recommended_specialties']).to eq([])
    end
  end
end
