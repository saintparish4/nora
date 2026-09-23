module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_request, only: [ :login, :signup, :refresh, :csrf ]

      # These three carry their own proof. refresh presents a secret an
      # attacker cannot know; csrf is a safe read that hands the token out;
      # login and signup have no session to protect yet.
      skip_forgery_protection only: [ :login, :signup, :refresh, :csrf ]

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
          session[:user_id] = user.id

          render json: {
            user: user.as_json(only: USER_FIELDS),
            message: "Account created successfully"
          }.merge(api_client_credentials(user)), status: :created
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
        session[:user_id] = user.id

        render json: {
          user: user.as_json(only: USER_FIELDS),
          message: "Logged in successfully"
        }.merge(api_client_credentials(user))
      end

      # GET /api/v1/auth/csrf
      #
      # The browser path authenticates with an httpOnly cookie it cannot read,
      # so it needs a token it *can* read to prove a request came from our own
      # page rather than someone else's.
      def csrf
        render json: { csrf_token: form_authenticity_token }
      end

      # POST /api/v1/auth/refresh
      #
      # Non-browser clients only. Exchanges a refresh token for a fresh access
      # token, rotating the refresh token in the process so a stolen one is
      # good for a single call.
      def refresh
        presented = params[:refresh_token].to_s
        record = RefreshToken.find_by_raw(presented)

        if record.nil?
          return render json: { error: "Invalid refresh token" }, status: :unauthorized
        end

        # Already rotated, and presented again. Either it leaked or the client
        # is replaying, and there is no way to tell which apart. Assume the
        # worse one and end every session the user has.
        if record.revoked_at.present?
          RefreshToken.revoke_all_for!(record.user, reason: "refresh_token_reuse")
          return render json: {
            error: "Refresh token has already been used. All sessions have been signed out.",
            code: "refresh_token_reuse"
          }, status: :unauthorized
        end

        unless record.active?
          return render json: { error: "Refresh token has expired" }, status: :unauthorized
        end

        raw, _successor = record.rotate!(
          user_agent: request.user_agent,
          ip_address: request.remote_ip
        )

        render json: {
          token: JsonWebToken.encode(user_id: record.user_id),
          refresh_token: raw,
          expires_in: JsonWebToken::ACCESS_TOKEN_TTL.to_i,
          user: record.user.as_json(only: USER_FIELDS)
        }
      end

      # DELETE /api/v1/auth/logout
      def logout
        # Clearing the cookie is not enough on its own: a refresh token issued
        # to this account would still mint access tokens afterwards.
        RefreshToken.revoke_all_for!(current_user, reason: "logout") if current_user

        reset_session
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

      # Bearer credentials are handed out only when a client explicitly says it
      # is not a browser. The web app authenticates with the httpOnly session
      # cookie and must never receive a token, because anything JavaScript can
      # read, an XSS can steal.
      #
      # Opt in with `X-Client-Type: api`.
      def api_client_credentials(user)
        return {} unless api_client?

        raw, _record = RefreshToken.issue!(
          user: user,
          user_agent: request.user_agent,
          ip_address: request.remote_ip
        )

        {
          token: JsonWebToken.encode(user_id: user.id),
          refresh_token: raw,
          expires_in: JsonWebToken::ACCESS_TOKEN_TTL.to_i
        }
      end

      def api_client?
        request.headers["X-Client-Type"].to_s.casecmp?("api")
      end

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
