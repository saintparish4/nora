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

        # Step 1: Analyze symptoms
        analyzer = Triage::SymptomAnalyzerService.new(description)
        analysis = analyzer.analyze

        # Step 2: Get matching providers based on AI specialty
        ai_specialty = analysis[:specialty]
        matching_specialties = Provider::SPECIALTY_MAPPINGS[ai_specialty] || [analysis[:specialty_name]]
        
        providers = Provider.where(specialty: matching_specialties)
                           .order(rating: :desc)
                           .limit(5)

        # Step 3: Get next available slots for each provider
        providers_with_slots = providers.map do |provider|
          all_slots = Appointments::SlotGeneratorService.new(provider).generate_available_slots
          next_slots = all_slots.take(3) # Get first 3 available slots

          provider.as_json(only: [:id, :name, :specialty, :avatar_url, :rating, :location, :hourly_rate])
                  .merge(next_available_slots: next_slots)
        end

        render json: {
          analysis: analysis,
          providers: providers_with_slots,
          total_providers: providers.count
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
          # Send notifications asynchronously
          begin
            Notifications::NotificationService.send_booking_notifications(appointment)
          rescue => e
            Rails.logger.error("Failed to send booking notifications: #{e.message}")
          end

          render json: {
            success: true,
            message: 'Appointment booked successfully!',
            appointment: appointment.as_json(
              include: {
                provider: { only: [:id, :name, :specialty, :avatar_url, :location, :hourly_rate] }
              }
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
