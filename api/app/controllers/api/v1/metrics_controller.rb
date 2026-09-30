module Api
  module V1
    class MetricsController < ApplicationController
      # GET /api/v1/metrics — aggregate counts and medians, no PHI.
      def show
        render json: { metrics: Workspace::MetricsService.call(organization: current_organization) }
      end
    end
  end
end
