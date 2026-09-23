# frozen_string_literal: true

# Rack::Attack keeps its counters in a MemoryStore created once at boot, so
# without this every request in the suite accumulates against the same per-IP
# throttle and unrelated examples start failing with 429s once a file gets
# request-heavy. Clearing between examples keeps the middleware enabled (so it
# can be tested on purpose) while isolating each example.
RSpec.configure do |config|
  config.before do
    Rack::Attack.cache.store.clear if defined?(Rack::Attack)
  end
end
