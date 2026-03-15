require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Api
  class Application < Rails::Application
    config.load_defaults 8.0
    config.autoload_lib(ignore: %w[assets tasks])
    config.api_only = true

    # Enable sessions
    config.session_store :cookie_store,
    key: "_nora_session",
    same_site: :none, # Required for cross-origin cookies
    secure: Rails.env.production?, # HTTPs only in production
    httponly: true # Prevent XSS attacks

    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options
  end
end
