class ProviderCondition < ApplicationRecord
  belongs_to :provider

  validates :condition_name, presence: true, uniqueness: { scope: :provider_id }
  validates :expertise_level, numericality: {
    only_integer: true,
    in: 1..5,
    allow_nil: true
  }
  validates :cases_treated, numericality: {
    only_integer: true,
    greater_than_or_equal_to: 0
  }
end
