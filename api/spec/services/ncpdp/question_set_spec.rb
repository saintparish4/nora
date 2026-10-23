# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'NCPDP ePA question sets' do
  let(:samples) { Rails.root.join('db/questionnaires/ncpdp/onc-samples') }

  describe Ncpdp::QuestionnaireMapper do
    it "maps ONC's Tacrolimus PAInitiationResponse to a Questionnaire whose branching follows NextQuestionID" do
      result = described_class.call(samples.join('PAInitiationResponse-0.xml').read)
      q = result.questionnaire
      items = q['item'].index_by { |i| i['linkId'] }

      expect(q).to include('title' => 'Tacrolimus PA Form', 'identifier' => [ { 'system' => 'urn:ncpdp:script:question-set-id', 'value' => 'QS105' } ])
      expect(items['Q1']).to include('type' => 'text', 'code' => [ include('code' => 'urn:oid:2.16.840.1.113883.10.20.22.4.19') ])
      expect(items['Q1']).not_to have_key('enableWhen')
      # Q2: "Is the patient 16 years of age or older?" Yes goes to Q3, No ends the set.
      expect(items['Q3']['enableWhen']).to eq([ { 'question' => 'Q2', 'operator' => '=', 'answerCoding' => { 'system' => 'urn:ncpdp:script:question-set:QS105:Q2', 'code' => 'Q2C1' } } ])
      expect(result.unmapped).to include('PACaseID A106', 'DeadlineForReply 2022-10-01T23:59:59')
    end

    it 'turns a mandatory free-text choice into a nested question, and a multi-select into repeats' do
      symbicort = described_class.call(samples.join('PAInitiationResponse-29.xml').read).questionnaire
      expect(symbicort['item'].find { |i| i['repeats'] }).to be_present

      crestor = described_class.call(samples.join('PAInitiationResponse-19.xml').read).questionnaire
      nested = crestor['item'].flat_map { |i| Array(i['item']) }
      expect(nested).to include(include('type' => 'text', 'required' => true))
    end
  end

  describe Ncpdp::QuestionSetWriter do
    let(:sets) { RequestForm::QuestionSet.all.index_by(&:id) }

    def differing_walks(questionnaire, written, fixed, walks: 100)
      mapped = Ncpdp::QuestionnaireMapper.call(written.xml).questionnaire
      random = Random.new(7)
      position = ->(item, code) { Array(item['answerOption']).index { |o| o.dig('valueCoding', 'code') == code } }
      (1..walks).count do
        picks = {}
        a = Ncpdp::Paths.new(questionnaire, fixed: fixed).walk do |item, choices|
          choice = choices.sample(random: random)
          picks[written.question_ids[item['linkId']]] = position.call(item, choice)
          choice
        end
        b = Ncpdp::Paths.new(mapped).walk { |item, choices| (i = picks[item['linkId']]) ? item['answerOption'][i].dig('valueCoding', 'code') : choices.first }
        a.map { |link, _| written.question_ids[link] } != b.map(&:first).reject { |link| link.include?('.') }
      end
    end

    it 'writes the structure of the ONC samples' do
      xml = Nokogiri::XML(described_class.call(sets['cigna-wegovy'].resource).xml)
      expect(xml.at_xpath('/Open/QuestionSet/Header/QuestionSetID').text).to eq('cigna-wegovy')
      expect(xml.xpath('//Question/QuestionType/Select/Choice/ChoiceID').map(&:text)).to include('Q1C1', 'Q1C2')
      expect(xml.xpath('//DefaultNextQuestionID | //NextQuestionID').map(&:text)).to include('END')
    end

    it 'round-trips the derived sets, and every FEP set a payer would send one member, without changing what is asked' do
      %w[uhc-wegovy aetna-zepbound cigna-saxenda].each do |id|
        written = described_class.call(sets[id].resource)
        expect(written.conflicts).to be_empty
        expect(differing_walks(sets[id].resource, written, {})).to eq(0), id
      end
      fixed = { 'age-group' => '18-plus', 'plan-option' => 'focus' }
      written = described_class.call(sets['fep-saxenda'].resource, fixed: fixed)
      expect(written.conflicts).to be_empty
      expect(differing_walks(sets['fep-saxenda'].resource, written, fixed)).to eq(0)
    end

    it "reports where a plan-level FEP set cannot say what comes next, because it depends on the member's plan or age" do
      written = described_class.call(sets['fep-saxenda'].resource)
      expect(written.conflicts).to include(
        { question: 'continuation', answer: 'initiation', next: contain_exactly('initiation-bmi', 'initiation-pediatric-bmi') },
        { question: 'pa-combination', answer: 'no', next: contain_exactly('focus-nonformulary', 'change-from-zepbound') }
      )
    end
  end
end
