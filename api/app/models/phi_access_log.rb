# frozen_string_literal: true

# Immutable audit record of PHI access.
#
# This model intentionally has NO associations (no `belongs_to :user`) to
# avoid coupling audit evidence to user lifecycle events. We store user_id
# as a plain bigint and look it up manually when needed for reports.
#
# Rows are never updated or destroyed in normal operation. The readonly!
# enforcement below is a guardrail, not a security boundary — the real
# protection is Postgres row-level policies or a restricted DB role in prod.
class PhiAccessLog < ApplicationRecord
    # -----------------------------------------------------------------
  # Validations
  # -----------------------------------------------------------------
  ALLOWED_ACTIONS = %w[view create update delete].freeze
  validates :resource_type, presence: true 
  validates :resource_id, presence: true 
  validates :action, presence: true, inclusion: { in: ALLOWED_ACTIONS }

  # -----------------------------------------------------------------
  # Immutabillity 
  # -----------------------------------------------------------------
  after_initialize :readonly!, if: :persisted?

  before_validation { raise ActiveRecord::ReadOnlyRecord, "PHI audit logs are immutable" } 
  before_destroy { raise ActiveRecord::ReadOnlyRecord, "PHI audit logs cannot be destroyed" }

  # -----------------------------------------------------------------
  # Scopes ( for compliance queries ) 
  # -----------------------------------------------------------------
  scope :for_user, ->(uid) { where(user_id: uid) } 
  scope :for_resource, ->(type, id) { where(resource_type: type, resource_id: id.to_s) } 
  scope :between, ->(from, to) { where(created_at: from..to) } 
  scope :by_action, ->(act) { where(action: act) } 
end 