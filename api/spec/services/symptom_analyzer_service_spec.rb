# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Triage::SymptomAnalyzerService do
  let(:service) { described_class.new(description) }

  # Builds the shape the service reads out of the OpenAI response so the
  # failure-path specs can drive the parser directly.
  def openai_response(content)
    { 'choices' => [ { 'message' => { 'content' => content } } ] }
  end

  def stub_openai(content)
    client = instance_double(OpenAI::Client, chat: openai_response(content))
    allow(OpenAI::Client).to receive(:new).and_return(client)
    client
  end

  def stub_openai_failure(error = StandardError.new('connection reset'))
    client = instance_double(OpenAI::Client)
    allow(client).to receive(:chat).and_raise(error)
    allow(OpenAI::Client).to receive(:new).and_return(client)
    client
  end

  let(:valid_payload) do
    {
      specialty: 'dermatology',
      urgency: 'routine',
      reasoning: 'Acne is a common skin condition.',
      keywords: [ 'acne' ],
      red_flags: []
    }.to_json
  end

  describe '#analyze' do
    context 'with acne symptoms' do
      let(:description) { 'I have acne on my face' }

      it 'recommends dermatology' do
        VCR.use_cassette('acne_dermatology') do
          result = service.analyze
          expect(result[:specialty]).to eq('dermatology')
          expect(result[:urgency]).to eq('routine')
        end
      end

      it 'marks the result as coming from the model and not degraded' do
        stub_openai(valid_payload)

        result = service.analyze

        expect(result[:triage_source]).to eq('model')
        expect(result[:assessment_failed]).to be false
      end
    end

    # ---------------------------------------------------------------------
    # Deterministic screening. The point of these is that they hold even when
    # the model is unavailable or actively wrong.
    # ---------------------------------------------------------------------
    describe 'deterministic red-flag screening' do
      context 'with chest pain symptoms' do
        let(:description) { 'I have chest pain and shortness of breath' }

        it 'recommends emergency care' do
          result = service.analyze

          expect(result[:urgency]).to eq('emergency')
          expect(result[:specialty]).to eq('emergency')
        end

        it 'never reaches the model — the rules alone decide' do
          client = stub_openai_failure

          result = service.analyze

          expect(client).not_to have_received(:chat)
          expect(result[:urgency]).to eq('emergency')
          expect(result[:triage_source]).to eq('red_flag_rules')
        end

        it 'names the sign that fired so the patient sees why' do
          expect(service.analyze[:red_flags]).to include('Possible heart attack symptoms')
        end

        it 'tells the patient to call 911 rather than to book' do
          expect(service.analyze[:reasoning]).to match(/911|emergency room/i)
        end
      end

      it 'overrides a model that would have said routine' do
        stub_openai({
          specialty: 'primary_care', urgency: 'routine',
          reasoning: 'Likely indigestion.', keywords: [], red_flags: []
        }.to_json)

        result = described_class.new('crushing chest pressure and pain down my left arm').analyze

        expect(result[:urgency]).to eq('emergency')
      end

      it 'does not fire on a denial of the same symptom' do
        stub_openai(valid_payload)

        result = described_class.new('no chest pain, just some acne on my face').analyze

        expect(result[:urgency]).to eq('routine')
        expect(result[:triage_source]).to eq('model')
      end
    end

    # ---------------------------------------------------------------------
    # The defect this suite exists to prevent: a failure quietly downgrading
    # a possible emergency to "schedule within 1-2 weeks".
    # ---------------------------------------------------------------------
    describe 'fail-safe behaviour' do
      let(:description) { 'sore throat and fever for three days' }

      before { allow(Rails.logger).to receive(:warn) }

      context 'when the OpenAI call raises' do
        before { stub_openai_failure }

        it 'never returns routine' do
          expect(service.analyze[:urgency]).not_to eq('routine')
        end

        it 'escalates to the failsafe urgency' do
          expect(service.analyze[:urgency]).to eq(described_class::FAILSAFE_URGENCY)
        end

        it 'flags the result as an assessment that did not run' do
          result = service.analyze

          expect(result[:assessment_failed]).to be true
          expect(result[:triage_source]).to eq('fallback')
        end

        it 'tells the patient the check did not run and what to do about it' do
          expect(service.analyze[:reasoning]).to match(/could not automatically assess/i)
          expect(service.analyze[:reasoning]).to match(/911/)
        end
      end

      context 'when the model returns unparseable JSON' do
        before { stub_openai('I am not going to answer that.') }

        it 'escalates instead of defaulting to routine' do
          result = service.analyze

          expect(result[:urgency]).to eq(described_class::FAILSAFE_URGENCY)
          expect(result[:assessment_failed]).to be true
        end
      end

      context 'when the model returns an urgency outside the contract' do
        before do
          stub_openai({
            specialty: 'cardiology', urgency: 'somewhat concerning',
            reasoning: 'Unclear.', keywords: [], red_flags: []
          }.to_json)
        end

        it 'escalates rather than substituting the lowest level' do
          expect(service.analyze[:urgency]).to eq(described_class::FAILSAFE_URGENCY)
        end

        it 'keeps the specialty the model did return correctly' do
          expect(service.analyze[:specialty]).to eq('cardiology')
        end
      end

      it 'has no failure path that resolves to routine' do
        [
          -> { stub_openai_failure },
          -> { stub_openai('not json') },
          -> { stub_openai('{"urgency":"mild","specialty":"primary_care"}') },
          -> { stub_openai('{}') }
        ].each_with_index do |setup, index|
          setup.call
          urgency = described_class.new("#{description} variant #{index}").analyze[:urgency]

          expect(urgency).not_to eq('routine'), "failure path #{index} resolved to routine"
        end
      end
    end

    describe 'confidence' do
      let(:description) { 'sore throat and fever for three days' }

      it 'carries a calibrated integer through from the model' do
        stub_openai({ specialty: 'primary_care', urgency: 'routine', confidence: 72,
                      reasoning: 'Likely viral.', keywords: [], red_flags: [] }.to_json)

        expect(service.analyze[:confidence]).to eq(72)
      end

      it 'reports nil rather than inventing a number when the model omits it' do
        stub_openai({ specialty: 'primary_care', urgency: 'routine',
                      reasoning: 'Likely viral.', keywords: [], red_flags: [] }.to_json)

        expect(service.analyze[:confidence]).to be_nil
      end

      it 'discards a value outside 0-100' do
        stub_openai({ specialty: 'primary_care', urgency: 'routine', confidence: 250,
                      reasoning: 'Likely viral.', keywords: [], red_flags: [] }.to_json)

        expect(service.analyze[:confidence]).to be_nil
      end

      it 'discards a non-numeric value' do
        stub_openai({ specialty: 'primary_care', urgency: 'routine', confidence: 'very',
                      reasoning: 'Likely viral.', keywords: [], red_flags: [] }.to_json)

        expect(service.analyze[:confidence]).to be_nil
      end

      it 'is certain when a deterministic rule fired' do
        expect(described_class.new('I have crushing chest pain').analyze[:confidence]).to eq(100)
      end

      it 'is zero, not nil, when the analysis did not run' do
        allow(Rails.logger).to receive(:warn)
        stub_openai_failure

        # Maximally unsure is a real data point; nil would quietly drop it out
        # of the calibration curve instead of dragging it down.
        expect(service.analyze[:confidence]).to eq(0)
      end
    end

    context 'with caching' do
      let(:description) { 'sore throat and fever' }

      it 'caches a successful result' do
        stub_openai(valid_payload)
        allow(Rails.cache).to receive(:read).and_return(nil)
        allow(Rails.cache).to receive(:write)

        service.analyze

        expect(Rails.cache).to have_received(:write)
      end

      it 'does not cache a degraded result' do
        allow(Rails.logger).to receive(:warn)
        stub_openai_failure
        allow(Rails.cache).to receive(:read).and_return(nil)
        allow(Rails.cache).to receive(:write)

        service.analyze

        expect(Rails.cache).not_to have_received(:write)
      end

      it 'does not consult the cache when the rules already fired' do
        allow(Rails.cache).to receive(:read)

        described_class.new('I think I am having a stroke').analyze

        expect(Rails.cache).not_to have_received(:read)
      end
    end
  end
end
