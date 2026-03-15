module Triage
  class SymptomAnalyzerService
    SPECIALTIES = {
      "primary_care" => "Primary Care",
      "cardiology" => "Cardiology",
      "dermatology" => "Dermatology",
      "urgent_care" => "Urgent Care",
      "emergency" => "Emergency Room",
      "mental_health" => "Mental Health Counseling",
      "pediatrics" => "Pediatrics",
      "gynecology" => "Gynecology",
      "oncology" => "Oncology",
      "orthopedics" => "Orthopedics",
      "physical_therapy" => "Physical Therapy",
      "nutrition" => "Nutrition Counseling"
    }.freeze

    URGENCY_LEVELS = {
      "routine" => { priority: 1, color: "green", message: "Schedule within 1-2 weeks" },
      "urgent" => { priority: 2, color: "orange", message: "Schedule within 24-48 hours" },
      "emergency" => { priority: 3, color: "red", message: "Seek immediate medical attention" }
    }.freeze

    # @param description [String]  symptom text (single-shot) or conversation
    #                              transcript (chat flow)
    # @param cacheable   [Boolean] set to false when the description is a
    #                              multi-turn conversation transcript — transcripts
    #                              are effectively unique per session so caching
    #                              wastes memory and returns stale results as the
    #                              conversation evolves. Keep true (default) for
    #                              the single-shot /analyze-symptoms endpoint.
    def initialize(description, cacheable: true)
      @description = description
      @cacheable   = cacheable
      @client      = OpenAI::Client.new
    end

    def analyze
      if @cacheable
        cached_result = check_cache
        return cached_result if cached_result
      end

      result = call_openai_api

      cache_result(result) if result && @cacheable

      result
    end

    private

    def check_cache
      cached = Rails.cache.read(generate_cache_key(@description))
      Rails.logger.info "Cache hit for symptom analysis" if cached
      cached
    end

    def cache_result(result)
      Rails.cache.write(generate_cache_key(@description), result, expires_in: 7.days)
    end

    def generate_cache_key(description)
      # Normalize description for caching
      normalized = description.downcase.strip.gsub(/\s+/, " ")
      "symptom_analysis:#{Digest::MD5.hexdigest(normalized)}"
    end

    def call_openai_api
      prompt = build_prompt

      response = @client.chat(
        parameters: {
          model: "gpt-4o-mini", # Cost-effective model
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.3, # Lower temperature for consistent medical advice
          max_tokens: 500
        }
      )

      parse_response(response)
    rescue StandardError => e
      Rails.logger.error "OpenAI API Error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      # Return safe fallback
      fallback_response
    end

    def system_prompt
      <<~PROMPT
        You are a medical triage assistant helping patients find the right type of healthcare provider.

        Your job is to:
        1. Analyze patient symptoms and determine the most appropriate specialty
        2. Recommend the appropriate medical specialist based on the symptoms
        3. Assess urgency level of the symptoms
        4. Extract key symptoms

        IMPORTANT SAFETY RULES:
        - Always err on the side of caution#{' '}
        - Route chest pain, severe bleeding, difficult breathing to EMERGENCY#{' '}
        - You are NOT diagnosing - only helping with provider matching
        - Be clear about urgency without causing panic#{' '}

        Respond ONLY with valid JSON. No markdown, no explanations outside the JSON.
      PROMPT
    end

    def build_prompt
      <<~PROMPT
         Patient describes their symptoms:
         "#{@description}"

         Analyze and return ONLY this JSON structure:
         {
         "specialty": "primary_care|cardiology|dermatology|urgent_care|emergency|mental_health|pediatrics|gynecology|oncology|orthopedics|physical_therapy|nutrition",
         "urgency": "routine|urgent|emergency",
         "reasoning": "brief explanation of your recommendation",
         "keywords": ["symptom1", "symptom2", "symptom3"],
         "red_flags": ["red_flag1", "red_flag2"] (if any emergency signs present)
         }

         Specialty Guidelines:
         - primary_care: general checkups, common illnesses, chronic condition management
         - cardiology: heart-related symptoms (non-emergency)
         - dermatology: skin conditions, rashes, acne, etc.
         - urgent_care: needs attention within 24-48 hours but not life-threatening or if primary care is not available
         - emergency: chest pain, severe bleeding, difficulty breathing, stroke symptoms, severe allergic reaction, etc.
         - mental_health: anxiety, depression, stress, mood disorders
         - physical_therapy: musculoskeletal pain, joint pain, limited mobility, mobility issues, injury recovery
         - nutrition: diet concerns, weight management, digestive issues


         Urgency Guidelines:
         - routine: can wait 1-2 weeks, preventive care, mild symptoms
         - urgent: needs attention within 24-48 hours, moderate symptoms
         - emergency: life-threatening, severe pain, acute symptoms
      PROMPT
    end

    def parse_response(response)
      content = response.dig("choices", 0, "message", "content")

      # Clean up response (remove markdown code blocks if present)
      content = content.gsub(/```json\n?/, "").gsub(/```\n?/, "").strip

      parsed = JSON.parse(content)

      # Validate and normalize
      {
        specialty: validate_specialty(parsed["specialty"]),
        urgency: validate_urgency(parsed["urgency"]),
        reasoning: parsed["reasoning"] || "Unable to provide reasoning",
        keywords: parsed["keywords"] || [],
        red_flags: parsed["red_flags"] || [],
        specialty_name: SPECIALTIES[validate_specialty(parsed["specialty"])],
        urgency_details: URGENCY_LEVELS[validate_urgency(parsed["urgency"])]
      }
    rescue JSON::ParserError => e
      Rails.logger.error "Failed to parse OpenAI response: #{e.message}"
      fallback_response
    end

    def validate_specialty(specialty)
      SPECIALTIES.key?(specialty) ? specialty : "primary_care"
    end

    def validate_urgency(urgency)
      URGENCY_LEVELS.key?(urgency) ? urgency : "routine"
    end

    def fallback_response
      {
        specialty: "primary_care",
        urgency: "routine",
        reasoning: "For your safety, we recommend consulting a primary care provider.",
        keywords: [],
        red_flags: [],
        specialty_name: "Primary Care",
        urgency_details: URGENCY_LEVELS["routine"]
      }
    end
  end
end
