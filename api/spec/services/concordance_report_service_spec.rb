# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Triage::ConcordanceReportService do
  subject(:report) { described_class.call }

  describe 'with no data' do
    it 'reports zeroes rather than failing' do
      expect(report[:totals][:assessments]).to eq(0)
      expect(report[:concordance][:available]).to be false
    end
  end

  describe 'follow-through' do
    before do
      attended = create(:risk_assessment, care_level: 'routine')
      attended.record_outcome!('attended')

      no_show = create(:risk_assessment, care_level: 'routine')
      no_show.record_outcome!('no_show')

      never = create(:risk_assessment, care_level: 'routine')
      never.record_outcome!('not_booked')

      create(:risk_assessment, care_level: 'urgent') # still unresolved
    end

    it 'counts resolved and unresolved separately' do
      expect(report[:totals][:assessments]).to eq(4)
      expect(report[:totals][:with_outcome]).to eq(3)
      expect(report[:totals][:awaiting_outcome]).to eq(1)
    end

    it 'breaks outcomes down by predicted care level' do
      routine = report[:follow_through]['routine']

      expect(routine[:predicted]).to eq(3)
      expect(routine[:resolved]).to eq(3)
      expect(routine[:outcomes]['attended']).to eq(1)
      expect(routine[:outcomes]['no_show']).to eq(1)
      expect(routine[:outcomes]['not_booked']).to eq(1)
    end

    it 'computes booked and no-show rates over resolved rows only' do
      routine = report[:follow_through]['routine']

      expect(routine[:booked_rate]).to eq(0.6667)
      expect(routine[:no_show_rate]).to eq(0.3333)
    end

    it 'returns nil rather than a fake rate when nothing is resolved' do
      expect(report[:follow_through]['urgent'][:booked_rate]).to be_nil
    end
  end

  describe 'concordance' do
    it 'refuses to report a number when no clinician has graded anything' do
      create(:risk_assessment, care_level: 'routine')

      expect(report[:concordance][:available]).to be false
      expect(report[:concordance][:sample_size]).to eq(0)
      expect(report[:concordance][:note]).to match(/clinician-recorded disposition/)
    end

    it 'does not treat attendance as evidence of correct routing' do
      assessment = create(:risk_assessment, care_level: 'routine')
      assessment.record_outcome!('attended')

      # Attending the appointment you were sent to says nothing about whether
      # it was the right appointment.
      expect(report[:concordance][:available]).to be false
    end

    context 'once assessments are graded' do
      before do
        create(:risk_assessment, care_level: 'routine', actual_care_level: 'routine', confidence: 95)
        create(:risk_assessment, care_level: 'urgent', actual_care_level: 'urgent', confidence: 92)
        create(:risk_assessment, care_level: 'routine', actual_care_level: 'emergency', confidence: 40)
        create(:risk_assessment, care_level: 'emergency', actual_care_level: 'routine', confidence: 45)
      end

      it 'reports the sample size and the concordant share' do
        expect(report[:concordance][:sample_size]).to eq(4)
        expect(report[:concordance][:concordant]).to eq(0.5)
      end

      it 'tracks under-triage separately from over-triage' do
        expect(report[:concordance][:under_triage_rate]).to eq(0.25)
        expect(report[:concordance][:over_triage_rate]).to eq(0.25)
      end

      it 'breaks concordance down by predicted level' do
        routine = report[:concordance][:by_predicted_level]['routine']

        expect(routine[:sample_size]).to eq(2)
        expect(routine[:concordant]).to eq(0.5)
        expect(routine[:under_triaged]).to eq(1)
      end

      it 'buckets calibration by stated confidence' do
        calibration = report[:calibration]

        expect(calibration[:available]).to be true
        expect(calibration[:sample_size]).to eq(4)
        expect(calibration[:buckets][90][:sample_size]).to eq(2)
        expect(calibration[:buckets][90][:actual_accuracy]).to eq(1.0)
        expect(calibration[:buckets][40][:actual_accuracy]).to eq(0.0)
      end
    end
  end

  describe 'windowing' do
    it 'only counts assessments inside the requested window' do
      create(:risk_assessment, created_at: 10.days.ago)
      create(:risk_assessment, created_at: 1.day.ago)

      windowed = described_class.call(since: 3.days.ago)

      expect(windowed[:totals][:assessments]).to eq(1)
    end
  end
end
