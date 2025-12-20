class FollowUpRecommendationsJob < ApplicationJob
    queue_as :default
    
    def perform
      # Send due follow-up recommendations
      FollowUpRecommendation.due.each do |recommendation|
        send_recommendation(recommendation)
      end
      
      # Generate new recommendations based on patterns
      User.find_each do |user|
        FollowUpService.detect_symptom_recurrence(user)
      end
    end
    
    private
    
    def send_recommendation(recommendation)
      #  TODO: Send via email or in-app notification
      recommendation.send_now!
      
      # TODO: Could integrate with mailer here
      Rails.logger.info "Sent follow-up recommendation #{recommendation.id} to user #{recommendation.user_id}"
    end
  end