# A person's sign-off on the exact content of a record at a moment in time.
# `content_digest` pins what they approved; if the record's digest moves on,
# the approval no longer covers it. Immutable once written.
class Approval < ApplicationRecord
  belongs_to :approvable, polymorphic: true
  belongs_to :approved_by, class_name: "User"

  validates :content_digest, presence: true, format: { with: /\A\h{64}\z/ }

  after_initialize :readonly!, if: :persisted?
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "Approvals cannot be destroyed" }
end
