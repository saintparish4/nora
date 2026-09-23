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

    # Session cookie.
    #
    # SameSite has to differ by environment, and getting it wrong fails
    # silently — the browser simply drops the cookie and the patient looks
    # logged out with nothing in the logs.
    #
    #   production  :none  — the Next.js app and this API are on different
    #                        sites (Vercel and Render), so the cookie has to
    #                        survive a cross-site request. Browsers require
    #                        Secure alongside None, which HTTPS provides.
    #
    #   development :lax   — localhost:3000 and localhost:3001 are the *same*
    #                        site (port is not part of a site), so Lax is both
    #                        sufficient and stricter. None would be rejected
    #                        here: browsers refuse SameSite=None without
    #                        Secure, and dev is plain HTTP.
    #
    # curl does not enforce that rule, so this cannot be caught by hitting the
    # API from a shell — it only shows up in a real browser.
    config.session_store :cookie_store,
    key: "_nora_session",
    same_site: Rails.env.production? ? :none : :lax,
    secure: Rails.env.production?, # HTTPS only in production
    httponly: true # Keep it out of reach of JavaScript, and therefore of XSS

    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options
  end
end
