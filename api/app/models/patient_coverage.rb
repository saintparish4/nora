class PatientCoverage < ApplicationRecord
  belongs_to :patient
  belongs_to :insurance_plan
  has_one :payer, through: :insurance_plan

  validates :member_id, presence: true

  def as_api_json
    {
      id: id,
      patient_id: patient_id,
      member_id: member_id,
      group_number: group_number,
      effective_on: effective_on,
      primary: primary,
      plan: { id: insurance_plan.id, name: insurance_plan.name, plan_type: insurance_plan.plan_type },
      payer: { id: insurance_plan.payer.id, name: insurance_plan.payer.name }
    }
  end
end
