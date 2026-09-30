# Append-only history of everything that happens to a workflow record. Rows
# are never updated or destroyed.
class WorkflowEvent < ApplicationRecord
  EVENT_TYPES = %w[
    created status_changed extraction_started extraction_succeeded extraction_failed
    evidence_added evidence_verified evidence_rejected requirement_reviewed
    approved approval_invalidated assigned packet_downloaded task_created task_completed
  ].freeze

  belongs_to :organization
  belongs_to :subject, polymorphic: true
  belongs_to :actor, class_name: "User", optional: true

  validates :event_type, inclusion: { in: EVENT_TYPES }

  after_initialize :readonly!, if: :persisted?
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Workflow events cannot be destroyed" }

  def self.record!(subject:, event_type:, actor: nil, from_status: nil, to_status: nil, payload: {})
    create!(
      organization_id: subject.organization_id,
      subject: subject,
      actor: actor,
      event_type: event_type,
      from_status: from_status,
      to_status: to_status,
      payload: payload
    )
  end

  def as_api_json
    {
      id: id,
      event_type: event_type,
      from_status: from_status,
      to_status: to_status,
      payload: payload,
      actor: actor&.as_member_json,
      created_at: created_at
    }
  end
end
