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
    files = (QuestionnaireBuild::DIR.glob("*.json") + QuestionnaireBuild::LIBRARIES.glob("*.json") +
             QuestionnaireBuild::DIR.join("ncpdp/mapped").glob("*.json")).map(&:to_s)
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
      resourceType: "Questionnaire", id: d[:id],
      meta: { profile: [ "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/dtr-std-questionnaire" ] },
      text: { status: "generated", div: narrative(d) },
      url: "#{BASE}/Questionnaire/#{d[:id]}",
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
        { url: INITIAL_EXPRESSION, valueExpression: { language: "text/cql", expression: %(#{library}."#{i[:link]}") } }
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

  # The narrative DTR requires: the title and the questions, as XHTML.
  def narrative(d)
    questions = d[:items].reject { |i| i[:hidden] }.map { |i| "<li>#{ERB::Util.html_escape([ i[:prefix], i[:text] ].compact.join(' '))}</li>" }
    %(<div xmlns="http://www.w3.org/1999/xhtml"><p>#{ERB::Util.html_escape(d[:title])}</p><ol>#{questions.join}</ol></div>)
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

namespace :questionnaires do
  desc "Write each question set as an NCPDP SCRIPT 2023011 QuestionSet, map it back to FHIR, and report what does not survive"
  task ncpdp: :environment do
    NcpdpBuild.call
  end
end

# The NCPDP side of the question sets. See docs/NCPDP-MAPPING.md.
module NcpdpBuild
  module_function

  DIR = Rails.root.join("db/questionnaires/ncpdp")
  DOC = Rails.root.join("../docs/NCPDP-MAPPING.md")
  HIDDEN = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden".freeze

  def call
    %w[plan member mapped].each { |d| DIR.join(d).mkpath }
    rows = RequestForm::QuestionSet.all.map { |set| report(set) }
    samples = DIR.join("onc-samples").glob("PAInitiationResponse-*.xml").sort.map do |path|
      result = Ncpdp::QuestionnaireMapper.call(path.read)
      DIR.join("mapped", "#{path.basename('.xml')}.json").write(JSON.pretty_generate(result.questionnaire) + "\n")
      { file: path.basename.to_s, title: result.questionnaire["title"], questions: result.questionnaire["item"].size, unmapped: result.unmapped }
    end
    write_doc(rows, samples)
    puts "Wrote #{rows.size} question sets and #{samples.size} ONC samples; see docs/NCPDP-MAPPING.md"
  end

  def hidden_facts(q)
    q["item"].select { |i| Array(i["extension"]).any? { |e| e["url"] == HIDDEN } }
             .to_h { |i| [ i["linkId"], i["answerOption"].map { |o| o.dig("valueCoding", "code") } ] }
  end

  def report(set)
    q = set.resource
    plan = Ncpdp::QuestionSetWriter.call(q)
    DIR.join("plan", "#{set.id}.xml").write(plan.xml)
    mapping = Ncpdp::QuestionnaireMapper.call(plan.xml)
    mapped = mapping.questionnaire
    DIR.join("mapped", "#{set.id}.json").write(JSON.pretty_generate(mapped) + "\n")
    facts = hidden_facts(q)
    members = facts.empty? ? [] : facts.values.first.product(*facts.values.drop(1)).map { |combo| facts.keys.zip(combo).to_h }
    member_results = members.map do |fixed|
      written = Ncpdp::QuestionSetWriter.call(q, fixed: fixed)
      DIR.join("member", "#{set.id}--#{fixed.values.join('--')}.xml").write(written.xml)
      { fixed: fixed, conflicts: written.conflicts.size,
        mismatches: mismatches(q, written, Ncpdp::QuestionnaireMapper.call(written.xml).questionnaire, fixed) }
    end
    never = mapping.unmapped.grep(/never asked/).map { |u| plan.question_ids.key(u.split.first) }
    { set: set, questions: q["item"].size, hidden: facts.keys, conflicts: plan.conflicts, never: never,
      plan_mismatches: mismatches(q, plan, mapped, {}), members: member_results }
  end

  # Walks both Questionnaires with the same answers and counts walks where
  # they ask different questions. Answers are matched by choice position.
  def mismatches(original, written, mapped, fixed, walks: 400)
    random = Random.new(2026)
    position = ->(item, code) { Array(item["answerOption"]).index { |o| o.dig("valueCoding", "code") == code } }
    by_id = mapped["item"].index_by { |i| i["linkId"] }
    (1..walks).count do
      picks = {}
      a = Ncpdp::Paths.new(original, fixed: fixed).walk do |item, choices|
        choice = choices.sample(random: random)
        picks[written.question_ids[item["linkId"]]] = position.call(item, choice)
        choice
      end
      b = Ncpdp::Paths.new(mapped).walk do |item, choices|
        index = picks[item["linkId"]]
        index ? Array(item["answerOption"])[index].dig("valueCoding", "code") : choices.first
      end
      # The nested "please specify" text items exist only on the mapped side.
      a.map { |link, _| written.question_ids[link] } != b.map(&:first).reject { |link| link.include?(".") }
    end
  end

  def write_doc(rows, samples)
    generated = [ "<!-- Generated by bin/rails questionnaires:ncpdp. -->", "",
                  "| Question set | Questions | Read silently by Nora | Plan-level set: answers whose next question depends on an earlier one | Plan-level set: questions no answer reaches | Plan-level set: walks that differ after the round trip (of 400) | Member sets: walks that differ |",
                  "|---|---|---|---|---|---|---|" ]
    rows.each do |r|
      conflicts = r[:conflicts].map { |c| "#{c[:question]} = #{c[:answer]} → #{c[:next].join(' or ')}" }.join("<br>").presence || "none"
      member = r[:members].empty? ? "n/a" : "#{r[:members].sum { |m| m[:mismatches] }} (#{r[:members].size} sets, #{r[:members].sum { |m| m[:conflicts] }} conflicts)"
      generated << "| #{r[:set].id} | #{r[:questions]} | #{r[:hidden].join(', ').presence || 'none'} | #{conflicts} | " \
                   "#{r[:never].join(', ').presence || 'none'} | #{r[:plan_mismatches]} | #{member} |"
    end
    generated += [ "", "ONC's own test messages, mapped to FHIR the same way:", "", "| Message | Form | Questions | Not mapped |", "|---|---|---|---|" ]
    samples.each { |s| generated << "| #{s[:file]} | #{s[:title]} | #{s[:questions]} | #{s[:unmapped].join('; ')} |" }
    text = DOC.read
    start = text.index("<!-- generated:start -->") or abort "#{DOC} has no generated section"
    finish = text.index("<!-- generated:end -->")
    DOC.write(text[0, start] + "<!-- generated:start -->\n" + generated.join("\n") + "\n" + text[finish..])
  end
end
