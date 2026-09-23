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

  # Rack::Attack 6 calls this with the request, and nothing else — the old
  # (matched, period, limit, count) signature was removed. With the wrong arity
  # every throttled request raised ArgumentError and came back as a 500, so the
  # JSON 429 below was never actually served. Details come off the request env.
  self.throttled_responder = lambda do |request|
    match_data  = request.env["rack.attack.match_data"] || {}
    period      = match_data[:period].to_i
    retry_after = period.positive? ? period : 60

    headers = {
      "Content-Type" => "application/json",
      "Retry-After"  => retry_after.to_s
    }

    body = {
      error: "Rate limit exceeded",
      throttle: request.env["rack.attack.matched"].to_s,
      retry_after: retry_after
    }.to_json

    [ 429, headers, [ body ] ]
  end
end
