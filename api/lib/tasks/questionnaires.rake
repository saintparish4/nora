require "json"

# The plans' clinical question sets (db/questionnaires/definitions.rb) as FHIR
# R4 Questionnaires.
namespace :questionnaires do
  desc "Write one FHIR R4 Questionnaire per payer and drug into db/questionnaires/"
  task :build do
    QuestionnaireBuild.write_all
  end

  desc "Validate db/questionnaires/*.json with the official HL7 validator (needs Java 17+; run fhir:validate once to fetch it)"
  task :validate do
    jar = Rails.root.join("tmp/validator_cli.jar")
    abort "No validator at #{jar}: run bin/rails fhir:validate first" unless jar.exist?
    files = QuestionnaireBuild::DIR.glob("*.json").map(&:to_s)
    # Nora's own extensions (plain language, answer rule, question set) are
    # declared by URL only, so the validator is told to accept that domain.
    abort "FHIR validation failed" unless system("java", "-jar", jar.to_s, *files, "-version", "4.0.1", "-extension", "https://nora.example/",
                                                 "-output-style", "compact")
  end
end

# Turns the definitions into Questionnaire resources. Kept beside the tasks:
# the app reads only the JSON (RequestForm::QuestionSet).
module QuestionnaireBuild
  module_function

  DIR = Rails.root.join("db/questionnaires")
  BASE = "https://nora.example/fhir".freeze
  EXT = "#{BASE}/StructureDefinition".freeze
  HIDDEN = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden".freeze

  def definitions
    eval(DIR.join("definitions.rb").read, TOPLEVEL_BINDING.dup, "db/questionnaires/definitions.rb") # rubocop:disable Security/Eval
  end

  def write_all
    all = definitions
    all.each { |definition| DIR.join("#{definition[:id]}.json").write(JSON.pretty_generate(resource(definition)) + "\n") }
    puts "Wrote #{all.size} questionnaires to #{DIR.relative_path_from(Rails.root)}"
  end

  def resource(d)
    src = d[:source]
    {
      resourceType: "Questionnaire", id: d[:id], url: "#{BASE}/Questionnaire/#{d[:id]}",
      version: src[:revised] || "derived-2026-10-23",
      name: d[:id].split("-").map(&:capitalize).join, title: d[:title], status: "active",
      date: src[:revised] || "2026-10-23", publisher: src[:publisher], subjectType: [ "Patient" ],
      description: src[:kind] == "form" ? "#{src[:title]}, revised #{src[:revised]}: the plan's own questions, word for word." : src[:note],
      extension: [
        { url: "#{EXT}/question-set", extension: [
          { url: "kind", valueCode: src[:kind] }, { url: "payer", valueString: d[:payer] }, { url: "item", valueString: d[:item] },
          { url: "source", valueUri: src[:url] }, { url: "sourceTitle", valueString: src[:title] },
          src[:sha256] && { url: "sha256", valueString: src[:sha256] },
          src[:note] && src[:kind] == "form" && { url: "note", valueString: src[:note] }
        ].select(&:itself) }
      ],
      item: d[:items].map { |i| item(d[:id], i) }
    }
  end

  def item(set_id, i)
    system = "#{BASE}/CodeSystem/#{set_id}-#{i[:link]}"
    rule = i.slice(:criterion, :when_met, :drug, :age, :days).map do |key, value|
      name = key.to_s.camelize(:lower)
      if value.is_a?(Integer) then { url: name, valueInteger: value }
      elsif key == :drug then { url: name, valueString: value }
      else { url: name, valueCode: value }
      end
    end
    rule += [ { url: "limitQuantity", valueInteger: i[:limit][0] }, { url: "limitDays", valueInteger: i[:limit][1] } ] if i[:limit]
    {
      linkId: i[:link], prefix: i[:prefix], text: i[:text], type: i[:type], required: !i[:hidden] || nil, repeats: i[:repeats],
      extension: [
        i[:hidden] && { url: HIDDEN, valueBoolean: true },
        i[:plain] && { url: "#{EXT}/plain-language", valueString: i[:plain] },
        { url: "#{EXT}/answer-rule", extension: [ { url: "from", valueCode: i[:from] } ] + rule }
      ].select(&:itself),
      answerOption: i[:options]&.map { |code, display| { valueCoding: { system: system, code: code, display: display } } },
      enableWhen: i[:enable_when]&.map do |w|
        { question: w[:question], operator: "=", answerCoding: { system: "#{BASE}/CodeSystem/#{set_id}-#{w[:question]}", code: w[:code] } }
      end,
      enableBehavior: (i[:enable_when]&.size.to_i > 1 ? "all" : nil)
    }.compact
  end
end
