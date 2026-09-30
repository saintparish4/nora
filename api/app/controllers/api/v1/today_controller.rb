module Api
  module V1
    class TodayController < ApplicationController
      # GET /api/v1/today
      def show
        data = Workspace::TodayService.call(organization: current_organization, user: current_user)
        ids = data[:needs_attention].map { |i| i[:prior_authorization][:id] }
        log_phi_access_batch("PriorAuthorization", ids, :view)
        render json: data
      end
    end
  end
end
