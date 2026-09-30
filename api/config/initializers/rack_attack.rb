class Rack::Attack
  # Use Rails.cache as the backing store (backed by solid_cache in this app).
  # In production you may want a dedicated Redis cache store for lower latency.
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new

  # ---------------------------------------------------------------------------
  # Throttles
  # ---------------------------------------------------------------------------

  # AI-powered endpoints are expensive — tight per-IP limits. Add a pattern
  # here for every route that calls Ai::Client.
  AI_PATHS = [
    %r{\A/api/v1/prior_authorizations/\d+/extract\z}
  ].freeze

  throttle("ai/ip", limit: 10, period: 1.minute) do |req|
    req.ip if req.post? && AI_PATHS.any? { |pattern| pattern.match?(req.path) }
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
