module Api
  module V1
    # The policy library: criteria per item and payer. Reference data, no PHI.
    class PolicyTemplatesController < ApplicationController
      # GET /api/v1/policy_templates
      def index
        templates = PolicyTemplate.includes(:payer).order(:item_name, :payer_id)
        render json: {
          policy_templates: templates.map(&:as_api_json),
          items: templates.map(&:item_name).uniq.sort
        }
      end

      # GET /api/v1/policy_templates/:id
      def show
        template = PolicyTemplate.includes(:payer, :criteria).find(params[:id])
        render json: { policy_template: template.as_api_json(include_criteria: true) }
      end
    end
  end
end
