module RequestForm
  # The request form for one prior authorization: the administrative fields
  # from the patient's FHIR chart. (The plan's clinical questions join it in
  # the next step.)
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
      { available: true, chart_source: @source.label, patient_fhir_id: fhir_id, fields: fields.map(&:to_h) }
    rescue Fhir::Error => e
      { available: false, reason: e.message }
    end
  end
end
