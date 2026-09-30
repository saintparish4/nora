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

  # No active_support_logger breadcrumbs: they carry SQL, and SQL can carry
  # chart text.
  config.breadcrumbs_logger = %i[http_logger]

  # A database error's message is the failing statement, values included. For
  # an insert into chart_documents that is the note itself. Keep the class and
  # drop the message.
  config.before_send = lambda do |event, hint|
    if hint[:exception].is_a?(ActiveRecord::StatementInvalid)
      event.exception&.values&.each { |value| value.value = "#{value.type}: [SQL redacted]" }
    end
    event
  end
end
