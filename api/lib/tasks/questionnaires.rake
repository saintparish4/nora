require "json"

# The plans' clinical question sets (db/questionnaires/definitions.rb) as FHIR
# R4 Questionnaires.
namespace :questionnaires do
  desc "Write one FHIR R4 Questionnaire and one CQL library per payer and drug into db/questionnaires/"
  task build: :environment do
    QuestionnaireBuild.write_all
  end

  desc "Bundle cql/run.mjs and the CQL engine into cql/dist/run.cjs, so production needs Node but no npm install"
  task :runner do
    dir = Rails.root.join("cql")
    system("npm", "ci", chdir: dir.to_s, exception: true)
    system("npx", "esbuild", "run.mjs", "--bundle", "--platform=node", "--format=cjs", "--minify", "--legal-comments=eof",
           "--outfile=dist/run.cjs", "--banner:js=// #{QuestionnaireBuild.runner_digest}", chdir: dir.to_s, exception: true)
  end

  desc "Translate the CQL in cql/src to ELM and write db/questionnaires/libraries (needs the cqframework translator: CQL_TRANSLATOR_URL)"
  task elm: :environment do
    QuestionnaireBuild.write_libraries
  end

  desc "Validate db/questionnaires/*.json with the official HL7 validator (needs Java 17+; run fhir:validate once to fetch it)"
  task :validate do
    jar = Rails.root.join("tmp/validator_cli.jar")
    abort "No validator at #{jar}: run bin/rails fhir:validate first" unless jar.exist?
    files = (QuestionnaireBuild::DIR.glob("*.json") + QuestionnaireBuild::LIBRARIES.glob("*.json")).map(&:to_s)
    # Nora's own extensions (plain language, answer rule, question set) are
    # declared by URL only, so the validator is told to accept that domain.
    abort "FHIR validation failed" unless system("java", "-jar", jar.to_s, *files, "-version", "4.0.1", "-ig", "hl7.fhir.uv.sdc#3.0.0", "-extension", "https://nora.example/",
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
  INITIAL_EXPRESSION = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression".freeze
  CQL_SRC = Rails.root.join("cql/src")
  LIBRARIES = DIR.join("libraries")

  def definitions
    eval(DIR.join("definitions.rb").read, TOPLEVEL_BINDING.dup, "db/questionnaires/definitions.rb") # rubocop:disable Security/Eval
  end

  def write_all
    all = definitions
    all.each { |definition| DIR.join("#{definition[:id]}.json").write(JSON.pretty_generate(resource(definition)) + "\n") }
    CQL_SRC.mkpath
    all.each { |definition| CQL_SRC.join("#{library_name(definition)}.cql").write(cql(definition)) }
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
        ].select(&:itself) },
        # DTR: the CQL library whose expressions fill in the answers.
        { url: "http://hl7.org/fhir/StructureDefinition/cqf-library", valueCanonical: "#{BASE}/Library/#{library_name(d)}" }
      ],
      item: d[:items].map { |i| item(d[:id], i, library_name(d)) }
    }
  end

  def item(set_id, i, library)
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
        # Where the answer comes from, so Nora can say why it could not find
        # one. The answer itself is the CQL expression below.
        { url: "#{EXT}/answer-rule", extension: [ { url: "from", valueCode: i[:from] } ] + rule },
        { url: INITIAL_EXPRESSION, valueExpression: { language: "text/cql-identifier", expression: %(#{library}."#{i[:link]}") } }
      ].select(&:itself),
      answerOption: i[:options]&.map { |code, display| { valueCoding: { system: system, code: code, display: display } } },
      enableWhen: i[:enable_when]&.map do |w|
        { question: w[:question], operator: "=", answerCoding: { system: "#{BASE}/CodeSystem/#{set_id}-#{w[:question]}", code: w[:code] } }
      end,
      enableBehavior: (i[:enable_when]&.size.to_i > 1 ? "all" : nil)
    }.compact
  end

  # Names what cql/dist/run.cjs was built from, so a spec can tell it is stale.
  def runner_digest
    files = %w[run.mjs package-lock.json].map { |f| Rails.root.join("cql", f).read }
    "Built by bin/rails questionnaires:runner from run.mjs and package-lock.json #{Digest::SHA256.hexdigest(files.join)[0, 16]}"
  end

  def library_name(d) = "Nora#{d[:id].split('-').map(&:capitalize).join}"

  # One CQL library per question set: a named expression per question, its
  # answer code (or number), and "<question> Source", the resources it read.
  # The shared reading of the chart is in cql/src/NoraCommon.cql.
  def cql(d)
    rx = ->(drug) { "{ #{RequestForm::AdminFields::RXNORM.fetch(drug).map { |c| "'#{c}'" }.join(', ')} }" }
    lines = [
      "// Generated by `bin/rails questionnaires:build` from db/questionnaires/definitions.rb. Do not edit.",
      "library #{library_name(d)} version '1.0.0'", "", "using FHIR version '4.0.1'", "",
      "include FHIRHelpers version '4.0.1' called FHIRHelpers", "include NoraCommon version '1.0.0' called Common", "",
      "parameter AsOf Date", "", "context Patient", "",
      %(define "Item Codes": #{rx.call(d[:item])}), "",
      %(define "Order": Common."Active Order"("Item Codes", '#{d[:item]}')), ""
    ]
    d[:items].each do |i|
      answer, source = cql_answer(i, d, rx)
      lines << %(define "#{i[:link]}":\n  #{answer}\n)
      lines << %(define "#{i[:link]} Source":\n  #{source}\n)
    end
    lines.join("\n")
  end

  def cql_answer(i, d, rx)
    options = i[:options]&.map { |code, _| "'#{code}'" }&.join(", ")
    within = ->(expr) { "if #{expr} in { #{options} } then #{expr} else null" }
    resources = ->(*exprs) { "(List<FHIR.Resource>{ #{exprs.join(', ')} }) R where R is not null" }
    order = resources.call('"Order"')
    case i[:from]
    when "age_group" then [ "Common.\"Age Group\"", resources.call("Patient") ]
    when "age_at_least" then [ "Common.\"Age At Least\"(#{i[:age]})", resources.call("Patient") ]
    when "plan_option" then [ "Common.\"FEP Option\"", resources.call('Common."Active Coverage"') ]
    when "dosage_form" then [ 'Common."Dosage Form"("Order")', order ]
    when "brand_or_generic"
      generic = RequestForm::ClinicalAnswers::GENERIC.fetch(d[:item])
      [ %(Common."Brand Or Generic"("Order", "Item Codes", '#{d[:item]}', '#{generic}')), order ]
    when "quantity_over" then [ %(Common."Over Limit"("Order", #{i[:limit][0]}, #{i[:limit][1]})), order ]
    when "pens_for" then [ %(Common."Pens For"("Order", #{i[:days]})), order ]
    when "diagnosis" then [ within.call('Common."Diagnosis Choice"'), resources.call('Common."Weight Diagnosis"') ]
    when "bmi_range" then [ 'Common."BMI Range"(Common."Latest BMI Value")', resources.call('Common."Latest BMI"') ]
    when "comorbidities"
      [ "if exists (Common.\"Comorbidity Choices\" intersect { #{options} }) then Common.\"Comorbidity Choices\" intersect { #{options} } else null",
        'Common."Comorbidity Conditions"' ]
    when "criterion" then [ %(Common."Met"(#{i[:criterion]}, '#{i[:when_met]}')), %(Common."Evidence For"(#{i[:criterion]})) ]
    when "criterion_bmi" then [ %(Common."BMI Range"(Common."Quoted BMI"(#{i[:criterion]}))), %(Common."Evidence For"(#{i[:criterion]})) ]
    when "continuation"
      [ %(Common."Continuation"("Item Codes", '#{d[:item]}')), resources.call(%(Common."First Order"("Item Codes", '#{d[:item]}'))) ]
    when "prior_prescription"
      [ %(Common."Prior Prescription"(#{rx.call(i[:drug])}, '#{i[:drug]}')), %(Common."Orders For"(#{rx.call(i[:drug])}, '#{i[:drug]}')) ]
    else [ "null as System.String", "List<FHIR.Resource>{}" ]
    end
  end

  # FHIR Library resources holding each library's CQL and ELM, as DTR packages
  # them. ELM comes from the cqframework translator (CQL_TRANSLATOR_URL, e.g.
  # docker run -p 8091:8080 cqframework/cql-translation-service:v2.9.0).
  def write_libraries
    require "net/http"
    url = URI("#{ENV.fetch('CQL_TRANSLATOR_URL', 'http://localhost:8091')}/cql/translator?annotations=false&locators=true&result-types=true" \
              "&signatures=All&disable-list-demotion=true&disable-list-promotion=true")
    sources = CQL_SRC.glob("*.cql").sort
    boundary = "nora#{SecureRandom.hex(8)}"
    body = sources.map do |path|
      "--#{boundary}\r\nContent-Disposition: form-data; name=\"#{path.basename('.cql')}\"; filename=\"#{path.basename}\"\r\n" \
        "Content-Type: application/cql\r\n\r\n#{path.read}\r\n"
    end.join + "--#{boundary}--\r\n"
    response = Net::HTTP.post(url, body, "Content-Type" => "multipart/form-data; boundary=#{boundary}")
    abort "translator: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    elms = response.body.scan(/name="([^"]+)"\r?\n\r?\n(\{.*?\})\r?\n--/m).to_h
    LIBRARIES.mkpath
    sources.each do |path|
      name = path.basename(".cql").to_s
      elm = JSON.parse(elms.fetch(name) { abort "no ELM for #{name}" })
      errors = Array(elm.dig("library", "annotation")).select { |a| a["type"] == "CqlToElmError" && a["errorSeverity"] == "error" }
      abort "#{name}: #{errors.map { |e| "line #{e['startLine']}: #{e['message']}" }.join('; ')}" if errors.any?

      library = {
        # FHIRHelpers is HL7's (Using CQL with FHIR), so it keeps HL7's canonical.
        resourceType: "Library", id: name, url: name == "FHIRHelpers" ? "http://hl7.org/fhir/uv/cql/Library/FHIRHelpers" : "#{BASE}/Library/#{name}", version: elm.dig("library", "identifier", "version"), name: name,
        status: "active", type: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/library-type", code: "logic-library" } ] },
        content: [ { contentType: "text/cql", data: Base64.strict_encode64(path.read) },
                   { contentType: "application/elm+json", data: Base64.strict_encode64(JSON.generate(elm)) } ]
      }
      LIBRARIES.join("#{name}.json").write(JSON.pretty_generate(library) + "\n")
    end
    puts "Wrote #{sources.size} libraries to #{LIBRARIES.relative_path_from(Rails.root)}"
  end
end
