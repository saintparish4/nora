class ApplicationController < ActionController::API
    include ActionController::Cookies
    # ActionController::API leaves forgery protection out entirely. The session
    # cookie is SameSite=None so the Next.js app on another origin can use it,
    # which means the browser will attach it to cross-site requests — exactly
    # the condition CSRF exploits. Put the protection back.
    include ActionController::RequestForgeryProtection
    include PhiAccessLoggable

    # Only the cookie path needs this. A JWT in an Authorization header cannot
    # be forged cross-site because the browser never attaches it on its own, so
    # demanding a CSRF token from API clients would be ceremony, not security.
    protect_from_forgery with: :exception, if: :cookie_authenticated_request?

    before_action :authenticate_request

    rescue_from StandardError do |e|
      Sentry.capture_exception(e)
      Rails.logger.error({ event: "unhandled_error", error: e.class.name, message: e.message }.to_json)
      render json: { error: "Internal server error" }, status: :internal_server_error
    end

    rescue_from ActiveRecord::RecordNotFound do
      render json: { error: "Resource not found" }, status: :not_found
    end

    rescue_from ActionController::ParameterMissing do |e|
      render json: { error: "Missing parameter: #{e.param}" }, status: :bad_request
    end

    # Declared after the StandardError handler on purpose: rescue_from checks
    # handlers in reverse declaration order, so an earlier, more specific
    # handler would be shadowed by the catch-all above and surface as a 500.
    rescue_from ActionController::InvalidAuthenticityToken do
      render json: {
        error: "Invalid or missing CSRF token. Fetch one from GET /api/v1/auth/csrf.",
        code: "invalid_csrf_token"
      }, status: :forbidden
    end

    # For lograge: add request_id, ip, user_id to the request payload (production JSON logs).
    def append_info_to_payload(payload)
      super
      payload[:request_id] = request.request_id
      payload[:ip] = request.remote_ip
      payload[:user_id] = current_user&.id
    end

    private

    # True when this request is relying on the session cookie rather than a
    # bearer token, and is doing something worth protecting. Safe verbs are
    # excluded by protect_from_forgery itself.
    def cookie_authenticated_request?
      session[:user_id].present? && request.headers["Authorization"].blank?
    end

    def authenticate_request
        # Try session auth first (NextJs frontend)
        if session[:user_id]
            @current_user = User.find_by(id: session[:user_id])
            return if @current_user
        end

        # Fallback to JWT auth (for mobile/API clients)
        header = request.headers["Authorization"]
        if header.present?
            token = header.split(" ").last
            decoded = JsonWebToken.decode(token)
            @current_user = User.find_by(id: decoded[:user_id]) if decoded
        end

        render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
    rescue ActiveRecord::RecordNotFound
        render json: { error: "User not found" }, status: :unauthorized
    end

    def current_user
        @current_user
    end

    # Attempt to authenticate without requiring it — returns user or nil.
    # Useful for endpoints accessible to both guests and logged-in users.
    def current_user_if_present
        return @_current_user if defined?(@_current_user)

        @_current_user = nil

        if session[:user_id]
            @_current_user = User.find_by(id: session[:user_id])
            return @_current_user if @_current_user
        end

        header = request.headers["Authorization"]
        if header.present?
            token = header.split(" ").last
            decoded = JsonWebToken.decode(token)
            @_current_user = User.find_by(id: decoded[:user_id]) if decoded
        end

        @_current_user
    end
end
