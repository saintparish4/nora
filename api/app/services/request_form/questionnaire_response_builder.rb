module RequestForm
  # The plan's questions as answered, as a Da Vinci DTR QuestionnaireResponse:
  # one item per answered question, each answer marked with where it came
  # from (information-origin: auto from Nora's CQL, manual or override from a
  # person). Questions nobody has answered are left out, and the response
  # stays in-progress until every question that applies has an answer.
  class QuestionnaireResponseBuilder
    PROFILE = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/dtr-questionnaireresponse".freeze
    ORIGIN = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/information-origin".freeze
    CONTEXT = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/qr-context".freeze
    INTENDED_USE = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/intendedUse".freeze

    def self.call(...) = new(...).call

    # @param answers [Array<ClinicalAnswers::Answer>]
    # @param context [Array<String>] the coverage and the order it answers
    #   for, e.g. ["Coverage/c1", "MedicationRequest/rx1"]
    def initialize(set:, answers:, patient_id:, context:, authored: Time.current)
      @set = set
      @answers = answers
      @patient_id = patient_id
      @context = context
      @authored = authored
    end

    def call
      answered = @answers.select { |a| a.status == ClinicalAnswers::ANSWERED }
      {
        "resourceType" => "QuestionnaireResponse",
        "meta" => { "profile" => [ PROFILE ] },
        "extension" => @context.map { |reference| { "url" => CONTEXT, "valueReference" => { "reference" => reference } } } +
          # To go with the prior authorization request.
          [ { "url" => INTENDED_USE, "valueCodeableConcept" => { "coding" => [ { "system" => "http://hl7.org/fhir/us/davinci-crd/CodeSystem/coverage-information-codes", "code" => "withpa" } ] } } ],
        "questionnaire" => "#{@set.resource['url']}|#{@set.resource['version']}",
        "status" => answered.size == @answers.size ? "completed" : "in-progress",
        "subject" => { "reference" => "Patient/#{@patient_id}" },
        "authored" => @authored.iso8601,
        "item" => answered.map { |a| item(a) }
      }
    end

    private

    def item(answer)
      {
        "linkId" => answer.link_id, "text" => answer.text,
        "answer" => values(answer).map { |value| value.merge("extension" => [ origin(answer) ]) }
      }
    end

    def values(answer)
      return [ { "valueInteger" => answer.answer[:display].to_i } ] if answer.type == "integer"

      options = @set.resource["item"].find { |i| i["linkId"] == answer.link_id }.fetch("answerOption")
      answer.answer[:codes].map do |code|
        coding = options.find { |o| o.dig("valueCoding", "code") == code }&.dig("valueCoding") || { "code" => code }
        { "valueCoding" => coding }
      end
    end

    # DTR: an author for a person's answer, none for one the CQL filled in.
    def origin(answer)
      parts = [ { "url" => "source", "valueCode" => answer.origin } ]
      if answer.origin != "auto"
        parts << { "url" => "author", "extension" => [ { "url" => "practitioner", "valueReference" => { "display" => answer.source[:recorded_by] } } ] }
      end
      { "url" => ORIGIN, "extension" => parts }
    end
  end
end
