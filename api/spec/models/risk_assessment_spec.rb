# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RiskAssessment, type: :model do
  describe 'associations' do
    # Optional on purpose: the single-shot endpoints and guest chats have no
    # conversation, and dropping those analyses threw away the data.
    it { should belong_to(:conversation).optional }
    it { should belong_to(:appointment).optional }
    it { should belong_to(:user) }

    it 'is valid without a conversation' do
      expect(build(:risk_assessment, :single_shot)).to be_valid
    end
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
        id care_level confidence reasoning created_at outcome actual_care_level
        red_flags recommended_specialties self_care_options escalation_triggers
        concordant
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
  describe 'outcome capture' do
    let(:assessment) { create(:risk_assessment) }

    it 'records a known outcome with a timestamp' do
      expect(assessment.record_outcome!('attended')).to be true

      assessment.reload
      expect(assessment.outcome).to eq('attended')
      expect(assessment.outcome_recorded_at).to be_present
    end

    it 'refuses an outcome outside the known set' do
      expect(assessment.record_outcome!('vibes')).to be false
      expect(assessment.reload.outcome).to be_nil
    end

    it 'lets a later outcome supersede an earlier one' do
      # confirmed then completed is an ordinary lifecycle, not an error.
      assessment.record_outcome!('cancelled')
      assessment.record_outcome!('attended')

      expect(assessment.reload.outcome).to eq('attended')
    end

    it 'separates resolved from unresolved assessments' do
      resolved = create(:risk_assessment)
      resolved.record_outcome!('attended')
      pending_one = create(:risk_assessment)

      expect(described_class.with_outcome).to include(resolved)
      expect(described_class.with_outcome).not_to include(pending_one)
      expect(described_class.awaiting_outcome).to include(pending_one)
    end
  end

  describe 'concordance' do
    it 'reports nil until a clinician has graded it' do
      assessment = create(:risk_assessment, care_level: 'routine')

      expect(assessment.concordant?).to be_nil
      expect(assessment.triage_delta).to be_nil
      expect(assessment.under_triaged?).to be false
    end

    it 'is concordant when the graded level matches' do
      assessment = create(:risk_assessment, care_level: 'urgent', actual_care_level: 'urgent')

      expect(assessment.concordant?).to be true
      expect(assessment.triage_delta).to eq(0)
      expect(assessment.under_triaged?).to be false
    end

    it 'flags under-triage when the patient needed more acute care' do
      assessment = create(:risk_assessment, care_level: 'routine', actual_care_level: 'emergency')

      expect(assessment.concordant?).to be false
      expect(assessment.triage_delta).to eq(-2)
      expect(assessment.under_triaged?).to be true
    end

    it 'does not count over-triage as under-triage' do
      assessment = create(:risk_assessment, care_level: 'emergency', actual_care_level: 'routine')

      expect(assessment.triage_delta).to eq(2)
      expect(assessment.under_triaged?).to be false
    end

    it 'only counts graded rows as scorable' do
      graded = create(:risk_assessment, actual_care_level: 'routine')
      ungraded = create(:risk_assessment)

      expect(described_class.scorable).to include(graded)
      expect(described_class.scorable).not_to include(ungraded)
    end

    it 'rejects a graded level outside the known set' do
      expect(build(:risk_assessment, actual_care_level: 'quite bad')).not_to be_valid
    end
  end

  describe '.attach_booking!' do
    let(:user) { create(:user) }
    let(:appointment) { create(:appointment, patient: user) }

    it 'credits the booking to the most recent unlinked recommendation' do
      create(:risk_assessment, :single_shot, user: user, created_at: 3.hours.ago)
      recent = create(:risk_assessment, :single_shot, user: user, created_at: 10.minutes.ago)

      expect(described_class.attach_booking!(user: user, appointment: appointment)).to eq(recent)
      expect(recent.reload.appointment).to eq(appointment)
    end

    it 'ignores recommendations older than the attribution window' do
      create(:risk_assessment, :single_shot, user: user,
             created_at: described_class::BOOKING_ATTRIBUTION_WINDOW.ago - 1.hour)

      expect(described_class.attach_booking!(user: user, appointment: appointment)).to be_nil
    end

    it 'does not steal a recommendation already linked to another booking' do
      other = create(:appointment, patient: user, start_time: 5.days.from_now,
                                   end_time: 5.days.from_now + 30.minutes)
      create(:risk_assessment, :single_shot, user: user, appointment: other)

      expect(described_class.attach_booking!(user: user, appointment: appointment)).to be_nil
    end

    it 'does not credit another patient\'s recommendation' do
      create(:risk_assessment, :single_shot, user: create(:user))

      expect(described_class.attach_booking!(user: user, appointment: appointment)).to be_nil
    end

    it 'returns nil instead of raising when the write fails' do
      create(:risk_assessment, :single_shot, user: user)
      allow_any_instance_of(described_class).to receive(:update!).and_raise(ActiveRecord::StatementInvalid, 'boom')
      expect(Rails.logger).to receive(:error).with(/BOOKING_ATTRIBUTION_FAILURE/)

      expect(described_class.attach_booking!(user: user, appointment: appointment)).to be_nil
    end

    it 'is a no-op for a guest' do
      expect(described_class.attach_booking!(user: nil, appointment: appointment)).to be_nil
    end
  end
end
