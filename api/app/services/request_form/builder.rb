module RequestForm
  # The request form for one prior authorization, as staff fill it on
  # CoverMyMeds: the administrative fields from the patient's FHIR chart, then
  # the plan's clinical questions, each answered with its source or handed to
  # a person.
  class Builder
    def self.call(...) = new(...).call

    def initialize(prior_authorization, source: Fhir.source)
      @pa = prior_authorization
      @source = source
    end

    def call
      fhir_id = @pa.patient.fhir_id
      return { available: false, reason: "This patient is not linked to a record on the FHIR server." } if fhir_id.blank?

      chart = Fhir::Chart.new(source: @source, patient_id: fhir_id)
      fields = AdminFields.call(@pa, chart: chart)
      { available: true, chart_source: @source.label, patient_fhir_id: fhir_id, fields: fields.map(&:to_h), questions: questions(chart) }
    rescue Fhir::Error => e
      { available: false, reason: e.message }
    end

    private

    def questions(chart)
      payer = @pa.policy_template.payer&.name
      set = QuestionSet.for(payer: payer, item: @pa.item_name)
      unless set
        return { available: false, reason: "Nora has no question set for #{@pa.item_name} with #{payer || 'this payer'}. Answer the plan's questions from the requirements." }
      end

      answers = ClinicalAnswers.call(@pa, chart: chart, question_set: set)
      { available: true, set: set.as_api_json, items: answers.map(&:to_h) }
    rescue Cql::Error => e
      Rails.logger.error("[request_form] #{e.message}")
      { available: false, reason: "Nora could not work out the plan's questions just now. Answer them from the requirements." }
    end
  end
end
