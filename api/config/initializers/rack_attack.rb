class Rack::Attack
  # Use Rails.cache as the backing store (backed by solid_cache in this app).
  # In production you may want a dedicated Redis cache store for lower latency.
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new

  # ---------------------------------------------------------------------------
  # Throttles
  # ---------------------------------------------------------------------------

  # AI-powered endpoints are expensive — tight per-IP limits.
  AI_PATHS = %w[
    /api/v1/analyze-symptoms
    /api/v1/quick-booking/analyze
  ].freeze

  throttle("ai/ip", limit: 10, period: 1.minute) do |req|
    req.ip if AI_PATHS.include?(req.path) && req.post?
  end

  # Conversational chat can be called more frequently but still needs a cap.
  throttle("symptom-chat/ip", limit: 30, period: 1.minute) do |req|
    req.ip if req.path == "/api/v1/symptom-chat/send" && req.post?
  end

  # Auth endpoints — prevent credential stuffing / brute-force.
  throttle("auth/ip", limit: 10, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/v1/auth") && req.post?
  end

  # General API blanket — generous enough for normal use, catches abusers.
  throttle("api/ip", limit: 120, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # ---------------------------------------------------------------------------
  # Response
  # ---------------------------------------------------------------------------

  self.throttled_responder = lambda do |matched, _period, _limit, _count|
    now   = Time.now.utc
    match = matched.to_s

    headers = {
      "Content-Type"  => "application/json",
      "Retry-After"   => "60"
    }

    body = {
      error: "Rate limit exceeded",
      throttle: match,
      retry_after: 60
    }.to_json

    [ 429, headers, [ body ] ]
  end
end
