class ProviderCondition < ApplicationRecord
  belongs_to :provider

  validates :condition_name, presence: true 
  validates :expertise_level, numericality: { in: 1..5 } 
end


