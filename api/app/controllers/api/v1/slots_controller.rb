module Api
  module V1
    class SlotsController < ApplicationController
      skip_before_action :authenticate_request, only: [ :available_slots ]

      # GET /api/v1/providers/:id/available_slots
      def available_slots
        provider = Provider.find(params[:id])
        service = Appointments::SlotGeneratorService.new(provider)
        slots = service.generate_available_slots

        # Group slots by date for easier frontend consumption
        grouped_slots = slots.group_by { |slot| slot[:date] }

        render json: {
          provider_id: provider.id,
          provider_name: provider.name,
          slots: grouped_slots,
          total_slots: slots.count,
          date_range: {
            start_date: Date.current.to_s,
            end_date: (Date.current + 14.days).to_s
          }
        }
      end
    end
  end
end
