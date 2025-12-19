class RiskAssessment < ApplicationRecord
  belongs_to :conversation
  belongs_to :user

  CARE_LEVELS = %w[emergency urgent primary specialist wellness].freeze

  validates :care_level, inclusion: { in: CARE_LEVELS }
  validates :confidence, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }

  scope :emergency, -> { where(care_level: 'emergency') }
  scope :high_confidence, -> { where('confidence >= ?', 80) }

  def emergency?
    care_level == 'emergency'
  end 

  def urgent?
    care_level == 'urgent'
  end 
end
