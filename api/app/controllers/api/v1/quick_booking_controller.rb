module Api
  module V1
    class QuickBookingController < ApplicationController
      before_action :authenticate_request, only: [:book]

      # POST /api/v1/quick-booking/analyze
      # Returns symptom analysis + matching providers + available slots
      def analyze
        description = params[:description]

        if description.blank? || description.length < 10
          return render json: {
            error: 'Please provide more details about your symptoms (at least 10 characters)'
          }, status: :unprocessable_entity
        end

        analyzer = Triage::SymptomAnalyzerService.new(description)
        analysis = analyzer.analyze

        providers_with_slots = Providers::MatchAndSlotService.new(analysis).call

        log_phi_access("SymptomAnalysis", request.request_id, :create)

        render json: {
          analysis: analysis,
          providers: providers_with_slots,
          total_providers: providers_with_slots.size
        }
      rescue StandardError => e
        Rails.logger.error "Quick booking analysis error: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        render json: {
          error: 'Unable to process your request. Please try again.'
        }, status: :internal_server_error
      end

      # POST /api/v1/quick-booking/book
      # Books an appointment in one step
      def book
        provider = Provider.find(params[:provider_id])

        appointment = current_user.appointments.new(
          provider: provider,
          start_time: params[:start_time],
          end_time: params[:end_time],
          notes: params[:notes],
          status: 'confirmed'
        )

        if appointment.save
          log_phi_access("Appointment", appointment.id, :create)

          render json: {
            success: true,
            message: 'Appointment booked successfully!',
            appointment: appointment.as_json.merge(
              provider: appointment.provider.as_detail_json
            )
          }, status: :created
        else
          render json: {
            error: appointment.errors.full_messages.first || 'Failed to book appointment',
            errors: appointment.errors.full_messages
          }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Provider not found' }, status: :not_found
      rescue StandardError => e
        Rails.logger.error "Quick booking error: #{e.message}"
        render json: { error: 'Failed to book appointment' }, status: :internal_server_error
      end
    end
  end
end
