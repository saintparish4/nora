module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_request, only: [:login, :signup]
      
      # POST /api/v1/auth/signup
      def signup
        user = User.new(user_params)
        
        if user.save
          token = JsonWebToken.encode(user_id: user.id)
          session[:user_id] = user.id # Set session
          
          render json: { 
            user: user.as_json(only: [:id, :email, :first_name, :last_name, :state, :phone]),
            token: token, # JWT for mobile clients
            message: 'Account created successfully' 
          }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end
      
      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: params[:email]&.downcase)
        
        if user&.authenticate(params[:password])
          token = JsonWebToken.encode(user_id: user.id)
          session[:user_id] = user.id # Set session
          
          render json: { 
            user: user.as_json(only: [:id, :email]),
            token: token, # JWT for mobile clients
            message: 'Logged in successfully' 
          }
        else
          render json: { error: 'Invalid email or password' }, status: :unauthorized
        end
      end
      
      # DELETE /api/v1/auth/logout
      def logout
        session[:user_id] = nil
        render json: { message: 'Logged out successfully' }
      end
      
      # GET /api/v1/auth/me
      def me
        log_phi_access("User", current_user.id, :view)
        render json: { user: current_user.as_json(only: [:id, :email, :first_name, :last_name, :state, :phone]) }
      end
      
      # PATCH /api/v1/auth/preferences
      def update_preferences
        if current_user.update(preference_params)
          log_phi_access("User", current_user.id, :update)
          render json: {
            message: 'Preferences updated successfully',
            user: current_user.as_json(only: [:id, :email, :booking_confirmations, :reminders_24h, :cancellation_notices])
          }
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end
      
      private
      
      def user_params
        params.permit(:email, :password, :password_confirmation, :first_name, :last_name, :state, :phone)
      end
      
      def preference_params
        params.permit(:booking_confirmations, :reminders_24h, :cancellation_notices)
      end
    end
  end
end
