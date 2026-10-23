module RequestForm
  # The plan's clinical questions for one request, each either answered from
  # the chart with its source, or explained and handed to a person.
  #
  # Every answer is a named CQL expression in the question set's library
  # (cql/src), run over the patient's US Core data and the evidence a person
  # verified (RequestForm::Cql), as a Da Vinci DTR client fills in a
  # Questionnaire. This class only decides which questions apply, cites the
  # resources each expression read, and, when an expression returns nothing,
  # says why: "ask the prescriber's office", or, for an administrative gap,
  # where in the chart to look. Nora never answers a question its CQL cannot
  # source.
  #
  # A person's answer (FormAnswer) takes the place of Nora's: "manual" where
  # Nora had none, "override" where it replaces one. Every answer carries its
  # origin, as DTR records it: auto, manual or override.
  class ClinicalAnswers
    Answer = Data.define(:link_id, :prefix, :text, :plain, :hidden, :type, :repeats, :options, :status, :answer, :source, :reason, :depends_on, :origin)

    ANSWERED = "answered".freeze
    ASK = "ask_prescriber".freeze
    CHECK = "check_chart".freeze

    GENERIC = { "Wegovy" => "semaglutide", "Zepbound" => "tirzepatide", "Saxenda" => "liraglutide" }.freeze
    EPIC = AdminFields::EPIC
    REQUIREMENT_SYSTEM = "https://nora.example/fhir/CodeSystem/requirement".freeze

    # Where each kind of answer is read, for the source line.
    READS = {
      "age_group" => [ "Patient.birthDate", :patient ], "age_at_least" => [ "Patient.birthDate", :patient ],
      "plan_option" => [ "Coverage.class (plan)", :coverage ], "dosage_form" => [ "MedicationRequest.medicationCodeableConcept", :order ],
      "brand_or_generic" => [ "MedicationRequest.medicationCodeableConcept", :order ],
      "quantity_over" => [ "MedicationRequest.dispenseRequest", :order ], "pens_for" => [ "MedicationRequest.dispenseRequest", :order ],
      "diagnosis" => [ "Condition.code (ICD-10-CM)", :problems ], "comorbidities" => [ "Condition.code (ICD-10-CM)", :problems ],
      "bmi_range" => [ "Observation.valueQuantity (BMI, LOINC 39156-5)", :vitals ],
      "continuation" => [ "MedicationRequest.authoredOn", :order ], "prior_prescription" => [ "MedicationRequest (all)", :order ]
    }.freeze

    def self.call(...) = new(...).call

    # @param requirements [Hash{Integer => AuthorizationRequirement}, nil] by
    #   criterion position; read from the request when nil. The evaluation
    #   (evals/request_form) passes its labelled cases' own.
    # @param as_of [Date, nil] the day the request was opened.
    # @param staff [Hash{String => FormAnswer}, nil] people's answers by
    #   question; read from the request when nil, none when it has none.
    def initialize(prior_authorization, chart:, question_set:, requirements: nil, as_of: nil, staff: nil)
      @pa = prior_authorization
      @chart = chart
      @set = question_set
      @requirements = requirements
      @as_of = as_of || (prior_authorization.created_at || Time.current).to_date
      @staff = staff || (prior_authorization.respond_to?(:form_answers) ? prior_authorization.form_answers.includes(:recorded_by).index_by(&:link_id) : {})
    end

    # @return [Array<Answer>] the questions that apply, in form order; a question
    #   that depends on an unanswered one is kept, with depends_on set.
    # @raise [Cql::Error] when the CQL cannot run
    def call
      @cql = Cql.call(library: @set.library, resources: resources, as_of: @as_of)
      results = @set.items.to_h { |item| [ item.link_id, answer(item) ] }
      enabled = {}
      @set.items.filter_map do |item|
        state = enabled_state(item, results, enabled)
        next if state == false

        status, value, source, reason, origin = results.fetch(item.link_id)
        Answer.new(
          link_id: item.link_id, prefix: item.prefix, text: item.text, plain: item.plain, hidden: item.hidden, type: item.type,
          repeats: item.repeats, options: item.options, status: status, answer: value, source: source, reason: reason,
          depends_on: state.nil? ? unresolved(item, results) : [], origin: origin
        )
      end
    end

    private

    # What the CQL reads: the patient's US Core resources, and an Observation
    # for each piece of evidence a person verified on a met requirement.
    def resources
      @resources ||= @chart.resources + requirements.flat_map do |position, requirement|
        next [] unless requirement.status == "met"

        requirement.verified_evidence.each_with_index.map do |evidence, i|
          { "resourceType" => "Observation", "id" => "requirement-#{position}-evidence-#{i + 1}", "status" => "final",
            "code" => { "coding" => [ { "system" => REQUIREMENT_SYSTEM, "code" => "criterion-#{position}" } ] },
            "subject" => { "reference" => "Patient/#{@chart.patient_id}" }, "valueString" => evidence.excerpt }
        end
      end
    end

    # true, false, or nil when it turns on a question nobody has answered.
    def enabled_state(item, results, memo)
      return memo[item.link_id] if memo.key?(item.link_id)

      memo[item.link_id] = item.enable_when.map do |cond|
        parent = @set.items.find { |i| i.link_id == cond[:question] }
        parent_state = parent ? enabled_state(parent, results, memo) : true
        status, value = results[cond[:question]]
        next false if parent_state == false
        next nil if status != ANSWERED
        # A known answer that does not match turns the question off, even when
        # the parent itself hangs on an unanswered question.
        next false unless Array(value[:codes]).include?(cond[:code])

        parent_state.nil? ? nil : true
      end.then { |states| states.include?(false) ? false : (states.include?(nil) ? nil : true) }
    end

    def unresolved(item, results)
      item.enable_when.filter_map do |cond|
        next if results.dig(cond[:question], 0) == ANSWERED

        @set.items.find { |i| i.link_id == cond[:question] }&.then { |i| [ i.prefix, i.text ].compact.join(" ") }
      end
    end

    def answer(item)
      auto = auto_answer(item)
      staff = @staff[item.link_id] or return auto

      value = item.type == "integer" ? staff.value["value"] : staff.codes
      source = { kind: "staff", origin: staff.origin, recorded_by: staff.recorded_by&.full_name, recorded_at: staff.updated_at, note: staff.note,
                 replaces: staff.origin == "override" ? auto[1]&.dig(:display) : nil }
      [ ANSWERED, display(item, value), source, nil, staff.origin ]
    end

    def auto_answer(item)
      value = @cql[item.link_id]
      read = Array(@cql["#{item.link_id} Source"]).map { |ref| find(ref) }.compact
      return missing(item, read) if value.nil? || value == []

      kind = item.rule[:from]
      source = kind.start_with?("criterion") ? quote_source(requirements.fetch(item.rule[:criterion])) : chart_source(kind, read)
      [ ANSWERED, display(item, value), source, nil, "auto" ]
    end

    def display(item, value)
      return { codes: nil, display: value.to_s } if item.type == "integer"

      codes = Array(value).map(&:to_s)
      { codes: codes, display: codes.map { |code| item.options.find { |o| o[:code] == code }&.dig(:display) || code }.join("; ") }
    end

    # Why there is no answer, by where the answer would have come from.
    def missing(item, read)
      case item.rule[:from]
      when "age_group", "age_at_least" then check(@chart.patient&.dig("birthDate") ? "The patient is under 12; this form covers ages 12 and up." : "No date of birth in the chart.")
      when "plan_option" then check("The coverage record does not name the FEP option (Standard, Basic, or Focus). Check the card scan in Coverages.")
      when "dosage_form", "brand_or_generic", "quantity_over", "pens_for"
        check(prescription ? "The prescription does not say. Check the order." : "No active prescription for #{@pa.item_name} in the chart. Check the order.")
      when "diagnosis" then ask("No obesity or overweight diagnosis (E66) that matches this form's choices is on the problem list. Ask the prescriber's office which diagnosis to use.")
      when "bmi_range" then ask("No BMI in Vitals. Ask the prescriber's office for the patient's current BMI.")
      when "comorbidities"
        ask("None of the listed conditions is on the problem list. Only the prescriber's office can confirm \"None of the above\": a problem list can be incomplete.")
      when "continuation" then continuation_gap
      when "criterion", "criterion_bmi" then requirement_gap(item)
      else ask("Nora cannot read this from the chart. Only the prescriber's office can answer it.")
      end
    end

    def continuation_gap
      history = @chart.medication_history.select { |rx| AdminFields.prescribes?(rx, @pa.item_name) }
      written = history.filter_map { |rx| rx["authoredOn"]&.then { |d| Date.iso8601(d[0, 10]) } }.min
      return check("No prescription for #{@pa.item_name} in the chart. Check the order.") unless written

      ask("The chart has a #{@pa.item_name} prescription from #{written.strftime('%m/%d/%Y')}. Whether the patient has taken it " \
          "continuously for 4 months is not in the chart's structured data: check the last visit note, or ask the prescriber's office.")
    end

    def requirement_gap(item)
      requirement = requirements[item.rule[:criterion]] or return ask("Nothing on this request checks this. Ask the prescriber's office.")
      return ask("The verified quote for this does not state a BMI number. Ask the prescriber's office for the baseline BMI.") if requirement.status == "met"

      not_met(requirement)
    end

    def find(ref) = resources.find { |r| r["resourceType"] == ref["resourceType"] && r["id"] == ref["id"] }

    def chart_source(kind, read)
      element, epic = READS.fetch(kind) { [ "the chart", :patient ] }
      if read.empty?
        # Only an answer drawn from an absence, such as "no earlier Zepbound
        # order": the source is the search that found nothing.
        return { kind: "chart", reference: "MedicationRequest?patient=#{@chart.patient_id}", element: element, in_epic: EPIC.fetch(epic),
                 detail: "No matching prescription in the chart's medication history" }
      end

      { kind: "chart", reference: read.map { |r| "#{r['resourceType']}/#{r['id']}" }.join(", "), element: element, in_epic: EPIC.fetch(epic),
        detail: read.map { |r| detail(r) }.compact.join("; ").presence }
    end

    def detail(resource)
      case resource["resourceType"]
      when "Patient" then age&.then { |years| "Age #{years}" }
      when "Coverage" then resource["class"].to_a.find { |c| c.dig("type", "coding", 0, "code") == "plan" }&.then { |c| c["name"] || c["value"] }
      when "MedicationRequest"
        quantity = resource.dig("dispenseRequest", "quantity", "value")
        days = resource.dig("dispenseRequest", "expectedSupplyDuration", "value")
        unit = resource.dig("dispenseRequest", "quantity", "unit")
        [ resource.dig("medicationCodeableConcept", "text"), quantity && days && "#{[ number(quantity), unit ].compact.join(' ')} per #{number(days)} days",
          resource["authoredOn"] && "written #{us_date(resource['authoredOn'])}" ].compact.join(", ")
      when "Condition" then [ resource.dig("code", "coding")&.find { |c| c["system"] == AdminFields::ICD10 }&.dig("code"), resource.dig("code", "text") ].compact.join(" ")
      when "Observation" then "BMI #{number(resource.dig('valueQuantity', 'value'))} on #{us_date(resource['effectiveDateTime'])}"
      end
    end

    def age
      dob = @chart.patient&.dig("birthDate") or return
      born = Date.iso8601(dob)
      @as_of.year - born.year - (@as_of.strftime("%m%d") < born.strftime("%m%d") ? 1 : 0)
    end

    def us_date(iso) = iso && Date.iso8601(iso[0, 10]).strftime("%m/%d/%Y")

    # --- From verified chart quotes -----------------------------------------

    def requirements
      @requirements ||= @pa.requirements.includes(:policy_criterion, evidence: %i[chart_document verified_by]).index_by { |r| r.policy_criterion.position }
    end

    def not_met(requirement)
      case requirement.status
      when "missing"
        ask("The chart notes do not show this (marked missing on the request). Ask the prescriber's office.")
      when "not_applicable"
        ask("Marked not applicable on the request: #{requirement.note} Ask the prescriber's office how to answer.")
      else
        ask("No verified chart quote for this yet. Review the proposed evidence on the request; if the notes do not say, ask the prescriber's office.")
      end
    end

    def quote_source(requirement)
      {
        kind: "quote", requirement_id: requirement.id, criterion: requirement.policy_criterion.text,
        quotes: requirement.verified_evidence.map do |e|
          { excerpt: e.excerpt, document: e.chart_document.title, occurred_on: e.chart_document.occurred_on,
            verified_by: e.verified_by&.full_name, verified_at: e.verified_at }
        end
      }
    end

    # --- Helpers --------------------------------------------------------------

    def prescription
      return @prescription if defined?(@prescription)

      @prescription = @chart.medication_requests.find { |rx| AdminFields.prescribes?(rx, @pa.item_name) }
    end

    def ask(reason) = [ ASK, nil, nil, reason ]

    def check(reason) = [ CHECK, nil, nil, reason ]

    def number(value) = value.to_f == value.to_i ? value.to_i : value
  end
end
