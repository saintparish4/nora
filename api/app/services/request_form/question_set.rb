module RequestForm
  # A plan's clinical questions for one drug: a FHIR R4 Questionnaire in
  # db/questionnaires, written from definitions.rb by
  # `bin/rails questionnaires:build`.
  class QuestionSet
    DIR = Rails.root.join("db/questionnaires")
    EXT = "https://nora.example/fhir/StructureDefinition".freeze
    HIDDEN = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden".freeze

    Item = Data.define(:link_id, :prefix, :text, :type, :repeats, :hidden, :options, :enable_when, :plain, :rule, :expression)
    INITIAL_EXPRESSION = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression".freeze
    CQF_LIBRARY = "http://hl7.org/fhir/StructureDefinition/cqf-library".freeze

    def self.all = @all ||= DIR.glob("*.json").sort.map { |path| new(JSON.parse(path.read)) }

    def self.for(payer:, item:) = all.find { |set| set.payer == payer && set.item == item }

    attr_reader :resource, :items

    def initialize(resource)
      @resource = resource
      @meta = extensions(resource, "#{EXT}/question-set")
      @items = resource.fetch("item").map { |i| parse_item(i) }
    end

    def id = resource["id"]
    def payer = @meta["payer"]
    def item = @meta["item"]

    # The CQL library whose expressions answer the questions, e.g. "NoraFepSaxenda".
    def library
      Array(resource["extension"]).find { |e| e["url"] == CQF_LIBRARY }&.dig("valueCanonical")&.split("/")&.last
    end

    # "form": the plan's own published form, word for word. "derived": one
    # question per criterion of its published policy, in Nora's words.
    def kind = @meta["kind"]

    def as_api_json
      {
        id: id, title: resource["title"], kind: kind, publisher: resource["publisher"], description: resource["description"],
        source_url: @meta["source"], source_title: @meta["sourceTitle"], sha256: @meta["sha256"], note: @meta["note"],
        revised: kind == "form" ? resource["version"] : nil
      }
    end

    private

    def parse_item(i)
      ext = Array(i["extension"])
      Item.new(
        link_id: i["linkId"], prefix: i["prefix"], text: i["text"], type: i["type"], repeats: i["repeats"] == true,
        hidden: ext.any? { |e| e["url"] == HIDDEN && e["valueBoolean"] },
        options: Array(i["answerOption"]).map { |o| o["valueCoding"].slice("code", "display").symbolize_keys },
        enable_when: Array(i["enableWhen"]).map { |w| { question: w["question"], code: w.dig("answerCoding", "code") } },
        plain: ext.find { |e| e["url"] == "#{EXT}/plain-language" }&.dig("valueString"),
        rule: extensions(i, "#{EXT}/answer-rule").symbolize_keys,
        expression: ext.find { |e| e["url"] == INITIAL_EXPRESSION }&.dig("valueExpression", "expression")
      )
    end

    # A complex extension's parts as { "name" => value }.
    def extensions(element, url)
      parts = Array(element["extension"]).find { |e| e["url"] == url }&.dig("extension") || []
      parts.to_h { |part| [ part["url"], part.find { |k, _| k.start_with?("value") }&.last ] }
    end
  end
end
