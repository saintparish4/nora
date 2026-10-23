# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RequestForm::QuestionSet do
  before(:all) { Rails.application.load_tasks unless defined?(QuestionnaireBuild) }

  let(:sets) { described_class.all }

  it 'has one set per payer and drug in the policy library, and the JSON is current with definitions.rb' do
    silence_seed_output { load Rails.root.join('db/seeds/policy_library.rb') }
    expected = PolicyTemplate.where.not(payer_id: nil).includes(:payer).map { |t| [ t.payer.name, t.item_name ] }
    expect(sets.map { |s| [ s.payer, s.item ] }).to match_array(expected)

    QuestionnaireBuild.definitions.each do |definition|
      built = JSON.parse(JSON.generate(QuestionnaireBuild.resource(definition)))
      expect(described_class.for(payer: definition[:payer], item: definition[:item]).resource)
        .to eq(built), "db/questionnaires/#{definition[:id]}.json is stale: run bin/rails questionnaires:build"
    end
  end

  it 'labels each set as the plan\'s own form or derived from its criteria, with the source' do
    fep, derived = sets.partition { |s| s.payer.include?('Federal Employee') }
    expect(fep.map(&:kind).uniq).to eq([ 'form' ])
    expect(fep.map { |s| s.as_api_json[:sha256] }).to all(match(/\A\h{64}\z/))
    expect(derived.map(&:kind).uniq).to eq([ 'derived' ])
    expect(derived.map { |s| s.as_api_json[:description] }).to all(include("the wording is Nora's, not the plan's"))
  end

  it 'branches only on questions that exist, by answers those questions offer' do
    sets.each do |set|
      by_id = set.items.index_by(&:link_id)
      expect(by_id.size).to eq(set.items.size), "#{set.id} repeats a linkId"
      set.items.flat_map(&:enable_when).each do |cond|
        expect(by_id[cond[:question]]&.options&.map { |o| o[:code] }).to include(cond[:code]), "#{set.id}: #{cond}"
      end
    end
  end

  it 'points every chart-quote answer at a criterion of the matching policy, with an answer the question offers' do
    silence_seed_output { load Rails.root.join('db/seeds/policy_library.rb') }
    sets.each do |set|
      template = PolicyTemplate.joins(:payer).find_by!(payers: { name: set.payer }, item_name: set.item)
      positions = template.criteria.pluck(:position)
      set.items.select { |i| i.rule[:from].start_with?('criterion') }.each do |item|
        expect(positions).to include(item.rule[:criterion]), "#{set.id} #{item.link_id}"
        next unless item.rule[:whenMet]

        expect(item.options.map { |o| o[:code] }).to include(item.rule[:whenMet])
      end
    end
  end

  it 'explains every question staff see in plain language' do
    visible = sets.flat_map(&:items).reject(&:hidden)
    expect(visible.map(&:plain)).to all(be_present)
  end

  describe 'its CQL' do
    let(:elm) { RequestForm::Cql.elm }

    it 'answers every question with a named expression, and names the resources each one read' do
      sets.each do |set|
        defines = elm.fetch(set.library).dig('library', 'statements', 'def').map { |d| d['name'] }
        set.items.each do |item|
          expect(item.expression).to eq(%(#{set.library}."#{item.link_id}"))
          expect(defines).to include(item.link_id, "#{item.link_id} Source")
        end
      end
    end

    it 'runs from a bundle built from the current runner and engine versions' do
      expect(RequestForm::Cql::RUNNER.read.lines.first).to include(QuestionnaireBuild.runner_digest), 'run bin/rails questionnaires:runner'
    end

    it 'is compiled from the CQL in cql/src, and that CQL is current with definitions.rb' do
      RequestForm::Cql::LIBRARIES.glob('*.json').each do |path|
        library = JSON.parse(path.read)
        cql = Base64.decode64(library['content'].find { |c| c['contentType'] == 'text/cql' }['data'])
        expect(cql).to eq(Rails.root.join('cql/src', "#{library['name']}.cql").read), "#{path.basename} is stale: run bin/rails questionnaires:elm"
      end
      QuestionnaireBuild.definitions.each do |definition|
        expect(Rails.root.join('cql/src', "#{QuestionnaireBuild.library_name(definition)}.cql").read)
          .to eq(QuestionnaireBuild.cql(definition)), 'run bin/rails questionnaires:build, then questionnaires:elm'
      end
    end
  end
end
