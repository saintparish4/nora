class FollowUpRecommendation < ApplicationRecord
  belongs_to :user
  belongs_to :appointment, optional: true 

  RECOMMENDATION_TYPES = %w[check_in follow_up_appointment prevention_tip symptom_recurrence].freeze

  validates :recommendation_type, inclusion: { in: RECOMMENDATION_TYPES } 

  scope :pending, -> { where(sent_at: nil) }
  scope :due, -> { where('scheduled_for <= ?', Time.current).where(sent_at: nil) }
  scope :unacknowledged, -> { where(acknowledged: false).where.not(sent_at: nil) } 

  def send_now!
    update(sent_at: Time.current)
  end 

  def acknowledge!
    update(acknowledged: true) 
  end 
end
