# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Chart services' do
  describe Chart::Redactor do
    let(:patient) { build(:patient, first_name: 'Jane', last_name: 'Rivera', mrn: 'TEST-1001', date_of_birth: Date.new(1984, 3, 14)) }
    let(:coverage) { build(:patient_coverage, member_id: 'UHC900114572') }
    let(:original) { "Patient: Jane Rivera DOB: 03/14/1984 MRN: TEST-1001 Member UHC900114572.\nRivera reports BMI 34.2 today." }
    let(:redactor) { described_class.new(original, patient: patient, coverage: coverage) }

    it 'replaces name, MRN, DOB, and member ID with placeholders' do
      expect(redactor.text).to eq("Patient: [PATIENT] [PATIENT] DOB: [DOB] MRN: [MRN] Member [MEMBER_ID].\n[PATIENT] reports BMI 34.2 today.")
      expect(redactor.text).not_to include('Jane', 'Rivera', '1984', 'TEST-1001', 'UHC900114572')
    end

    it 'maps a range in the redacted text back to the original' do
      start = redactor.text.index('[PATIENT] reports')
      finish = redactor.text.index(' today.')
      orig = redactor.original_range(start, finish)
      expect(original[orig[0]...orig[1]]).to eq('Rivera reports BMI 34.2')
    end

    it 'maps ranges with no placeholders before them unchanged' do
      text = 'BMI 34.2 recorded'
      r = described_class.new(text, patient: patient)
      expect(r.original_range(0, 8)).to eq([ 0, 8 ])
    end

    it 'refuses a range that starts inside a placeholder' do
      start = redactor.text.index('PATIENT]')
      expect(redactor.original_range(start, start + 10)).to be_nil
    end
  end

  describe Authorizations::QuoteLocator do
    let(:body) { "Assessment: Obesity,\n  class I (E66.01).\nPlan: diet." }

    it 'finds an exact quote' do
      expect(described_class.locate(body, 'Plan: diet.')).to eq([ body.index('Plan'), body.length ])
    end

    it 'tolerates whitespace differences only' do
      range = described_class.locate(body, 'Obesity, class I (E66.01).')
      expect(body[range[0]...range[1]]).to eq("Obesity,\n  class I (E66.01).")
    end

    it 'rejects a paraphrase' do
      expect(described_class.locate(body, 'Obesity class 1')).to be_nil
    end
  end

  describe Chart::TextExtractor do
    def upload(content, filename:, type:)
      file = Tempfile.new([ 'upload', File.extname(filename) ])
      file.binmode
      file.write(content)
      file.rewind
      ActionDispatch::Http::UploadedFile.new(tempfile: file, filename: filename, type: type)
    end

    it 'reads plain text and collapses blank runs' do
      text = described_class.call(upload("Line one  \n\n\n\nLine two", filename: 'note.txt', type: 'text/plain'))
      expect(text).to eq("Line one\n\nLine two")
    end

    it 'reads the text layer of a PDF' do
      pdf = Prawn::Document.new.tap { |d| d.text 'BMI 34.2 documented' }.render
      text = described_class.call(upload(pdf, filename: 'note.pdf', type: 'application/pdf'))
      expect(text).to include('BMI 34.2 documented')
    end

    it 'refuses a PDF with no text layer' do
      pdf = Prawn::Document.new.render
      expect { described_class.call(upload(pdf, filename: 'scan.pdf', type: 'application/pdf')) }
        .to raise_error(Chart::TextExtractor::Error, /Scanned PDFs/)
    end

    it 'refuses other file types' do
      expect { described_class.call(upload('x', filename: 'photo.png', type: 'image/png')) }
        .to raise_error(Chart::TextExtractor::Error, /PDF or a plain-text/)
    end
  end
end
