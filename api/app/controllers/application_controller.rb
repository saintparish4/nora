class ApplicationController < ActionController::API
    include ActionController::Cookies
    include PhiAccessLoggable

    before_action :authenticate_request

    private

    def authenticate_request
        # Try session auth first (NextJs frontend)
        if session[:user_id]
            @current_user = User.find_by(id: session[:user_id])
            return if @current_user
        end

        # Fallback to JWT auth (for mobile/API clients)
        header = request.headers['Authorization']
        if header.present?
            token = header.split(' ').last
            decoded = JsonWebToken.decode(token)
            @current_user = User.find_by(id: decoded[:user_id]) if decoded 
        end 

        render json: { error: 'Unauthorized' }, status: :unauthorized unless @current_user
    rescue ActiveRecord::RecordNotFound
        render json: { error: 'User not found' }, status: :unauthorized
    end
    def current_user
        @current_user
    end
end
