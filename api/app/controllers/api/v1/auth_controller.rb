module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_request, only: [ :login, :signup ]

      # Everything the frontend needs about the signed-in user, in one place so
      # signup, login, me, and the two update actions can't drift apart. The
      # email preference booleans belong here: the settings page reads them off
      # this payload, and without them it silently displayed its own defaults
      # instead of what the patient had saved.
      USER_FIELDS = [
        :id, :email, :first_name, :last_name, :state, :phone,
        :booking_confirmations, :reminders_24h, :cancellation_notices
      ].freeze

      # POST /api/v1/auth/signup
      def signup
        user = User.new(user_params)

        if user.save
          token = JsonWebToken.encode(user_id: user.id)
          session[:user_id] = user.id # Set session

          render json: {
            user: user.as_json(only: USER_FIELDS),
            token: token, # JWT for mobile clients
            message: "Account created successfully"
          }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: params[:email]&.downcase)

        # Answer the same way whether the account is missing or the password is
        # wrong, so this endpoint can't be used to enumerate registered emails.
        if user.nil?
          return render json: { error: "Invalid email or password" }, status: :unauthorized
        end

        if user.locked?
          return render json: {
            error: "Too many failed attempts. Try again in #{(user.lockout_seconds_remaining / 60.0).ceil} minutes.",
            retry_after: user.lockout_seconds_remaining
          }, status: :too_many_requests
        end

        unless user.authenticate(params[:password])
          user.register_failed_login!
          return render json: { error: "Invalid email or password" }, status: :unauthorized
        end

        user.register_successful_login!
        token = JsonWebToken.encode(user_id: user.id)
        session[:user_id] = user.id # Set session

        render json: {
          user: user.as_json(only: USER_FIELDS),
          token: token, # JWT for mobile clients
          message: "Logged in successfully"
        }
      end

      # DELETE /api/v1/auth/logout
      def logout
        session[:user_id] = nil
        render json: { message: "Logged out successfully" }
      end

      # GET /api/v1/auth/me
      def me
        log_phi_access("User", current_user.id, :view)
        render json: { user: current_user.as_json(only: USER_FIELDS) }
      end

      # PATCH /api/v1/auth/preferences
      def update_preferences
        if current_user.update(preference_params)
          log_phi_access("User", current_user.id, :update)
          render json: {
            message: "Preferences updated successfully",
            user: current_user.as_json(only: USER_FIELDS)
          }
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/auth/profile
      def update_profile
        if current_user.update(profile_params)
          log_phi_access("User", current_user.id, :update)
          render json: {
            message: "Profile updated successfully",
            user: current_user.as_json(only: USER_FIELDS)
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

      # Email is deliberately absent: changing it is an identity change that
      # needs a confirmation flow, not a profile field.
      def profile_params
        params.permit(:first_name, :last_name, :state, :phone)
      end
    end
  end
end
