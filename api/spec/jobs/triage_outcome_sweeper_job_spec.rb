# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TriageOutcomeSweeperJob, type: :job do
  let(:stale_time) { RiskAssessment::BOOKING_ATTRIBUTION_WINDOW.ago - described_class::GRACE - 1.minute }

  it 'marks an old recommendation that never became a booking' do
    assessment = create(:risk_assessment, created_at: stale_time)

    expect { described_class.new.perform }
      .to change { assessment.reload.outcome }.from(nil).to('not_booked')
  end

  it 'leaves a recommendation still inside the attribution window alone' do
    assessment = create(:risk_assessment, created_at: 1.hour.ago)

    described_class.new.perform

    expect(assessment.reload.outcome).to be_nil
  end

  it 'leaves a recommendation that did produce a booking alone' do
    assessment = create(:risk_assessment, created_at: stale_time,
                                          appointment: create(:appointment))

    described_class.new.perform

    expect(assessment.reload.outcome).to be_nil
  end

  it 'does not overwrite an outcome that is already recorded' do
    assessment = create(:risk_assessment, created_at: stale_time)
    assessment.record_outcome!('attended')

    described_class.new.perform

    expect(assessment.reload.outcome).to eq('attended')
  end

  it 'keeps sweeping after one row fails' do
    create(:risk_assessment, created_at: stale_time)
    create(:risk_assessment, created_at: stale_time)

    call_count = 0
    allow_any_instance_of(RiskAssessment).to receive(:record_outcome!) do
      call_count += 1
      raise ActiveRecord::StatementInvalid, 'boom' if call_count == 1

      true
    end
    allow(Rails.logger).to receive(:error)
    allow(Rails.logger).to receive(:info)

    expect(described_class.new.perform).to eq(1)
    expect(Rails.logger).to have_received(:error).with(/OUTCOME_SWEEP_FAILURE/)
  end
end
