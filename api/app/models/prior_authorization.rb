# A prior authorization request moving from draft to a payer decision.
#
# Status changes go through Authorizations::TransitionService and nowhere else,
# so every change has an actor and a WorkflowEvent. The model enforces that
# with `transitioning`: a status write without it fails validation.
class PriorAuthorization < ApplicationRecord
  STATUSES = %w[
    draft gathering needs_clarification ready_for_review approved submitted
    payer_pending approved_by_payer denied appealed cancelled closed
  ].freeze

  TRANSITIONS = {
    "draft" => %w[gathering cancelled],
    "gathering" => %w[needs_clarification ready_for_review cancelled],
    "needs_clarification" => %w[gathering ready_for_review cancelled],
    "ready_for_review" => %w[approved gathering needs_clarification cancelled],
    "approved" => %w[submitted ready_for_review gathering needs_clarification cancelled],
    "submitted" => %w[payer_pending approved_by_payer denied cancelled],
    "payer_pending" => %w[approved_by_payer denied cancelled],
    "denied" => %w[appealed closed],
    "appealed" => %w[payer_pending approved_by_payer denied closed],
    "approved_by_payer" => %w[closed],
    "cancelled" => %w[closed],
    "closed" => []
  }.freeze

  # Before a person signs off: evidence and requirements may still change.
  PREPARING = %w[draft gathering needs_clarification ready_for_review].freeze
  # Evidence edits are allowed here; an edit to an approved PA voids approval.
  EDITABLE = (PREPARING + %w[approved]).freeze
  # Statuses a person moves to by hand from the console. The rest are reached
  # by the review and approval services.
  MANUAL_TARGETS = %w[submitted payer_pending approved_by_payer denied appealed cancelled closed].freeze
  TERMINAL = %w[closed].freeze

  EXTRACTION_STATUSES = %w[idle running succeeded failed].freeze

  belongs_to :organization
  belongs_to :patient
  belongs_to :patient_coverage
  belongs_to :policy_template
  belongs_to :requested_by, class_name: "User"
  belongs_to :assigned_to, class_name: "User", optional: true
  belongs_to :created_by, class_name: "User"

  has_many :requirements, -> { order(:id) }, class_name: "AuthorizationRequirement", dependent: :destroy
  has_many :evidence, through: :requirements
  has_many :approvals, as: :approvable, dependent: :restrict_with_error
  has_many :workflow_events, as: :subject, dependent: :restrict_with_error
  has_many :tasks, as: :subject, dependent: :restrict_with_error

  attr_accessor :transitioning

  validates :item_name, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :extraction_status, inclusion: { in: EXTRACTION_STATUSES }
  validates :prep_minutes_reported, numericality: { only_integer: true, in: 0..600 }, allow_nil: true
  validate :status_changes_through_transition_service
  validate :records_belong_to_organization

  scope :open, -> { where.not(status: %w[closed cancelled approved_by_payer]) }

  def can_transition_to?(target)
    TRANSITIONS.fetch(status, []).include?(target.to_s)
  end

  def preparing?
    PREPARING.include?(status)
  end

  def editable?
    EDITABLE.include?(status)
  end

  def all_requirements_resolved?
    requirements.any? && requirements.all?(&:resolved?)
  end

  # What a clinician signs. Covers the item, the coverage, and every
  # requirement with its live evidence, so any edit after approval changes it.
  def content_digest
    payload = {
      item_name: item_name,
      item_code: item_code,
      patient_coverage_id: patient_coverage_id,
      policy_template_id: policy_template_id,
      requirements: requirements.includes(:evidence).sort_by(&:id).map do |req|
        {
          id: req.id,
          status: req.status,
          note: req.note,
          evidence: req.evidence.reject(&:rejected?).sort_by(&:id).map do |ev|
            [ ev.id, ev.chart_document_id, ev.start_offset, ev.end_offset, ev.verified?, ev.excerpt ]
          end
        }
      end
    }
    OpenSSL::Digest::SHA256.hexdigest(JSON.generate(payload))
  end

  def latest_approval
    approvals.max_by(&:created_at)
  end

  def approval_current?
    latest_approval.present? && latest_approval.content_digest == content_digest
  end

  def as_api_json(detail: false)
    json = {
      id: id,
      status: status,
      item_name: item_name,
      item_code: item_code,
      patient: patient.as_api_json,
      coverage: patient_coverage.as_api_json,
      policy: policy_template.as_api_json,
      requested_by: requested_by.as_member_json,
      assigned_to: assigned_to&.as_member_json,
      extraction_status: extraction_status,
      extraction_error: extraction_error,
      extracted_at: extracted_at,
      submitted_at: submitted_at,
      decided_at: decided_at,
      payer_reference: payer_reference,
      prep_minutes_reported: prep_minutes_reported,
      requirement_counts: requirement_counts,
      created_at: created_at,
      updated_at: updated_at
    }
    return json unless detail

    approval = latest_approval
    json.merge(
      requirements: requirements.includes(:policy_criterion, :reviewed_by, evidence: [ :chart_document, :verified_by ]).map(&:as_api_json),
      approval: approval && {
        approved_by: approval.approved_by.as_member_json,
        approved_at: approval.created_at,
        current: approval.content_digest == content_digest
      },
      allowed_transitions: TRANSITIONS.fetch(status, []) & MANUAL_TARGETS
    )
  end

  def requirement_counts
    counts = requirements.group_by(&:status).transform_values(&:size)
    AuthorizationRequirement::STATUSES.index_with { |s| counts.fetch(s, 0) }
  end

  private

  def status_changes_through_transition_service
    return if new_record? || !will_save_change_to_status? || transitioning

    errors.add(:status, "changes only through Authorizations::TransitionService")
  end

  def records_belong_to_organization
    errors.add(:patient, "must belong to the same organization") if patient && patient.organization_id != organization_id
    errors.add(:patient_coverage, "must belong to the patient") if patient_coverage && patient_coverage.patient_id != patient_id
    [ [ :requested_by, requested_by ], [ :assigned_to, assigned_to ], [ :created_by, created_by ] ].each do |attr, user|
      errors.add(attr, "must belong to the same organization") if user && user.organization_id != organization_id
    end
  end
end
