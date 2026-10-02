module Authorizations
  # Helps staff with one question from a payer's form: what it is asking in
  # plain words, what the chart says about it, and whether the chart supports
  # an answer.
  #
  # The model writes the explanation and proposes quotes. It does not get the
  # last word on the answer:
  #
  # - a quote that is not in the chart word for word is thrown away,
  # - "supported" stands only if at least one surviving quote supports it,
  # - a suggested answer is passed on only when the answer is supported.
  #
  # Nothing is saved. Staff cite what they want to keep on a requirement.
  class QuestionHelpService
    MAX_QUESTION_LENGTH = 2_000
    MAX_CHART_CHARS = 60_000
    # What the chart can be said to show, weakest claim last.
    ANSWERS = %w[supported mentioned_only conflicting not_documented].freeze

    SYSTEM_PROMPT = <<~PROMPT.freeze
      You help medical office staff answer one question from a payer's prior authorization form, using one patient's chart.

      Do three things:
      1. Say in plain language what the question is asking, as you would to a colleague with no clinical training. Two or three sentences.
      2. List what would count as documentation for it. Short phrases.
      3. Find passages in the documents that bear on it, and say what the chart supports.

      Rules:
      - Quote the document text exactly, character for character. Each quote is one to three consecutive sentences from a single document.
      - Only use what is in the documents. Never infer an outcome, a date, or a diagnosis that is not written.
      - A medication that is only listed, filled, prescribed, or discussed was not necessarily taken, and says nothing about how it went. That is "mentioned_only", not "supported".
      - Each document is headed with its date, and the request date is given. Count time limits from the request date.
      - Do not judge medical necessity or whether the request should be approved.
      - Placeholders such as [PATIENT], [MRN], [DOB] and [MEMBER_ID] stand for redacted identifiers; quote them as they appear.

      Respond with a JSON object:
      {"plain_language": "...", "what_counts": ["..."],
       "findings": [{"document_id": "D1", "quote": "...", "supports": true, "note": "why this passage does or does not answer the question"}],
       "answer": "supported" | "mentioned_only" | "conflicting" | "not_documented",
       "suggested_answer": "one or two sentences staff could put on the form, only if the answer is supported, else empty",
       "ask_clinician": "the specific thing to ask the ordering clinician to document, if anything is missing, else empty"}
    PROMPT

    def self.call(...) = new(...).call

    def initialize(prior_authorization, question:, ai_client: nil)
      @pa = prior_authorization
      @question = question.to_s.strip
      @ai_client = ai_client
    end

    # @return [Hash] the explanation, the verified findings, and the answer
    def call
      raise Error, "Paste the question from the payer's form." if @question.blank?
      raise Error, "That question is too long. Paste one question at a time." if @question.length > MAX_QUESTION_LENGTH
      if @ai_client.nil? && !Ai::Client.available_for?(@pa.organization)
        raise Error, "This needs the model, which is not available here. #{Ai::Client.unavailable_reason(@pa.organization)}"
      end

      documents = @pa.patient.chart_documents.order(:occurred_on, :id).to_a
      raise Error, "Add chart documents for this patient first." if documents.empty?

      chunk = RedactedChart.new(documents, patient: @pa.patient, coverage: @pa.patient_coverage, max_chars: MAX_CHART_CHARS).chunks.first
      response = ai_client.complete_json(system: SYSTEM_PROMPT, user: user_prompt(chunk), max_tokens: 1_500)
      build_result(response, chunk, truncated: chunk.sum { |piece| piece.text.length } < documents.sum { |d| d.body.length } - 200)
    rescue Ai::Client::Error => e
      raise Error, "The model could not answer just now (#{e.message}). Try again."
    end

    private

    def ai_client
      @ai_client ||= Ai::Client.new(synthetic_data: @pa.organization.demo?)
    end

    def user_prompt(chunk)
      [ "Item requested: #{@pa.item_name}", "Request date: #{@pa.created_at.to_date.iso8601}", "",
        "QUESTION FROM THE PAYER'S FORM", @question, "", "DOCUMENTS", RedactedChart.render(chunk) ].join("\n")
    end

    def build_result(response, chunk, truncated:)
      dropped = 0
      findings = Array(response["findings"]).filter_map do |finding|
        next unless finding.is_a?(Hash)

        document, start, finish = RedactedChart.locate(chunk, finding["document_id"], finding["quote"])
        if document.nil?
          dropped += 1
          next
        end

        {
          document: { id: document.id, title: document.title, kind: document.kind, occurred_on: document.occurred_on },
          excerpt: document.body[start...finish], start_offset: start, end_offset: finish,
          supports: finding["supports"] == true, note: finding["note"].to_s.strip.truncate(400).presence
        }
      end
      answer = settle(response["answer"].to_s, findings)

      {
        question: @question,
        plain_language: response["plain_language"].to_s.strip.truncate(1_200),
        what_counts: Array(response["what_counts"]).map { |item| item.to_s.strip.truncate(200) }.compact_blank.first(8),
        answer: answer,
        findings: findings,
        suggested_answer: answer == "supported" ? response["suggested_answer"].to_s.strip.truncate(800).presence : nil,
        ask_clinician: response["ask_clinician"].to_s.strip.truncate(800).presence,
        discarded_quotes: dropped,
        chart_truncated: truncated
      }
    end

    # The strongest claim the verified findings can carry.
    def settle(claimed, findings)
      claimed = "not_documented" unless ANSWERS.include?(claimed)
      return "not_documented" if findings.empty?
      return "mentioned_only" if claimed == "supported" && findings.none? { |finding| finding[:supports] }

      claimed
    end
  end
end
