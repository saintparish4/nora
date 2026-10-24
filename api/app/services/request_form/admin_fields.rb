module RequestForm
  # The administrative half of a CoverMyMeds request, filled from the chart's
  # structured FHIR data by lookup alone (no model, no guessing): patient,
  # insurance with the pharmacy-benefit IDs, prescriber, medication, diagnosis.
  #
  # Every field says where it came from: the FHIR element, and the place in
  # Epic a person would look. A field the chart does not hold is returned
  # empty, with where to get it instead, never filled with a guess.
  class AdminFields
    Field = Data.define(:section, :key, :label, :value, :source, :missing)

    # Where a person would find each kind of value in Epic (Sharif's names).
    EPIC = {
      patient: "Patient header and demographics", coverage: "Coverages", order: "The prescription order",
      prescriber: "The prescriber's provider record", problems: "Problem list", vitals: "Vitals"
    }.freeze

    CARD_OR_PHARMACY = "Not in the chart's coverage record. Check the insurance card scan in Coverages, or call the pharmacy.".freeze
    ICD10 = "http://hl7.org/fhir/sid/icd-10-cm".freeze
    NPI = "http://hl7.org/fhir/sid/us-npi".freeze

    # RxNorm branded products for each item, from the NLM's RxNav, so a
    # prescription is matched by code as well as by name.
    RXNORM = {
      "Wegovy" => %w[2553506 2553603 2553803 2553903 2554104 2739771 2745804 2730161 2730165 2730167 2730169],
      "Zepbound" => %w[2669706 2669709 2669712 2669715 2669718 2669721 2679317 2679319 2679321 2679323 2679325 2679327 2732440 2732444],
      "Saxenda" => %w[1598268]
    }.freeze

    def self.call(...) = new(...).call

    # Whether a MedicationRequest is for this item, by RxNorm code or name.
    def self.prescribes?(rx, item_name)
      concept = rx["medicationCodeableConcept"] || {}
      Array(concept["coding"]).any? { |c| RXNORM.fetch(item_name, []).include?(c["code"]) } ||
        concept["text"].to_s.downcase.include?(item_name.downcase)
    end

    def initialize(prior_authorization, chart:)
      @pa = prior_authorization
      @chart = chart
    end

    # @return [Array<Field>]
    def call
      patient_fields + insurance_fields + prescriber_fields + medication_fields + diagnosis_fields
    end

    private

    def patient_fields
      p = @chart.patient or raise Fhir::Error, "No patient #{@chart.patient_id} on the FHIR server"
      ref = "Patient/#{p['id']}"
      name = official_name(p)
      address = Array(p["address"]).find { |a| a["use"] == "home" } || Array(p["address"]).first || {}
      phone = Array(p["telecom"]).find { |t| t["system"] == "phone" }
      [
        field(:patient, :first_name, "First name", Array(name["given"]).first, ref, "Patient.name.given", :patient),
        field(:patient, :last_name, "Last name", name["family"], ref, "Patient.name.family", :patient),
        field(:patient, :date_of_birth, "Date of birth", us_date(p["birthDate"]), ref, "Patient.birthDate", :patient),
        field(:patient, :sex, "Sex", p["gender"]&.capitalize, ref, "Patient.gender", :patient),
        field(:patient, :address, "Street address", Array(address["line"]).join(", ").presence, ref, "Patient.address.line", :patient),
        field(:patient, :city, "City", address["city"], ref, "Patient.address.city", :patient),
        field(:patient, :state, "State", address["state"], ref, "Patient.address.state", :patient),
        field(:patient, :zip, "ZIP", address["postalCode"], ref, "Patient.address.postalCode", :patient),
        field(:patient, :phone, "Phone", phone&.dig("value"), ref, "Patient.telecom (phone)", :patient)
      ]
    end

    def insurance_fields
      coverage = @chart.coverages.first
      ref = coverage && "Coverage/#{coverage['id']}"
      klass = ->(code) { Array(coverage&.dig("class")).find { |c| coding_codes(c["type"]).include?(code) } }
      member_id = Array(coverage&.dig("identifier")).find { |i| coding_codes(i["type"]).include?("MB") }&.dig("value") || coverage&.dig("subscriberId")
      plan = klass.call("plan")
      payer = Array(coverage&.dig("payor")).first&.dig("display")
      [
        field(:insurance, :plan, "Plan", [ payer, plan&.dig("name") || plan&.dig("value") ].compact.join(" · ").presence, ref,
              "Coverage.payor, Coverage.class (plan)", :coverage),
        field(:insurance, :member_id, "Member ID", member_id, ref, "Coverage.identifier (MB)", :coverage),
        field(:insurance, :group, "Group number", klass.call("group")&.dig("value"), ref, "Coverage.class (group)", :coverage),
        field(:insurance, :rx_bin, "Rx BIN", klass.call("rxbin")&.dig("value"), ref, "Coverage.class (rxbin)", :coverage, missing: CARD_OR_PHARMACY),
        field(:insurance, :rx_pcn, "Rx PCN", klass.call("rxpcn")&.dig("value"), ref, "Coverage.class (rxpcn)", :coverage, missing: CARD_OR_PHARMACY),
        field(:insurance, :rx_group, "Rx group", klass.call("rxgroup")&.dig("value"), ref, "Coverage.class (rxgroup)", :coverage, missing: CARD_OR_PHARMACY),
        field(:insurance, :rx_member_id, "Rx member ID", klass.call("rxid")&.dig("value"), ref, "Coverage.class (rxid)", :coverage,
              missing: "Not in the chart's coverage record. Usually the same as the member ID; check the card scan in Coverages.")
      ]
    end

    def prescriber_fields
      requester = prescription&.dig("requester", "reference")
      doctor = requester && @chart.resolve(requester)
      ref = doctor && "Practitioner/#{doctor['id']}"
      name = Array(doctor&.dig("name")).first || {}
      address = Array(doctor&.dig("address")).first || {}
      telecom = ->(system) { Array(doctor&.dig("telecom")).find { |t| t["system"] == system }&.dig("value") }
      full_name = [ Array(name["given"]).join(" "), name["family"] ].compact_blank.join(" ")
      full_name = [ full_name, Array(name["suffix"]).first ].compact_blank.join(", ")
      [
        field(:prescriber, :name, "Prescriber", full_name.presence, ref, "Practitioner.name", :prescriber),
        field(:prescriber, :npi, "NPI", Array(doctor&.dig("identifier")).find { |i| i["system"] == NPI }&.dig("value"), ref,
              "Practitioner.identifier (NPI)", :prescriber),
        field(:prescriber, :phone, "Office phone", telecom.call("phone"), ref, "Practitioner.telecom (phone)", :prescriber),
        field(:prescriber, :fax, "Office fax", telecom.call("fax"), ref, "Practitioner.telecom (fax)", :prescriber),
        field(:prescriber, :address, "Office address",
              [ Array(address["line"]).join(", "), address["city"], [ address["state"], address["postalCode"] ].compact.join(" ") ].compact_blank.join(", ").presence,
              ref, "Practitioner.address", :prescriber)
      ]
    end

    def medication_fields
      rx = prescription
      ref = rx && "MedicationRequest/#{rx['id']}"
      concept = rx&.dig("medicationCodeableConcept") || {}
      quantity = rx&.dig("dispenseRequest", "quantity")
      supply = rx&.dig("dispenseRequest", "expectedSupplyDuration")
      no_rx = "No active prescription for #{@pa.item_name} in the chart. Check the order, or ask the prescriber's office."
      rxnorms = Array(concept["coding"]).select { |c| c["system"].to_s.include?("rxnorm") }.filter_map { |c| c["code"] }.uniq
      drug_element = rx && @chart.medication_reference(rx) ? "MedicationRequest.medicationReference → Medication.code" : "MedicationRequest.medicationCodeableConcept"
      [
        field(:medication, :drug, "Drug and strength", concept["text"] || Array(concept["coding"]).first&.dig("display"), ref,
              drug_element, :order, missing: no_rx),
        field(:medication, :rxnorm, "RxNorm code", rxnorms.one? ? rxnorms.first : nil, ref,
              "#{drug_element}.coding (RxNorm)", :order, missing: rx && rxnorms.many? ? several_rxnorms(rxnorms) : no_rx),
        field(:medication, :quantity, "Quantity", quantity && [ number(quantity["value"]), quantity["unit"] ].compact.join(" "), ref,
              "MedicationRequest.dispenseRequest.quantity", :order, missing: no_rx),
        field(:medication, :days_supply, "Days' supply", supply && number(supply["value"]).to_s, ref,
              "MedicationRequest.dispenseRequest.expectedSupplyDuration", :order, missing: no_rx),
        field(:medication, :directions, "Directions", Array(rx&.dig("dosageInstruction")).first&.dig("text"), ref,
              "MedicationRequest.dosageInstruction.text", :order, missing: no_rx)
      ]
    end

    # The weight diagnosis and the BMI code first, as plans ask for them;
    # the rest of the active problem list after.
    def diagnosis_fields
      coded = @chart.conditions.filter_map do |condition|
        coding = Array(condition.dig("code", "coding")).find { |c| c["system"] == ICD10 } or next
        { code: coding["code"], text: condition.dig("code", "text"), ref: "Condition/#{condition['id']}" }
      end
      weight = coded.find { |c| c[:code].start_with?("E66") }
      bmi = coded.find { |c| c[:code].start_with?("Z68") }
      others = coded - [ weight, bmi ]
      [
        field(:diagnosis, :primary, "Diagnosis (ICD-10)", weight && "#{weight[:code]} #{weight[:text]}", weight&.dig(:ref), "Condition.code (ICD-10-CM)", :problems,
              missing: "No obesity or overweight diagnosis (E66) on the problem list. Check the last visit's diagnoses, or ask the prescriber's office."),
        field(:diagnosis, :bmi_code, "BMI code (ICD-10)", bmi && "#{bmi[:code]} #{bmi[:text]}", bmi&.dig(:ref), "Condition.code (ICD-10-CM)", :problems,
              missing: "No BMI code (Z68) on the problem list. The BMI itself is in Vitals."),
        field(:diagnosis, :other, "Other diagnoses", others.map { |c| "#{c[:code]} #{c[:text]}" }.join("; ").presence,
              others.first&.dig(:ref), "Condition.code (ICD-10-CM)", :problems, missing: "None on the problem list.")
      ]
    end

    # The active prescription for this request's item, by RxNorm code or name.
    def prescription
      return @prescription if defined?(@prescription)

      @prescription = @chart.medication_requests.find { |rx| self.class.prescribes?(rx, @pa.item_name) }
    end

    def field(section, key, label, value, reference, element, epic, missing: nil)
      source = reference && value.present? ? { reference: reference, element: element, in_epic: EPIC.fetch(epic) } : nil
      missing = nil if value.present?
      missing ||= "Not in the chart. #{EPIC.fetch(epic)} is where it would be." if value.blank?
      Field.new(section: section, key: key, label: label, value: value.presence, source: source, missing: missing)
    end

    # Epic lists every RxNorm code its drug record maps to (ingredients as well
    # as the product); which one is the dispensed product needs RxNorm's term
    # types, so Nora names them all rather than picking one.
    def several_rxnorms(codes)
      "The chart's drug record maps to several RxNorm codes (#{codes.join(', ')}). Use the product code from the order, " \
        "or look the drug up in RxNav."
    end

    def official_name(patient)
      names = Array(patient["name"])
      names.find { |n| n["use"] == "official" } || names.first || {}
    end

    def coding_codes(concept) = Array(concept&.dig("coding")).map { |c| c["code"] }

    def us_date(iso) = iso && Date.iso8601(iso).strftime("%m/%d/%Y")

    def number(value) = value.is_a?(Float) && value == value.to_i ? value.to_i : value
  end
end
