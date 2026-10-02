# One requirement in a policy.
#
# `hint` drives Authorizations::RulePass and is never shown to the model:
#   "terms"                      sentences naming any term are candidates
#   "drugs"                      the same, as groups of names for one drug
#   "requires_outcome"           the sentence must also say how the trial ended
#   "min_distinct"               this many different drugs must qualify
#   "requires_denial"            the sentence must deny it ("not on any GLP-1")
#   "bmi_min"                    a documented BMI at or above this value
#   "bmi_min_with_comorbidity"   a lower BMI that counts when the chart also
#   "comorbidity_terms"            documents one of these conditions
#   "within_months"              only documents this recent count
#   "min_months"                 drop a program dated to less than this long
#   "also_requires"              the chart must also mention one of these
class PolicyCriterion < ApplicationRecord
  KINDS = %w[documented_value diagnosis prior_trial lifestyle other].freeze

  belongs_to :policy_template

  validates :kind, inclusion: { in: KINDS }
  validates :text, presence: true
  validates :position, presence: true, uniqueness: { scope: :policy_template_id }

  def hint
    value = super
    value.is_a?(Hash) ? value : {}
  end

  def terms
    (Array(hint["terms"]) + Array(hint["drugs"]).flatten).map(&:to_s).compact_blank.uniq
  end

  def bmi_min
    value = hint["bmi_min"]
    value.presence && value.to_f
  end

  def as_api_json
    { id: id, position: position, kind: kind, text: text, optional: optional }
  end
end
