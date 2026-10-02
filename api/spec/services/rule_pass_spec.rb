# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Authorizations::RulePass do
  let(:patient) { create(:patient) }
  let(:request_date) { Date.new(2026, 10, 1) }

  def document(body, occurred_on: Date.new(2026, 9, 1))
    create(:chart_document, patient: patient, body: body, occurred_on: occurred_on)
  end

  def criterion(kind, hint)
    PolicyCriterion.new(kind: kind, text: 'x', position: 1, hint: hint)
  end

  def excerpts(kind, hint, *documents)
    described_class.new(documents: documents, request_date: request_date)
                   .hits_for(criterion(kind, hint)).map { |hit| hit.document.body[hit.start...hit.finish] }
  end

  describe 'diagnoses' do
    let(:hint) { { 'terms' => [ 'hypertension', 'type 2 diabetes', 'sleep apnea' ] } }

    it "proposes the patient's own diagnosis" do
      expect(excerpts('diagnosis', hint, document('Essential hypertension (I10), not at goal.'))).to eq([ 'Essential hypertension (I10), not at goal.' ])
    end

    it 'drops a denial, a relative, and a ruled-out condition' do
      chart = document("No hypertension or sleep apnea.\nMother has type 2 diabetes.\nSleep study ruled out obstructive sleep apnea.")
      expect(excerpts('diagnosis', hint, chart)).to be_empty
    end
  end

  describe 'BMI' do
    let(:hint) { { 'bmi_min' => 30, 'bmi_min_with_comorbidity' => 27, 'comorbidity_terms' => [ 'hypertension' ], 'within_months' => 6 } }

    it 'accepts 30 or more, written either way' do
      expect(excerpts('documented_value', hint, document('Body mass index is 33.1.'))).to eq([ 'Body mass index is 33.1.' ])
    end

    it 'ignores a BMI from a note older than the window' do
      expect(excerpts('documented_value', hint, document('BMI 34.8.', occurred_on: Date.new(2025, 6, 10)))).to be_empty
    end

    it 'accepts 27 to 29.9 only when a comorbidity is documented' do
      expect(excerpts('documented_value', hint, document("BMI 28.3.\nNo hypertension."))).to be_empty
      expect(excerpts('documented_value', hint, document("BMI 28.6.\nEssential hypertension (I10)."))).to eq([ 'BMI 28.6.' ])
    end
  end

  describe 'prior trials' do
    let(:drugs) { [ %w[phentermine Adipex-P], %w[Contrave naltrexone], %w[orlistat] ] }
    let(:hint) { { 'drugs' => drugs, 'requires_outcome' => true } }

    it 'proposes a drug that was taken, with how it ended' do
      expect(excerpts('prior_trial', hint, document('Adipex-P was used from 02/2025 to 05/2025 and discontinued for insomnia.')).size).to eq(1)
    end

    it 'drops a fill with no outcome, a drug that was declined, and one never picked up' do
      chart = document("Phentermine 37.5 mg tablets, quantity 30, filled 02/03/2025; no refills on record.\n" \
                       "We discussed orlistat; she declined.\nContrave was prescribed but never picked up.")
      expect(excerpts('prior_trial', hint, chart)).to be_empty
    end

    it 'needs two different drugs when the criterion asks for a second trial' do
      second = hint.merge('min_distinct' => 2)
      one = document('Contrave (naltrexone) was taken 04/2025 to 08/2025 and stopped for nausea.')
      two = document("Contrave was stopped for nausea.\nOrlistat was stopped for lack of effect.")

      expect(excerpts('prior_trial', second, one)).to be_empty
      expect(excerpts('prior_trial', second, two).size).to eq(2)
    end
  end

  describe 'lifestyle programs' do
    let(:hint) { { 'terms' => [ 'reduced-calorie' ], 'min_months' => 6, 'also_requires' => %w[exercise walking] } }

    it 'proposes a program that has run long enough' do
      expect(excerpts('lifestyle', hint, document('Reduced-calorie diet and walking since January 2026.')).size).to eq(1)
    end

    it 'drops a program that started too recently, was only advised, or has no activity' do
      expect(excerpts('lifestyle', hint, document('She started a reduced-calorie diet and walking in late July 2026.'))).to be_empty
      expect(excerpts('lifestyle', hint, document('Advised a reduced-calorie diet and exercise.'))).to be_empty
      expect(excerpts('lifestyle', hint, document("Reduced-calorie diet since November 2025.\nHe is unable to exercise."))).to be_empty
    end

    it 'keeps a sentence whose start date it cannot read, for a person to check' do
      expect(excerpts('lifestyle', hint, document('Reduced-calorie diet and exercise, tracked in our program log.')).size).to eq(1)
    end
  end

  describe 'statements that must be denials' do
    let(:hint) { { 'terms' => %w[GLP-1], 'requires_denial' => true } }

    it 'proposes a denial and not a current prescription' do
      chart = document("She is not taking any GLP-1 receptor agonist.\nCurrent medications: Ozempic, a GLP-1 receptor agonist.")
      expect(excerpts('other', hint, chart)).to eq([ 'She is not taking any GLP-1 receptor agonist.' ])
    end
  end
end
