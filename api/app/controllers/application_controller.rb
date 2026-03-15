class ApplicationController < ActionController::API
    include ActionController::Cookies
    include PhiAccessLoggable

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

    # For lograge: add request_id, ip, user_id to the request payload (production JSON logs).
    def append_info_to_payload(payload)
      super
      payload[:request_id] = request.request_id
      payload[:ip] = request.remote_ip
      payload[:user_id] = current_user&.id
    end

    private

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
