class Payer < ApplicationRecord
  has_many :insurance_plans, dependent: :destroy
  has_many :policy_templates, dependent: :restrict_with_error

  validates :name, presence: true, uniqueness: true

  def as_api_json
    { id: id, name: name, payer_code: payer_code, plans: insurance_plans.sort_by(&:name).map(&:as_api_json) }
  end
end
