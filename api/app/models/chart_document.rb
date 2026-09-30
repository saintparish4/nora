# Chart text staff pasted or uploaded. Evidence cites character offsets into
# `body`, so the body is immutable once saved: editing it would silently move
# every citation.
class ChartDocument < ApplicationRecord
  KINDS = %w[office_note problem_list medication_history lab imaging letter other].freeze
  SOURCES = %w[paste upload].freeze
  MAX_BODY_LENGTH = 200_000

  belongs_to :organization
  belongs_to :patient
  belongs_to :uploaded_by, class_name: "User"
  has_many :evidence, class_name: "AuthorizationEvidence", dependent: :restrict_with_error

  validates :kind, inclusion: { in: KINDS }
  validates :source, inclusion: { in: SOURCES }
  validates :title, presence: true, length: { maximum: 200 }
  validates :body, presence: true, length: { maximum: MAX_BODY_LENGTH }
  validate :body_unchanged, on: :update
  validate :patient_in_same_organization

  normalizes :body, with: ->(value) { value.to_s.gsub("\r\n", "\n").strip }

  def as_api_json(include_body: false)
    json = {
      id: id,
      patient_id: patient_id,
      kind: kind,
      title: title,
      occurred_on: occurred_on,
      source: source,
      original_filename: original_filename,
      length: body.length,
      uploaded_by: uploaded_by.as_member_json,
      created_at: created_at
    }
    json[:body] = body if include_body
    json
  end

  private

  def body_unchanged
    errors.add(:body, "cannot change once saved; upload a new document instead") if body_changed?
  end

  def patient_in_same_organization
    return if patient.nil? || patient.organization_id == organization_id

    errors.add(:patient, "must belong to the same organization")
  end
end
