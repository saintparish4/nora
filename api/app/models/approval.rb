# A person's check of the exact content of a record at a moment in time. For a
# prior authorization it is the staff member's final check before submitting:
# `content_digest` pins what was submitted. Immutable once written.
class Approval < ApplicationRecord
  belongs_to :approvable, polymorphic: true
  belongs_to :approved_by, class_name: "User"

  validates :content_digest, presence: true, format: { with: /\A\h{64}\z/ }

  after_initialize :readonly!, if: :persisted?
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Approvals cannot be destroyed" }
end
