class InsurancePlan < ApplicationRecord
  belongs_to :payer
  has_many :patient_coverages, dependent: :restrict_with_error

  validates :name, presence: true, uniqueness: { scope: :payer_id }

  def as_api_json
    { id: id, name: name, plan_type: plan_type, payer_id: payer_id }
  end
end
