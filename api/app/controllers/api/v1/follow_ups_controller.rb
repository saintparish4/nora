module Api
    module V1
      class FollowUpsController < ApplicationController
        before_action :authenticate_request
        
        # GET /api/v1/follow_ups
        def index
          recommendations = current_user.follow_up_recommendations
                                       .where('scheduled_for <= ?', Time.current)
                                       .order(scheduled_for: :desc)
          
          render json: {
            pending: recommendations.pending,
            unacknowledged: recommendations.unacknowledged
          }
        end
        
        # PATCH /api/v1/follow_ups/:id/acknowledge
        def acknowledge
          recommendation = current_user.follow_up_recommendations.find(params[:id])
          recommendation.acknowledge!
          
          render json: { message: 'Acknowledged', recommendation: recommendation }
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Recommendation not found' }, status: :not_found
        end
      end
    end
  end