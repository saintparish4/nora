# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Triage::RedFlagScreenerService do
  def screen(text)
    described_class.screen(text)
  end

  describe '.screen' do
    # One case per rule. These are the presentations where a wrong answer is
    # measured in minutes, so each is pinned independently of the model.
    {
      'cardiac' => 'I have had crushing chest pain for the last hour',
      'stroke' => 'my face is drooping and I have slurred speech',
      'airway' => 'I cant breathe properly and I am gasping for air',
      'anaphylaxis' => 'I ate peanuts and my throat is closing',
      'hemorrhage' => 'I cut my leg and the bleeding wont stop',
      'self_harm' => 'I have been feeling suicidal for weeks',
      'altered_consciousness' => 'my husband had a seizure and is unresponsive',
      'poisoning' => 'I think my son took too many pills'
    }.each do |rule_id, text|
      it "fires the #{rule_id} rule for #{text.inspect}" do
        result = screen(text)

        expect(result).not_to be_nil, "#{rule_id} did not fire"
        expect(result[:rule_ids]).to include(rule_id)
        expect(result[:care_level]).to eq('emergency')
        expect(result[:specialty]).to eq('emergency')
      end
    end

    it 'returns nil for ordinary symptoms' do
      expect(screen('I have acne on my face and it is getting worse')).to be_nil
      expect(screen('sore throat and a mild fever since Tuesday')).to be_nil
      expect(screen('my knee aches when I climb stairs')).to be_nil
    end

    it 'returns nil for blank or missing input' do
      expect(screen(nil)).to be_nil
      expect(screen('')).to be_nil
      expect(screen('   ')).to be_nil
    end

    it 'reports every rule that fired, not just the first' do
      result = screen('chest pain and I cant breathe and the bleeding wont stop')

      expect(result[:rule_ids]).to include('cardiac', 'airway', 'hemorrhage')
      expect(result[:red_flags].uniq.size).to eq(result[:red_flags].size)
    end

    describe 'matching tolerance' do
      it 'is case insensitive' do
        expect(screen('CHEST PAIN')).not_to be_nil
      end

      it 'ignores punctuation' do
        expect(screen('chest-pain!!! help')).not_to be_nil
      end

      it 'matches plurals and suffixes' do
        expect(screen('I am having chest pains')).not_to be_nil
        expect(screen('she is convulsing')).not_to be_nil
      end

      it 'matches with and without apostrophes' do
        expect(screen("I can't breathe")).not_to be_nil
        expect(screen('I cant breathe')).not_to be_nil
      end

      it 'fires anywhere in a long conversation transcript' do
        transcript = <<~TEXT
          patient: I have had a headache since Monday.
          assistant: Can you tell me more about it?
          patient: It is the worst headache of my life.
        TEXT

        expect(screen(transcript)[:rule_ids]).to include('stroke')
      end
    end

    describe 'negation handling' do
      it 'does not fire on a denial' do
        expect(screen('no chest pain, just a rash')).to be_nil
        expect(screen('denies chest pain')).to be_nil
        expect(screen('a rash without any chest pain')).to be_nil
      end

      it 'still fires on a non-negated flag in the same sentence' do
        result = screen('no chest pain, but I am coughing up blood')

        expect(result[:rule_ids]).to include('hemorrhage')
        expect(result[:rule_ids]).not_to include('cardiac')
      end

      it 'fires when the negator is too far away to be a denial' do
        # "not" here negates "sure", not the symptom. Erring toward firing is
        # the intended bias.
        expect(screen('I am not sure if this is chest pain')).not_to be_nil
      end

      it 'fires when the same flag is denied once and asserted once' do
        expect(screen('yesterday there was no chest pain. today I have chest pain')).not_to be_nil
      end
    end

    describe 'deliberate non-triggers' do
      it 'does not fire on bare shortness of breath' do
        # Documented in the service: too common across asthma, anxiety, and
        # deconditioning to be a useful emergency signal on its own.
        expect(screen('I get shortness of breath when I walk upstairs')).to be_nil
      end
    end

    it 'only ever escalates — no rule lowers a care level' do
      described_class::RULES.each do |rule|
        expect(rule[:patterns]).to be_present
        expect(rule[:label]).to be_present
      end

      texts = described_class::RULES.flat_map { |rule| rule[:patterns] }
      texts.each do |pattern|
        expect(screen(pattern)[:care_level]).to eq('emergency'),
          "pattern #{pattern.inspect} did not resolve to emergency"
      end
    end
  end
end
