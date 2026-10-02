module Ai
  # The one place Nora talks to a language model. Services ask for JSON and get
  # a Hash back, or an Ai::Client::Error; they never see the vendor SDK.
  #
  # Chart text is PHI. In production the client refuses to run until
  # AI_PHI_BAA_CONFIRMED=true records that a BAA with zero data retention is in
  # place for the configured key. The one exception is the demo practice,
  # whose charts are synthetic and, in production, cannot be added to.
  # Prompts are never logged; token counts are.
  class Client
    class Error < StandardError; end
    class NotConfigured < Error; end

    DEFAULT_MODEL = "gpt-4o-mini".freeze
    DEFAULT_TIMEOUT = 60

    def self.configured?
      ENV["OPENAI_API_KEY"].present?
    end

    # Whether a model call for this practice would be allowed to run.
    def self.available_for?(organization)
      unavailable_reason(organization).nil?
    end

    # @return [String, nil] why a model call would be refused, in words a
    #   person can act on, or nil when it would run
    def self.unavailable_reason(organization)
      return "OPENAI_API_KEY is not set." unless configured?
      return nil unless Rails.env.production?
      return nil if ENV["AI_PHI_BAA_CONFIRMED"] == "true" || organization&.demo?

      "This server has no business associate agreement on record for the model provider."
    end

    # @param synthetic_data [Boolean] the caller vouches that everything it
    #   will send is synthetic (the demo practice). Lifts the BAA requirement.
    def initialize(model: ENV.fetch("OPENAI_MODEL", DEFAULT_MODEL), sdk: nil, synthetic_data: false)
      @model = model
      @sdk = sdk
      @synthetic_data = synthetic_data
    end

    # @param system [String] instructions
    # @param user [String] the task input
    # @return [Hash] the parsed JSON object the model returned
    def complete_json(system:, user:, temperature: 0.1, max_tokens: 2_000)
      assert_allowed!

      response = sdk.chat(parameters: {
        model: @model,
        temperature: temperature,
        max_tokens: max_tokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })

      log_usage(response)
      content = response.dig("choices", 0, "message", "content")
      raise Error, "empty response" if content.blank?

      parsed = JSON.parse(content)
      raise Error, "response was not a JSON object" unless parsed.is_a?(Hash)

      parsed
    rescue JSON::ParserError => e
      raise Error, "unparseable response: #{e.message}"
    rescue Error
      raise
    rescue StandardError => e
      raise Error, "#{e.class}: #{e.message}"
    end

    private

    def sdk
      @sdk ||= OpenAI::Client.new(request_timeout: DEFAULT_TIMEOUT)
    end

    def assert_allowed!
      raise NotConfigured, "OPENAI_API_KEY is not set" if @sdk.nil? && !self.class.configured?
      return unless Rails.env.production?
      return if ENV["AI_PHI_BAA_CONFIRMED"] == "true" || @synthetic_data

      raise NotConfigured, "AI_PHI_BAA_CONFIRMED must be true before chart text is sent to a model"
    end

    def log_usage(response)
      usage = response["usage"] || {}
      Rails.logger.info({
        event: "ai_completion",
        model: @model,
        prompt_tokens: usage["prompt_tokens"],
        completion_tokens: usage["completion_tokens"]
      }.to_json)
    end
  end
end
