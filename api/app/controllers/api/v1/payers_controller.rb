module Api
  module V1
    class PayersController < ApplicationController
      # GET /api/v1/payers — reference data, no PHI.
      def index
        render json: { payers: Payer.includes(:insurance_plans).order(:name).map(&:as_api_json) }
      end
    end
  end
end
