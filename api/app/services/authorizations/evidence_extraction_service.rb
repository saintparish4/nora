module Authorizations
  # Proposes chart evidence for each requirement of a prior authorization.
  #
  # Two passes, in this order:
  #
  # 1. Rules. Criterion hints (BMI thresholds, terms, ICD-10 codes, drug names)
  #    find candidate sentences deterministically, so the obvious evidence never
  #    depends on the model.
  # 2. Model. Documents go to Ai::Client with the patient's identifiers
  #    redacted. It is asked for verbatim quotes, and any quote that cannot be
  #    found in the chart is thrown away and counted.
  #
  # Nothing here marks a requirement met. A requirement with evidence becomes
  # pending (a person has to verify it); one without becomes missing, or
  # unclear if the model could not be asked. Requirements a person has already
  # reviewed are left alone. Nothing is cached, so a failed run never sticks.
  class EvidenceExtractionService
    MAX_CHARS_PER_CALL = 60_000

    SYSTEM_PROMPT = <<~PROMPT.freeze
      You help medical office staff prepare a prior authorization request.
      You are given payer criteria and excerpts of one patient's chart.
      For each criterion, find passages in the documents that document the facts the criterion asks about.

      Rules:
      - Quote the document text exactly, character for character. Do not paraphrase, summarize, or fix typos.
      - Each quote is one to three consecutive sentences from a single document.
      - Only quote text that is actually in the documents. If nothing documents the criterion, return no findings.
      - Do not judge medical necessity or whether the request should be approved. Only locate documentation.
      - Placeholders such as [PATIENT], [MRN], [DOB] and [MEMBER_ID] stand for redacted identifiers; quote them as they appear.
      - Each document is headed with its date, and the request date is given. When a criterion sets a time limit ("within the last 6 months", "for at least 6 months before this request"), count from the request date and do not quote a passage that falls outside it.
      - A medication that is only listed, filled, prescribed, or discussed is not a documented trial. Quote it for a trial criterion only when the passage also says how it went or why it was stopped.

      Respond with a JSON object:
      {"criteria": [{"criterion_id": "C1", "findings": [{"document_id": "D1", "quote": "...", "confidence": 0.0, "rationale": "..."}], "summary": "one sentence on what was found or what is missing"}]}
      confidence is 0 to 1: how directly the quote documents the criterion.
    PROMPT

    def self.call(...) = new(...).call

    # @param model_pass [Boolean] false runs the rule pass alone, whatever key
    #   is configured. The demo seeds use it so they never call a model.
    def initialize(prior_authorization, actor: nil, ai_client: nil, model_pass: true)
      @pa = prior_authorization
      @actor = actor
      @ai_client = ai_client
      @model_pass = model_pass
      @stats = { rule: 0, ai: 0, unverifiable_quotes: 0, duplicates: 0 }
    end

    def call
      documents = @pa.patient.chart_documents.order(:occurred_on, :id).to_a
      requirements = @pa.requirements.includes(:policy_criterion, :evidence).to_a

      if documents.empty?
        finish!(requirements, ai_failed: true, error: "Add chart documents for this patient before extracting evidence.")
        return @pa
      end

      rule_pass(requirements, documents)

      unless @model_pass
        finish!(requirements, ai_failed: true, succeeded: true,
                              error: "Only the rule pass has run on this request. Run extraction again to add the model pass.")
        return @pa
      end

      if @ai_client.nil? && !Ai::Client.available_for?(@pa.organization)
        # No key, or a production server with no BAA on record: say so rather
        # than failing. Requirements with no rule hits are unclear, not
        # missing, because nobody looked.
        finish!(requirements, ai_failed: true, succeeded: true, error: "Model pass skipped: #{Ai::Client.unavailable_reason(@pa.organization)} " \
                                                                       "Only rule-based evidence was found.")
        return @pa
      end

      ai_error = nil
      begin
        ai_pass(requirements, documents)
      rescue Ai::Client::Error => e
        ai_error = e.message
      end

      finish!(requirements, ai_failed: ai_error.present?, error: ai_error && "The model pass failed (#{ai_error}). Rule-based evidence was kept.")
      @pa
    end

    private

    # --- Pass 1: rules ------------------------------------------------------

    def rule_pass(requirements, documents)
      rules = RulePass.new(documents: documents, request_date: @pa.created_at.to_date)
      requirements.each do |requirement|
        rules.hits_for(requirement.policy_criterion).each do |hit|
          add_evidence(requirement, hit.document, hit.start, hit.finish, source: "rule", confidence: hit.confidence, rationale: hit.rationale)
        end
      end
    end

    # --- Pass 2: model ------------------------------------------------------

    def ai_pass(requirements, documents)
      criteria = requirements.map.with_index(1) { |req, i| [ "C#{i}", req ] }.to_h
      chart = RedactedChart.new(documents, patient: @pa.patient, coverage: @pa.patient_coverage, max_chars: MAX_CHARS_PER_CALL)

      chart.chunks.each do |chunk|
        response = ai_client.complete_json(system: SYSTEM_PROMPT, user: user_prompt(criteria, chunk), max_tokens: 4_000)
        apply_response(response, criteria, chunk)
      end
    end

    def ai_client
      @ai_client ||= Ai::Client.new(synthetic_data: @pa.organization.demo?)
    end

    def user_prompt(criteria, chunk)
      lines = [ "Item requested: #{@pa.item_name}", "Request date: #{@pa.created_at.to_date.iso8601}", "", "CRITERIA" ]
      criteria.each { |ref, req| lines << "#{ref}: #{req.policy_criterion.text}" }
      lines << "" << "DOCUMENTS" << RedactedChart.render(chunk)
      lines.join("\n")
    end

    def apply_response(response, criteria, chunk)
      Array(response["criteria"]).each do |entry|
        next unless entry.is_a?(Hash)

        requirement = criteria[entry["criterion_id"].to_s]
        next unless requirement

        summary = entry["summary"].to_s.strip.truncate(500)
        requirement.update!(ai_summary: summary) if summary.present?

        Array(entry["findings"]).each do |finding|
          next unless finding.is_a?(Hash)

          document, start, finish = RedactedChart.locate(chunk, finding["document_id"], finding["quote"])
          if document.nil?
            @stats[:unverifiable_quotes] += 1
            next
          end

          confidence = finding["confidence"].to_f.clamp(0.0, 1.0)
          add_evidence(requirement, document, start, finish, source: "ai", confidence: confidence,
                                                             rationale: finding["rationale"].to_s.strip.truncate(500).presence)
        end
      end
    end

    # --- Shared -------------------------------------------------------------

    def add_evidence(requirement, document, start, finish, source:, confidence:, rationale:)
      duplicate = requirement.evidence.any? do |ev|
        ev.chart_document_id == document.id && ev.start_offset < finish && start < ev.end_offset
      end
      if duplicate
        @stats[:duplicates] += 1
        return
      end

      requirement.evidence.create!(
        chart_document: document,
        excerpt: document.body[start...finish],
        start_offset: start,
        end_offset: finish,
        confidence: confidence,
        extracted_by: source,
        rationale: rationale
      )
      @stats[source.to_sym] += 1
    end

    def finish!(requirements, ai_failed:, error:, succeeded: !ai_failed)
      PriorAuthorization.transaction do
        requirements.each do |requirement|
          next if requirement.reviewed_at.present?

          requirement.evidence.reset
          status =
            if requirement.evidence.any? { |ev| !ev.rejected? } then "pending"
            elsif ai_failed then "unclear"
            else "missing"
            end
          requirement.update!(status: status) if requirement.status != status
        end

        @pa.update!(extraction_status: succeeded ? "succeeded" : "failed", extraction_error: error, extracted_at: Time.current)
        WorkflowEvent.record!(subject: @pa, event_type: succeeded ? "extraction_succeeded" : "extraction_failed",
                              actor: @actor, payload: @stats.merge(error: error).compact)
        Tasks::SyncService.call(@pa, actor: @actor)
        StatusSyncService.call(@pa, actor: @actor)
      end
    end
  end
end
