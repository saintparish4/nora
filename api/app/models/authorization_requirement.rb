# One policy criterion applied to one prior authorization.
#
# The model never marks a requirement met on its own: `met` needs at least one
# piece of evidence a person has verified.
class AuthorizationRequirement < ApplicationRecord
  STATUSES = %w[pending met missing unclear not_applicable].freeze
  RESOLVED = %w[met not_applicable].freeze

  belongs_to :prior_authorization
  belongs_to :policy_criterion
  belongs_to :reviewed_by, class_name: "User", optional: true
  has_many :evidence, -> { order(:id) }, class_name: "AuthorizationEvidence", dependent: :destroy

  validates :status, inclusion: { in: STATUSES }
  validate :met_requires_verified_evidence
  validate :not_applicable_requires_note

  def resolved?
    RESOLVED.include?(status)
  end

  def verified_evidence
    evidence.select(&:verified?)
  end

  def as_api_json
    {
      id: id,
      status: status,
      note: note,
      ai_summary: ai_summary,
      criterion: policy_criterion.as_api_json,
      reviewed_by: reviewed_by&.as_member_json,
      reviewed_at: reviewed_at,
      evidence: evidence.map(&:as_api_json)
    }
  end

  private

  def met_requires_verified_evidence
    return unless status == "met"
    return if verified_evidence.any?

    errors.add(:status, "can be met only with evidence a person has verified")
  end

  def not_applicable_requires_note
    return unless status == "not_applicable" && note.blank?

    errors.add(:note, "must explain why the requirement does not apply")
  end
end
