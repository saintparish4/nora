# frozen_string_literal: true

# Sentry error tracking. Configure via SENTRY_DSN (optional in dev/test).
# https://docs.sentry.io/platforms/ruby/guides/rails/
return unless ENV["SENTRY_DSN"].present?

Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]
  config.environment = Rails.env
  config.release = ENV["SENTRY_RELEASE"] if ENV["SENTRY_RELEASE"].present?

  # Healthcare app: do not send PII (emails, IP, etc.) by default.
  config.send_default_pii = false

  # Sample 10% of performance traces in production.
  config.traces_sample_rate = 0.1

  config.breadcrumbs_logger = %i[active_support_logger http_logger]
end
