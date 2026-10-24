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
    def medication_requests = @medication_requests ||= orders(status: "active")
    def medication_history = @medication_history ||= orders
    def conditions = @conditions ||= @source.search("Condition", patient: patient_id, category: "problem-list-item")
    def bmi_observations = @bmi_observations ||= @source.search("Observation", patient: patient_id, code: LOINC_BMI)

    # Everything the question sets' CQL reads, as one list.
    def resources
      [ patient, *coverages, *medication_history, *conditions, *bmi_observations ].compact.uniq { |r| [ r["resourceType"], r["id"] ] }
    end

    # "Practitioner/abc" → the Practitioner resource.
    def resolve(reference)
      type, id = reference.to_s.split("/", 2)
      id && @source.read(type, id)
    end

    # The Medication an order's drug was read from, when the order pointed
    # at one ("Medication/abc", or "#abc" for a contained one), else nil.
    def medication_reference(order) = medication_links[order["id"]]

    private

    def medication_links = @medication_links ||= {}

    # MedicationRequest searches, each order's drug as a code on the order.
    # Epic, among others, names the drug in a separate Medication the order
    # references; the answer rules and the CQL read medicationCodeableConcept,
    # so that Medication's code is copied there.
    def orders(**params)
      @source.search("MedicationRequest", patient: patient_id, **params).map { |order| with_medication_code(order) }
    end

    def with_medication_code(order)
      link = order["medicationReference"]
      return order if order["medicationCodeableConcept"] || link.nil?

      code = medication(order, link["reference"])&.dig("code") || {}
      code = code.merge("text" => link["display"]) if code["text"].blank? && link["display"].present?
      return order if code.blank?

      medication_links[order["id"]] = link["reference"]
      order.except("medicationReference").merge("medicationCodeableConcept" => code)
    end

    def medication(order, reference)
      return Array(order["contained"]).find { |r| r["resourceType"] == "Medication" && "##{r['id']}" == reference } if reference.to_s.start_with?("#")

      @medications ||= {}
      @medications.key?(reference) ? @medications[reference] : @medications[reference] = resolve(reference)
    end
  end
end
