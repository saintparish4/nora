# One requirement in a policy.
#
# `hint` drives the deterministic pre-pass in
# Authorizations::EvidenceExtractionService and is never shown to the model:
#   "terms"   => ["obesity", "E66"]   sentences mentioning any term are candidates
#   "bmi_min" => 27                   a documented BMI at or above this value
class PolicyCriterion < ApplicationRecord
  KINDS = %w[documented_value diagnosis prior_trial lifestyle other].freeze

  belongs_to :policy_template

  validates :kind, inclusion: { in: KINDS }
  validates :text, presence: true
  validates :position, presence: true, uniqueness: { scope: :policy_template_id }

  def terms
    Array(hint.is_a?(Hash) ? hint["terms"] : nil).map(&:to_s).compact_blank
  end

  def bmi_min
    value = hint.is_a?(Hash) ? hint["bmi_min"] : nil
    value.presence && value.to_f
  end

  def as_api_json
    { id: id, position: position, kind: kind, text: text, optional: optional }
  end
end
