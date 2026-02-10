# frozen_string_literal: true

# PHI Access Audit Log — HIPAA § 164.312(b) audit controls
#
# Tracks who accessed which PHI resource and when. This is an append-only
# audit trail: rows are never updated or soft-deleted. The table is designed
# for write-heavy workloads (one INSERT per PHI-touching request) and
# periodic compliance queries ("show me every access to patient X's data
# between dates A and B").
#
# Design decisions:
#   - user_id is nullable to support unauthenticated flows (symptom checker,
#     quick-booking analyze) where we fall back to session/request id.
#   - resource_id is a string (not bigint) so it can hold UUIDs if we
#     migrate primary keys later.
#   - No foreign key on user_id: we never want a failed user deletion to
#     cascade-destroy audit evidence.
#   - Separate indexes rather than a composite — the query patterns are
#     "all access by user X", "all access to resource Y", and
#     "all access in time range", not combinations of all three.

class CreatePhiAccessLogs < ActiveRecord::Migration[8.0]
    def change 
        create_table :phi_access_logs do |t|
            t.bigint :user_id, null: true # nullable for unauthenticated flows
            t.string :resource_type, null: false # "Appointment", "Conversation"
            t.string :resource_id, null: false # id of the accessed record 
            t.string :action, null: false # view / create / update / delete 
            t.string :session_id, null: true # fallback identifier for guests 
            t.string :request_id, null: true # Rails request.request_id for correlation 
            t.string :ip_address, null: true # source IP (usefule for breach forensics) 
            
            t.datetime :created_at, null: false # no updated_at - rows are immutable 
        end

        add_index :phi_access_logs, :user_id
        add_index :phi_access_logs, [:resource_type, :resource_id] 
        add_index :phi_access_logs, :created_at 
    end
end

