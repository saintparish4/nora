# The request-form eval. See README.md.
#
# Runs RequestForm::AdminFields and RequestForm::ClinicalAnswers, the code the
# request form calls, on each labelled case, and scores what they return
# against the labels. Nothing is re-implemented; the requirement states a case
# gives are passed in place of the request's own, the way a reviewed request
# would hold them.
require "yaml"

module RequestFormEval
  ROOT = Rails.root.join("evals/request_form")

  Requirement = Data.define(:id, :status, :note, :policy_criterion, :verified_evidence)
  Criterion = Data.define(:text)
  Evidence = Data.define(:excerpt, :chart_document, :verified_by, :verified_at)
  Document = Data.define(:title, :occurred_on)
  Person = Data.define(:full_name)
  Request = Data.define(:item_name, :created_at)

  DONT_KNOW = %w[ask_prescriber check_chart].freeze

  def self.spec = YAML.safe_load_file(ROOT.join("cases.yml"), aliases: true)

  def self.base_resources
    @base_resources ||= Fhir::BundleSource.load(Fhir::DEMO_BUNDLES) + Fhir::BundleSource.load(ROOT.join("patients"))
  end

  # A case's chart: every resource, with the case's changes applied to a copy.
  def self.resources_for(kase)
    resources = JSON.parse(JSON.generate(base_resources))
    Array(kase["mutate"]).each do |op|
      if op["add"]
        resources << op["add"]
        next
      end
      type, id = (op["set"] || op["unset"] || op["delete"]).split("/", 2)
      target = resources.find { |r| r["resourceType"] == type && r["id"] == id } or raise "no #{type}/#{id} to change"
      next resources.delete(target) if op["delete"]

      *path, last = op["path"].split(".").map { |k| k.match?(/\A\d+\z/) ? k.to_i : k }
      parent = path.empty? ? target : target.dig(*path)
      op["set"] ? parent[last] = op["value"] : parent.delete(last)
    end
    resources
  end

  class Runner
    def initialize(out: $stdout, only: nil)
      @out = out
      @only = only
      spec = RequestFormEval.spec
      @patients = spec.fetch("patients")
      @cases = spec.fetch("cases").select { |c| only.nil? || only.include?(c["id"]) }
    end

    # @return [Hash] totals and per-case results
    def call
      results = @cases.map { |c| run(c) }
      totals = totals(results)
      report(results, totals)
      { cases: results, totals: totals }
    end

    private

    def run(kase)
      source = Fhir::BundleSource.new(resources: RequestFormEval.resources_for(kase), label: "eval")
      chart = Fhir::Chart.new(source: source, patient_id: kase.fetch("patient"))
      request = Request.new(item_name: kase.fetch("item"), created_at: nil)
      set = RequestForm::QuestionSet.for(payer: kase.fetch("payer"), item: kase.fetch("item")) or
        raise "#{kase['id']}: no question set for #{kase['payer']} #{kase['item']}"

      fields = RequestForm::AdminFields.call(request, chart: chart)
      answers = RequestForm::ClinicalAnswers.call(request, chart: chart, question_set: set, requirements: requirements(kase),
                                                           as_of: Date.iso8601(kase.fetch("as_of", "2026-10-23")))
      { id: kase["id"], fields: score_fields(kase, fields), answers: score_answers(kase, set, answers) }
    end

    def requirements(kase)
      kase.fetch("requirements", {}).to_h do |position, value|
        value = { "status" => value } if value.is_a?(String)
        evidence = value["status"] == "met" ? [ evidence(value["quote"] || "(the verified quote for criterion #{position})") ] : []
        [ position.to_i, Requirement.new(id: position.to_i, status: value["status"], note: value["note"],
                                         policy_criterion: Criterion.new(text: "criterion #{position}"), verified_evidence: evidence) ]
      end
    end

    def evidence(quote)
      Evidence.new(excerpt: quote, chart_document: Document.new(title: "Office visit", occurred_on: nil),
                   verified_by: Person.new(full_name: "Labelled case"), verified_at: nil)
    end

    def label_key(field)
      field.section == :prescriber && %i[phone address].include?(field.key) ? "prescriber_#{field.key}" : field.key.to_s
    end

    # Exact match, empty counting as a value: filling a field the chart does
    # not hold is as wrong as getting one wrong.
    def score_fields(kase, fields)
      labels = @patients.fetch(kase["patient"]).merge(kase.fetch("fields", {}))
      fields.map do |field|
        key = label_key(field)
        raise "#{kase['id']}: no label for field #{key}" unless labels.key?(key)

        expected = labels[key]&.to_s
        outcome =
          if field.value == expected then expected.nil? ? :correct_empty : :correct
          elsif expected.nil? then :filled_without_label
          elsif field.value.nil? then :missed
          else :wrong
          end
        { key: key, expected: expected, got: field.value, outcome: outcome }
      end
    end

    def score_answers(kase, set, answers)
      labels = kase.fetch("answers").compact
      shown = answers.index_by(&:link_id)
      set.items.map(&:link_id).filter_map do |link|
        expected = labels[link]
        got = shown[link]
        next if expected.nil? && got.nil?

        outcome =
          if expected.nil? then :shown_wrongly
          elsif got.nil? then :not_shown
          elsif %w[ask check].include?(expected)
            DONT_KNOW.include?(got.status) ? :correct_dont_know : :answered_without_source
          elsif DONT_KNOW.include?(got.status) then :safe_miss
          elsif answer_codes(got) == Array(expected).map(&:to_s).sort then :correct
          else :wrong
          end
        { link: link, expected: expected, got: got && (got.status == "answered" ? answer_codes(got) : got.status), outcome: outcome }
      end
    end

    def answer_codes(answer) = (answer.answer[:codes] || [ answer.answer[:display] ]).sort

    def totals(results)
      fields = results.flat_map { |r| r[:fields] }.group_by { |f| f[:outcome] }.transform_values(&:size)
      answers = results.flat_map { |r| r[:answers] }.group_by { |a| a[:outcome] }.transform_values(&:size)
      field_n = results.sum { |r| r[:fields].size }
      knows = answers.values_at(:correct, :wrong, :safe_miss).compact.sum
      dont_knows = answers.values_at(:correct_dont_know, :answered_without_source).compact.sum
      {
        cases: results.size, fields: field_n, field_outcomes: fields,
        field_exact_match: ((fields[:correct].to_i + fields[:correct_empty].to_i).to_f / field_n).round(3),
        questions: answers.values.sum, answer_outcomes: answers,
        # Of the questions a careful person could answer from the chart, how many Nora answered correctly.
        answer_accuracy: knows.zero? ? nil : (answers[:correct].to_f / knows).round(3),
        # Of the questions where the right move is "don't know", how often Nora said so.
        correct_dont_know: dont_knows.zero? ? nil : (answers[:correct_dont_know].to_f / dont_knows).round(3),
        # Answers a person would have to undo: wrong, or given without a source.
        harmful: answers[:wrong].to_i + answers[:answered_without_source].to_i + fields[:wrong].to_i + fields[:filled_without_label].to_i
      }
    end

    def report(results, totals)
      @out.puts format("%-38s %8s %10s %s", "case", "fields", "questions", "problems")
      results.each do |r|
        bad_fields = r[:fields].reject { |f| %i[correct correct_empty].include?(f[:outcome]) }
        bad_answers = r[:answers].reject { |a| %i[correct correct_dont_know].include?(a[:outcome]) }
        problems = bad_fields.map { |f| "#{f[:key]}: #{f[:outcome]} (#{f[:got].inspect}, label #{f[:expected].inspect})" } +
                   bad_answers.map { |a| "#{a[:link]}: #{a[:outcome]} (#{a[:got].inspect}, label #{a[:expected].inspect})" }
        ok_fields = r[:fields].size - bad_fields.size
        ok_answers = r[:answers].size - bad_answers.size
        @out.puts format("%-38s %8s %10s %s", r[:id], "#{ok_fields}/#{r[:fields].size}", "#{ok_answers}/#{r[:answers].size}", problems.join("; "))
      end
      @out.puts
      @out.puts JSON.pretty_generate(totals)
    end
  end
end
