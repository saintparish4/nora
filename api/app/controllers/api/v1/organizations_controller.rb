module Api
  module V1
    class OrganizationsController < ApplicationController
      before_action :require_admin!, only: [ :update ]

      # GET /api/v1/organization
      def show
        render json: { organization: current_organization.as_api_json }
      end

      # PATCH /api/v1/organization
      def update
        if current_organization.update(params.permit(:name, :npi, :timezone))
          render json: { organization: current_organization.as_api_json }
        else
          render json: { errors: current_organization.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end
