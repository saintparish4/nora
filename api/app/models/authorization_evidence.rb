# A verbatim excerpt of a chart document offered in support of a requirement.
#
# The excerpt must equal document.body[start_offset...end_offset]. That is the
# guard against a fabricated citation: whatever proposed it, a rule, the model,
# or a person, the text has to exist in the chart at the stated place.
class AuthorizationEvidence < ApplicationRecord
  self.table_name = "authorization_evidence"

  SOURCES = %w[rule ai human].freeze

  belongs_to :authorization_requirement
  belongs_to :chart_document
  belongs_to :verified_by, class_name: "User", optional: true
  belongs_to :rejected_by, class_name: "User", optional: true
  has_one :prior_authorization, through: :authorization_requirement

  validates :extracted_by, inclusion: { in: SOURCES }
  validates :excerpt, presence: true
  validates :start_offset, :end_offset, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :confidence, numericality: { in: 0..1 }, allow_nil: true
  validate :excerpt_matches_document
  validate :document_belongs_to_patient
  validate :not_both_verified_and_rejected

  scope :live, -> { where(rejected_at: nil) }

  def verified?
    verified_at.present? && rejected_at.nil?
  end

  def rejected?
    rejected_at.present?
  end

  def as_api_json
    {
      id: id,
      requirement_id: authorization_requirement_id,
      document: { id: chart_document.id, title: chart_document.title, kind: chart_document.kind, occurred_on: chart_document.occurred_on },
      excerpt: excerpt,
      start_offset: start_offset,
      end_offset: end_offset,
      confidence: confidence&.to_f,
      extracted_by: extracted_by,
      rationale: rationale,
      verified: verified?,
      verified_by: verified_by&.as_member_json,
      verified_at: verified_at,
      rejected: rejected?,
      rejected_at: rejected_at
    }
  end

  private

  def excerpt_matches_document
    return if chart_document.nil? || excerpt.blank? || start_offset.nil? || end_offset.nil?
    return if end_offset > start_offset && chart_document.body[start_offset...end_offset] == excerpt

    errors.add(:excerpt, "must match the document text at the given offsets")
  end

  def document_belongs_to_patient
    pa = authorization_requirement&.prior_authorization
    return if pa.nil? || chart_document.nil? || chart_document.patient_id == pa.patient_id

    errors.add(:chart_document, "must belong to the prior authorization's patient")
  end

  def not_both_verified_and_rejected
    errors.add(:base, "evidence cannot be both verified and rejected") if verified_at.present? && rejected_at.present?
  end
end
