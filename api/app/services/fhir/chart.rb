module Fhir
  # One patient's structured chart, read from a source with the searches US
  # Core defines for each resource.
  class Chart
    LOINC_BMI = "http://loinc.org|39156-5".freeze

    attr_reader :patient_id

    def initialize(source:, patient_id:)
      @source = source
      @patient_id = patient_id
    end

    def patient = @patient ||= @source.read("Patient", patient_id)
    def coverages = @coverages ||= @source.search("Coverage", patient: patient_id).select { |c| c["status"] == "active" }
    def medication_requests = @medication_requests ||= @source.search("MedicationRequest", patient: patient_id, status: "active")
    def medication_history = @medication_history ||= @source.search("MedicationRequest", patient: patient_id)
    def conditions = @conditions ||= @source.search("Condition", patient: patient_id, category: "problem-list-item")
    def bmi_observations = @bmi_observations ||= @source.search("Observation", patient: patient_id, code: LOINC_BMI)

    # "Practitioner/abc" → the Practitioner resource.
    def resolve(reference)
      type, id = reference.to_s.split("/", 2)
      id && @source.read(type, id)
    end
  end
end
