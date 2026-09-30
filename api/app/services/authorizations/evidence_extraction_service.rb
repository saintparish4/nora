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
    MAX_RULE_HITS_PER_CRITERION = 5
    BMI_PATTERN = /\bBMI\b[^0-9\n]{0,24}(\d{2}(?:\.\d{1,2})?)/i

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

      Respond with a JSON object:
      {"criteria": [{"criterion_id": "C1", "findings": [{"document_id": "D1", "quote": "...", "confidence": 0.0, "rationale": "..."}], "summary": "one sentence on what was found or what is missing"}]}
      confidence is 0 to 1: how directly the quote documents the criterion.
    PROMPT

    Piece = Struct.new(:ref, :document, :redactor, :offset, :text)

    def self.call(...) = new(...).call

    def initialize(prior_authorization, actor: nil, ai_client: nil)
      @pa = prior_authorization
      @actor = actor
      @ai_client = ai_client
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

      if @ai_client.nil? && !Ai::Client.configured?
        # Development without a key: say so rather than failing. Requirements
        # with no rule hits are unclear, not missing, because nobody looked.
        finish!(requirements, ai_failed: true, succeeded: true,
                              error: "Model pass skipped because OPENAI_API_KEY is not set. Only rule-based evidence was found.")
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
      requirements.each do |requirement|
        criterion = requirement.policy_criterion
        hits = []

        if (min = criterion.bmi_min)
          documents.each do |doc|
            doc.body.to_enum(:scan, BMI_PATTERN).each do
              m = Regexp.last_match
              next unless m[1].to_f >= min

              hits << [ doc, *sentence_range(doc.body, m.begin(0)), 0.9, "Documented BMI #{m[1]} meets the #{min} threshold." ]
            end
          end
        end

        criterion.terms.each do |term|
          pattern = /(?<![\w.])#{Regexp.escape(term)}(?![\w])/i
          documents.each do |doc|
            doc.body.to_enum(:scan, pattern).each do
              m = Regexp.last_match
              hits << [ doc, *sentence_range(doc.body, m.begin(0)), 0.6, "Mentions \"#{term}\"." ]
            end
          end
        end

        hits.uniq { |h| [ h[0].id, h[1], h[2] ] }.first(MAX_RULE_HITS_PER_CRITERION).each do |doc, start, finish, confidence, rationale|
          add_evidence(requirement, doc, start, finish, source: "rule", confidence: confidence, rationale: rationale)
        end
      end
    end

    # The sentence around `index`: back to the previous sentence end or line
    # break, forward to the next one. Offsets are into the original body.
    def sentence_range(body, index)
      start = body.rindex(/[.!?]\s|\n/, index)
      start = start ? start + 1 : 0
      start += 1 while start < body.length && body[start].match?(/\s/)

      finish = body.index(/[.!?](\s|\z)|\n/, index)
      finish = finish ? finish + (body[finish] == "\n" ? 0 : 1) : body.length
      finish -= 1 while finish > start && body[finish - 1].match?(/\s/)
      [ start, finish ]
    end

    # --- Pass 2: model ------------------------------------------------------

    def ai_pass(requirements, documents)
      criteria = requirements.map.with_index(1) { |req, i| [ "C#{i}", req ] }.to_h
      pieces = build_pieces(documents)

      chunk_pieces(pieces).each do |chunk|
        response = ai_client.complete_json(system: SYSTEM_PROMPT, user: user_prompt(criteria, chunk), max_tokens: 4_000)
        apply_response(response, criteria, chunk)
      end
    end

    def ai_client
      @ai_client ||= Ai::Client.new
    end

    def build_pieces(documents)
      coverage = @pa.patient_coverage
      counter = 0
      documents.flat_map do |doc|
        redactor = Chart::Redactor.new(doc.body, patient: @pa.patient, coverage: coverage)
        split_text(redactor.text).map do |offset, text|
          counter += 1
          Piece.new("D#{counter}", doc, redactor, offset, text)
        end
      end
    end

    # Split an over-long document on paragraph breaks so no piece exceeds the
    # per-call budget. Returns [offset, text] pairs.
    def split_text(text)
      return [ [ 0, text ] ] if text.length <= MAX_CHARS_PER_CALL

      parts = []
      start = 0
      while start < text.length
        finish = [ start + MAX_CHARS_PER_CALL, text.length ].min
        if finish < text.length
          brk = text.rindex("\n\n", finish) || text.rindex("\n", finish)
          finish = brk + 1 if brk && brk > start
        end
        parts << [ start, text[start...finish] ]
        start = finish
      end
      parts
    end

    def chunk_pieces(pieces)
      chunks = [ [] ]
      size = 0
      pieces.each do |piece|
        if size + piece.text.length > MAX_CHARS_PER_CALL && chunks.last.any?
          chunks << []
          size = 0
        end
        chunks.last << piece
        size += piece.text.length
      end
      chunks
    end

    def user_prompt(criteria, chunk)
      lines = [ "Item requested: #{@pa.item_name}", "", "CRITERIA" ]
      criteria.each { |ref, req| lines << "#{ref}: #{req.policy_criterion.text}" }
      lines << "" << "DOCUMENTS"
      chunk.each do |piece|
        doc = piece.document
        lines << "=== #{piece.ref} | #{doc.kind} | #{doc.occurred_on || 'undated'} | #{doc.title} ==="
        lines << piece.text << ""
      end
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

          piece = chunk.find { |p| p.ref == finding["document_id"].to_s }
          range = piece && QuoteLocator.locate(piece.text, finding["quote"])
          original = range && piece.redactor.original_range(piece.offset + range[0], piece.offset + range[1])
          if original.nil?
            @stats[:unverifiable_quotes] += 1
            next
          end

          confidence = finding["confidence"].to_f.clamp(0.0, 1.0)
          add_evidence(requirement, piece.document, *original, source: "ai", confidence: confidence,
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
