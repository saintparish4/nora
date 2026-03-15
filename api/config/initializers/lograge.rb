# frozen_string_literal: true

# Structured JSON request logging in production (single line per request).
# https://github.com/roidrage/lograge
Rails.application.configure do
  config.lograge.enabled = Rails.env.production?
  config.lograge.formatter = Lograge::Formatters::Json.new

  config.lograge.custom_options = lambda do |event|
    {
      request_id: event.payload[:request_id],
      ip: event.payload[:ip],
      user_id: event.payload[:user_id]
    }.compact
  end
end
