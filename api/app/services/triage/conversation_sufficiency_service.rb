module Triage
  # Determines whether a symptom conversation contains enough detail to run
  # a full analysis, or whether we should ask a follow-up question.
  #
  # Uses a lightweight OpenAI call to decide. Falls back to heuristics if
  # the API is unavailable.
  class ConversationSufficiencyService
    MIN_FIRST_MESSAGE_LENGTH = 30

    def initialize(conversation)
      @conversation = conversation
      @client = OpenAI::Client.new
    end

    # Returns { sufficient: true/false, follow_up_question: "..." }
    def check
      messages = @conversation.conversation_messages.ordered

      user_messages = messages.select { |m| m.role == 'user' }

      # If the very first user message is too short, skip the LLM call
      if user_messages.size == 1 && user_messages.first.content.length < MIN_FIRST_MESSAGE_LENGTH
        return {
          sufficient: false,
          follow_up_question: "Could you provide a bit more detail? For example, describe your primary symptom and how long you've been experiencing it."
        }
      end

      # After two or more user messages we have enough context to analyze.
      # This keeps costs down — most conversations resolve in 1–2 turns.
      if user_messages.size >= 2
        return { sufficient: true, follow_up_question: nil }
      end

      # For a single longer message, use a quick LLM check
      llm_sufficiency_check(messages)
    rescue StandardError => e
      Rails.logger.error "Sufficiency check failed: #{e.message}"
      # Heuristic fallback: if we have ≥50 chars and a time reference, consider sufficient
      heuristic_check(user_messages)
    end

    private

    def llm_sufficiency_check(messages)
      transcript = messages.map { |m| "#{m.role}: #{m.content}" }.join("\n")

      response = @client.chat(
        parameters: {
          model: "gpt-4o-mini",
          messages: [
            { role: 'system', content: sufficiency_system_prompt },
            { role: 'user', content: transcript }
          ],
          temperature: 0.1,
          max_tokens: 200
        }
      )

      content = response.dig('choices', 0, 'message', 'content')
      content = content.gsub(/```json\n?/, '').gsub(/```\n?/, '').strip
      parsed = JSON.parse(content)

      {
        sufficient: parsed['sufficient'] == true,
        follow_up_question: parsed['follow_up_question']
      }
    rescue JSON::ParserError
      # If we can't parse, assume not sufficient and ask a generic follow-up
      {
        sufficient: false,
        follow_up_question: "Could you share a bit more about your symptoms? For instance, how long have you been feeling this way and is it getting worse?"
      }
    end

    def heuristic_check(user_messages)
      combined = user_messages.map(&:content).join(' ')
      has_duration = combined.match?(/\b(day|week|month|hour|morning|yesterday|ago|since|started)\b/i)
      long_enough = combined.length >= 50

      if long_enough && has_duration
        { sufficient: true, follow_up_question: nil }
      else
        {
          sufficient: false,
          follow_up_question: "To help you better, could you tell me how long you've been experiencing these symptoms and whether they're constant or come and go?"
        }
      end
    end

    def sufficiency_system_prompt
      <<~PROMPT
        You are a medical intake assistant. Given a patient conversation transcript,
        determine if there is enough information to recommend a medical specialty.

        Sufficient means the patient has described:
        1. At least one specific symptom
        2. Some indication of duration or timing

        Respond ONLY with valid JSON:
        {
          "sufficient": true or false,
          "follow_up_question": "question to ask if not sufficient, or null if sufficient"
        }
      PROMPT
    end
  end
end
