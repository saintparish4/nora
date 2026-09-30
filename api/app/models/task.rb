# A follow-up a person has to do, usually generated from a requirement that is
# missing or unclear.
class Task < ApplicationRecord
  STATUSES = %w[open done dismissed].freeze

  belongs_to :organization
  belongs_to :subject, polymorphic: true
  belongs_to :source, polymorphic: true, optional: true
  belongs_to :assignee, class_name: "User", optional: true

  validates :title, presence: true, length: { maximum: 500 }
  validates :status, inclusion: { in: STATUSES }
  validate :assignee_in_organization

  scope :open, -> { where(status: "open") }

  before_save { self.completed_at = status == "open" ? nil : (completed_at || Time.current) }

  def overdue?
    status == "open" && due_on.present? && due_on < Date.current
  end

  def as_api_json
    json = {
      id: id,
      title: title,
      status: status,
      due_on: due_on,
      overdue: overdue?,
      completed_at: completed_at,
      assignee: assignee&.as_member_json,
      subject: { type: subject_type, id: subject_id },
      created_at: created_at
    }
    if subject.is_a?(PriorAuthorization)
      json[:subject].merge!(item_name: subject.item_name, patient_name: subject.patient.full_name)
    end
    json
  end

  private

  def assignee_in_organization
    return if assignee.nil? || assignee.organization_id == organization_id

    errors.add(:assignee, "must belong to the same organization")
  end
end
