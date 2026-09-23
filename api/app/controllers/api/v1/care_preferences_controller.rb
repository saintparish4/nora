module Api
  module V1
    # Care preferences — the patient's standing answers about how they want to
    # be seen (location, times of day, provider gender, languages). Distinct
    # from the email notification toggles on AuthController, which are columns
    # on `users`; these live in their own `user_preferences` row.
    class CarePreferencesController < ApplicationController
      # Arrays are stored as JSON columns, so they are permitted as arrays.
      SCALAR_FIELDS = [ :preferred_location, :insurance_info, :provider_gender_preference ].freeze
      ARRAY_FIELDS  = { preferred_times: [], language_preferences: [] }.freeze

      EXPOSED_FIELDS = [
        :preferred_location, :preferred_times, :insurance_info,
        :provider_gender_preference, :language_preferences
      ].freeze

      # GET /api/v1/care-preferences
      def show
        render json: { care_preferences: serialize(preferences) }
      end

      # PATCH /api/v1/care-preferences
      def update
        record = preferences

        if record.update(care_preference_params)
          log_phi_access("UserPreference", record.id, :update)
          render json: {
            message: "Care preferences updated successfully",
            care_preferences: serialize(record)
          }
        else
          render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      # A patient who has never opened this page has no row yet; build one on
      # demand rather than creating empty rows for every signup.
      def preferences
        current_user.user_preference || current_user.build_user_preference
      end

      def serialize(record)
        {
          preferred_location: record.preferred_location,
          preferred_times: record.preferred_times || [],
          insurance_info: record.insurance_info,
          provider_gender_preference: record.provider_gender_preference,
          language_preferences: record.language_preferences || []
        }
      end

      def care_preference_params
        params.permit(*SCALAR_FIELDS, **ARRAY_FIELDS)
      end
    end
  end
end
