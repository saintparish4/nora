# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Triage::RiskAssessmentService do
  let(:analysis) do
    {
      specialty: 'orthopedics',
      urgency: 'urgent',
      reasoning: 'Worsening pain over two weeks warrants prompt evaluation.',
      keywords: [ 'back pain' ],
      red_flags: [ 'worsening pain' ],
      specialty_name: 'Orthopedics',
      urgency_details: { priority: 2, color: 'orange', message: 'Schedule within 24-48 hours' }
    }
  end

  describe '.record' do
    context 'for a conversation belonging to a signed-in patient' do
      let(:conversation) { create(:conversation, :with_user) }

      it 'persists the assessment mapped from the analysis' do
        expect {
          described_class.record(conversation: conversation, analysis: analysis)
        }.to change(RiskAssessment, :count).by(1)

        assessment = RiskAssessment.last
        expect(assessment.conversation).to eq(conversation)
        expect(assessment.user).to eq(conversation.user)
        expect(assessment.care_level).to eq('urgent')
        expect(assessment.reasoning).to eq(analysis[:reasoning])
        expect(assessment.red_flags).to eq([ 'worsening pain' ])
        expect(assessment.recommended_specialties).to eq([ 'Orthopedics' ])
      end

      it 'returns the created record' do
        result = described_class.record(conversation: conversation, analysis: analysis)

        expect(result).to be_a(RiskAssessment)
        expect(result).to be_persisted
      end

      it 'escalates rather than de-escalating when the urgency is unrecognized' do
        allow(Rails.logger).to receive(:warn)

        described_class.record(
          conversation: conversation,
          analysis: analysis.merge(urgency: 'somewhat_concerning')
        )

        expect(RiskAssessment.last.care_level).to eq('urgent')
      end

      it 'never records routine for an analysis it could not read' do
        allow(Rails.logger).to receive(:warn)

        [ nil, '', 'somewhat_concerning', 'moderate' ].each do |bad_urgency|
          described_class.record(
            conversation: conversation,
            analysis: analysis.merge(urgency: bad_urgency)
          )

          expect(RiskAssessment.last.care_level).not_to eq('routine'),
            "unrecognized urgency #{bad_urgency.inspect} was recorded as routine"
        end
      end

      it 'leaves the columns the analyzer does not populate at their defaults' do
        described_class.record(conversation: conversation, analysis: analysis)

        assessment = RiskAssessment.last
        expect(assessment.confidence).to be_nil
        expect(assessment.self_care_options).to eq([])
        expect(assessment.escalation_triggers).to eq([])
      end

      it 'records one assessment per analysis, building a history' do
        described_class.record(conversation: conversation, analysis: analysis)
        described_class.record(conversation: conversation, analysis: analysis.merge(urgency: 'emergency'))

        expect(conversation.risk_assessments.recent_first.pluck(:care_level))
          .to eq(%w[emergency urgent])
      end
    end

    context 'for a guest conversation' do
      let(:conversation) { create(:conversation) }

      it 'records nothing — there is no account to attach the history to' do
        expect {
          described_class.record(conversation: conversation, analysis: analysis)
        }.not_to change(RiskAssessment, :count)
      end

      it 'returns nil' do
        expect(described_class.record(conversation: conversation, analysis: analysis)).to be_nil
      end
    end

    context 'when the write fails' do
      let(:conversation) { create(:conversation, :with_user) }

      it 'returns nil instead of raising, so the patient still gets a recommendation' do
        allow(RiskAssessment).to receive(:create!).and_raise(ActiveRecord::StatementInvalid, 'boom')

        expect(Rails.logger).to receive(:error).with(/RISK_ASSESSMENT_FAILURE/)
        expect(described_class.record(conversation: conversation, analysis: analysis)).to be_nil
      end
    end

    context 'with a nil conversation' do
      it 'returns nil' do
        expect(described_class.record(conversation: nil, analysis: analysis)).to be_nil
      end
    end
  end
end
