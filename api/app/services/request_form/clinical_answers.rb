module RequestForm
  # The plan's clinical questions for one request, each either answered from
  # the chart with its source, or explained and handed to a person.
  #
  # Nora answers a question only from structured chart data (FHIR) or from a
  # chart quote a person verified against a requirement. Anything else is
  # "ask the prescriber's office", or, for an administrative gap, where in the
  # chart to look. It never answers a clinical question it cannot source, and
  # it never infers "none" from a problem list that does not mention something.
  class ClinicalAnswers
    Answer = Data.define(:link_id, :prefix, :text, :plain, :hidden, :type, :options, :status, :answer, :source, :reason, :depends_on)

    ANSWERED = "answered".freeze
    ASK = "ask_prescriber".freeze
    CHECK = "check_chart".freeze

    GENERIC = { "Wegovy" => "semaglutide", "Zepbound" => "tirzepatide", "Saxenda" => "liraglutide" }.freeze
    ICD10 = AdminFields::ICD10
    EPIC = AdminFields::EPIC

    # ICD-10-CM prefixes for the FEP form's comorbidity and cardiovascular list.
    COMORBIDITY_CODES = {
      "type-2-diabetes-mellitus" => %w[E11], "dyslipidemia" => %w[E78], "hypertension" => %w[I10 I11 I12 I13 I15 I16],
      "congenital-heart-disease" => %w[Q20 Q21 Q22 Q23 Q24 Q25 Q26], "cerebrovascular-disease" => %w[I6],
      "peripheral-artery-disease-pad" => %w[I70.2 I73.9], "coronary-heart-disease" => %w[I25], "acute-coronary-syndrome-acs" => %w[I24],
      "myocardial-infarction-mi" => %w[I21 I22 I25.2], "unstable-angina" => %w[I20.0],
      "coronary-or-other-arterial-revascularization" => %w[Z95.5 Z95.82 Z98.61],
      "prior-percutaneous-coronary-intervention-coronary-bypass-surgery" => %w[Z95.1 Z95.5 Z98.61]
    }.freeze

    def self.call(...) = new(...).call

    # @param requirements [Hash{Integer => AuthorizationRequirement}, nil] by
    #   criterion position; read from the request when nil. The evaluation
    #   (evals/request_form) passes its labelled cases' own.
    # @param as_of [Date, nil] the day the request was opened.
    def initialize(prior_authorization, chart:, question_set:, requirements: nil, as_of: nil)
      @pa = prior_authorization
      @chart = chart
      @set = question_set
      @requirements = requirements
      @as_of = as_of || (prior_authorization.created_at || Time.current).to_date
    end

    # @return [Array<Answer>] the questions that apply, in form order; a question
    #   that depends on an unanswered one is kept, with depends_on set.
    def call
      results = @set.items.to_h { |item| [ item.link_id, answer(item) ] }
      enabled = {}
      @set.items.filter_map do |item|
        state = enabled_state(item, results, enabled)
        next if state == false

        status, value, source, reason = results.fetch(item.link_id)
        Answer.new(
          link_id: item.link_id, prefix: item.prefix, text: item.text, plain: item.plain, hidden: item.hidden, type: item.type,
          options: item.options, status: status, answer: value, source: source, reason: reason,
          depends_on: state.nil? ? unresolved(item, results) : []
        )
      end
    end

    private

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
      rule = item.rule
      case rule[:from]
      when "age_group" then age_group
      when "age_at_least" then age_at_least(rule[:age])
      when "plan_option" then plan_option
      when "dosage_form" then dosage_form
      when "brand_or_generic" then brand_or_generic
      when "quantity_over" then quantity_over(item, rule[:limitQuantity], rule[:limitDays])
      when "pens_for" then pens_for(rule[:days])
      when "diagnosis" then diagnosis(item)
      when "bmi_range" then bmi_range(item)
      when "comorbidities" then comorbidities(item)
      when "criterion" then criterion(item, rule[:criterion], rule[:whenMet])
      when "criterion_bmi" then criterion_bmi(item, rule[:criterion])
      when "continuation" then continuation(item)
      when "prior_prescription" then prior_prescription(item, rule[:drug])
      else ask("Nora cannot read this from the chart. Only the prescriber's office can answer it.")
      end
    end

    # --- From structured chart data -----------------------------------------

    def age
      dob = @chart.patient&.dig("birthDate") or return
      born = Date.iso8601(dob)
      @as_of.year - born.year - (@as_of.strftime("%m%d") < born.strftime("%m%d") ? 1 : 0)
    end

    def patient_source(detail)
      chart_source("Patient/#{@chart.patient['id']}", "Patient.birthDate", :patient, detail)
    end

    def age_group
      years = age or return check("No date of birth in the chart.")
      return check("The patient is #{years}; this form covers ages 12 and up.") if years < 12

      coded(years >= 18 ? "18-plus" : "12-17", years >= 18 ? "Age 18 or older" : "Age 12-17", patient_source("Age #{years}"))
    end

    def age_at_least(minimum)
      years = age or return check("No date of birth in the chart.")
      yes_no(years >= minimum, patient_source("Age #{years}"))
    end

    def plan_option
      coverage = @chart.coverages.first or return check("No active coverage in the chart.")
      plan = Array(coverage["class"]).find { |c| Array(c.dig("type", "coding")).any? { |t| t["code"] == "plan" } }
      name = [ plan&.dig("name"), plan&.dig("value") ].compact.join(" ")
      source = chart_source("Coverage/#{coverage['id']}", "Coverage.class (plan)", :coverage, name)
      if name.match?(/focus/i) then coded("focus", "Blue Focus", source)
      elsif name.match?(/standard|basic/i) then coded("standard-basic", "Blue Standard or Blue Basic", source)
      else check("The coverage record does not name the FEP option (Standard, Basic, or Focus). Check the card scan in Coverages.")
      end
    end

    def dosage_form
      rx = prescription or return no_prescription
      text = rx.dig("medicationCodeableConcept", "text").to_s
      source = rx_source(rx, "MedicationRequest.medicationCodeableConcept", text)
      if text.match?(/tablet/i) then coded("tablet", "Tablets", source)
      elsif text.match?(/inject|pen\b|auto-?injector/i) then coded("injection", "Injection", source)
      else check("The prescription does not say pen or tablet. Check the order.")
      end
    end

    def brand_or_generic
      rx = prescription or return no_prescription
      text = rx.dig("medicationCodeableConcept", "text").to_s
      source = rx_source(rx, "MedicationRequest.medicationCodeableConcept", text)
      code = rx.dig("medicationCodeableConcept", "coding").to_a.find { |c| AdminFields::RXNORM.fetch(@pa.item_name, []).include?(c["code"]) }
      branded = code.present?
      source[:detail] = "#{text} (RxNorm #{code['code']}, a #{@pa.item_name} product)" if branded
      if branded || text.downcase.include?(@pa.item_name.downcase) then coded("brand", "Brand", source)
      elsif text.downcase.include?(GENERIC.fetch(@pa.item_name, "?")) then coded("generic", "Generic", source)
      else check("The prescription does not name the drug as brand or generic. Check the order.")
      end
    end

    def supply
      rx = prescription or return
      quantity = rx.dig("dispenseRequest", "quantity", "value")
      days = rx.dig("dispenseRequest", "expectedSupplyDuration", "value")
      quantity && days.to_f.positive? ? [ rx, quantity.to_f, days.to_f ] : nil
    end

    def quantity_over(item, limit, per_days)
      rx, quantity, days = supply
      return check("The prescription has no quantity or days' supply. Check the order.") unless rx

      scaled = quantity * per_days / days
      detail = "#{number(quantity)} per #{number(days)} days, #{number(scaled.round(1))} per #{per_days} days"
      yes_no(scaled > limit, rx_source(rx, "MedicationRequest.dispenseRequest", detail), item)
    end

    def pens_for(per_days)
      rx, quantity, days = supply
      return check("The prescription has no quantity or days' supply. Check the order.") unless rx

      pens = (quantity * per_days / days).ceil
      source = rx_source(rx, "MedicationRequest.dispenseRequest", "#{number(quantity)} pens per #{number(days)} days")
      [ ANSWERED, { codes: nil, display: pens.to_s }, source, nil ]
    end

    def diagnosis(item)
      condition, code = problem_list.find { |_, c| c.start_with?("E66") }
      return ask("No obesity or overweight diagnosis (E66) is on the problem list. Ask the prescriber's office which diagnosis to use.") unless condition

      choice = code.start_with?("E66.3") ? "elevated-bmi" : "obesity"
      option = item.options.find { |o| o[:code] == choice } or return ask("The chart's diagnosis (#{code}) is not one of this form's choices.")
      source = chart_source("Condition/#{condition['id']}", "Condition.code (ICD-10-CM)", :problems, "#{code} #{condition.dig('code', 'text')}")
      coded(option[:code], option[:display], source)
    end

    def latest_bmi
      @chart.bmi_observations.max_by { |o| o["effectiveDateTime"].to_s }
    end

    def bmi_range(item)
      obs = latest_bmi or return ask("No BMI in Vitals. Ask the prescriber's office for the patient's current BMI.")
      value = obs.dig("valueQuantity", "value").to_f
      date = obs["effectiveDateTime"]&.then { |d| Date.iso8601(d[0, 10]).strftime("%m/%d/%Y") }
      source = chart_source("Observation/#{obs['id']}", "Observation.valueQuantity (BMI, LOINC 39156-5)", :vitals, "BMI #{number(value)} on #{date}")
      range_answer(item, value, source)
    end

    def comorbidities(item)
      found = COMORBIDITY_CODES.filter_map do |option, prefixes|
        hit = problem_list.find { |_, code| prefixes.any? { |p| code.start_with?(p) } }
        hit && [ option, hit ]
      end
      found.select! { |option, _| item.options.any? { |o| o[:code] == option } }
      if found.empty?
        return ask("None of the listed conditions is on the problem list. Only the prescriber's office can confirm " \
                   "\"None of the above\": a problem list can be incomplete.")
      end

      conditions = found.map(&:last).uniq
      source = chart_source(conditions.map { |c, _| "Condition/#{c['id']}" }.join(", "), "Condition.code (ICD-10-CM)", :problems,
                            conditions.map { |c, code| "#{code} #{c.dig('code', 'text')}" }.join("; "))
      codes = found.map(&:first)
      display = codes.map { |code| item.options.find { |o| o[:code] == code }[:display] }.join("; ")
      [ ANSWERED, { codes: codes, display: display }, source, nil ]
    end

    # Initiation when every prescription for the drug in the chart is under
    # four months old. Anything older might be a renewal, and whether the
    # patient took it continuously is not in structured data.
    def continuation(_item)
      history = drug_history(@pa.item_name)
      return check("No prescription for #{@pa.item_name} in the chart. Check the order.") if history.empty?

      first = history.min_by { |rx| rx["authoredOn"].to_s }
      written = first["authoredOn"] && Date.iso8601(first["authoredOn"][0, 10])
      return check("The prescription has no date written. Check the order.") unless written

      if written > @as_of - 4.months
        detail = "First #{@pa.item_name} prescription in the chart written #{written.strftime('%m/%d/%Y')}, under 4 months ago"
        coded("initiation", "NO – this is INITIATION of therapy", rx_source(first, "MedicationRequest.authoredOn", detail))
      else
        ask("The chart has a #{@pa.item_name} prescription from #{written.strftime('%m/%d/%Y')}. Whether the patient has taken it " \
            "continuously for 4 months is not in the chart's structured data: check the last visit note, or ask the prescriber's office.")
      end
    end

    def prior_prescription(item, drug)
      earlier = drug_history(drug).min_by { |rx| rx["authoredOn"].to_s }
      if earlier
        yes_no(true, rx_source(earlier, "MedicationRequest", "#{drug} prescribed #{earlier['authoredOn']}"), item)
      else
        source = { kind: "chart", reference: "MedicationRequest?patient=#{@chart.patient_id}", element: "MedicationRequest (all)",
                   in_epic: EPIC.fetch(:order), detail: "No #{drug} prescription in the chart's medication history" }
        yes_no(false, source, item)
      end
    end

    # --- From verified chart quotes -----------------------------------------

    def requirements
      @requirements ||= @pa.requirements.includes(:policy_criterion, evidence: %i[chart_document verified_by]).index_by { |r| r.policy_criterion.position }
    end

    def criterion(item, position, when_met)
      requirement = requirements[position] or return ask("Nothing on this request checks this. Ask the prescriber's office.")
      return not_met(requirement) unless requirement.status == "met"

      option = item.options.find { |o| o[:code] == when_met }
      [ ANSWERED, { codes: [ when_met ], display: option&.dig(:display) || when_met }, quote_source(requirement), nil ]
    end

    def criterion_bmi(item, position)
      requirement = requirements[position] or return ask("Nothing on this request checks this. Ask the prescriber's office.")
      return not_met(requirement) unless requirement.status == "met"

      value = requirement.verified_evidence.filter_map { |e| e.excerpt[/BMI[^0-9]{0,20}(\d{2}(?:\.\d+)?)/i, 1]&.to_f }.first
      return ask("The verified quote for this does not state a BMI number. Ask the prescriber's office for the baseline BMI.") unless value

      range_answer(item, value, quote_source(requirement))
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

    def drug_history(drug) = @chart.medication_history.select { |rx| AdminFields.prescribes?(rx, drug) }

    def problem_list
      @problem_list ||= @chart.conditions.filter_map do |condition|
        coding = Array(condition.dig("code", "coding")).find { |c| c["system"] == ICD10 }
        coding && [ condition, coding["code"] ]
      end
    end

    def range_answer(item, value, source)
      code = if value < 27 then "under-27" elsif value < 30 then "27-29.9" else "30-plus" end
      option = item.options.find { |o| o[:code] == code }
      coded(code, option&.dig(:display) || code, source)
    end

    def yes_no(value, source, item = nil)
      code = value ? "yes" : "no"
      display = item&.options&.find { |o| o[:code] == code }&.dig(:display) || code.capitalize
      coded(code, display, source)
    end

    def coded(code, display, source) = [ ANSWERED, { codes: [ code ], display: display }, source, nil ]

    def ask(reason) = [ ASK, nil, nil, reason ]

    def check(reason) = [ CHECK, nil, nil, reason ]

    def no_prescription = check("No active prescription for #{@pa.item_name} in the chart. Check the order.")

    def chart_source(reference, element, epic, detail)
      { kind: "chart", reference: reference, element: element, in_epic: EPIC.fetch(epic), detail: detail }
    end

    def rx_source(rx, element, detail) = chart_source("MedicationRequest/#{rx['id']}", element, :order, detail)

    def number(value) = value.to_f == value.to_i ? value.to_i : value
  end
end
