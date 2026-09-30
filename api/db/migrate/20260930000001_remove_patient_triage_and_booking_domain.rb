# Nora pivots from patient triage and booking to a staff-facing workflow
# copilot. None of these tables carry forward; directive/next-steps.md lists
# what replaces them. Children are dropped before parents so foreign keys
# never block the drop on PostgreSQL.
class RemovePatientTriageAndBookingDomain < ActiveRecord::Migration[8.1]
  TABLES = %i[
    follow_up_recommendations
    risk_assessments
    conversation_messages
    conversations
    user_preferences
    calendar_connections
    provider_conditions
    blocked_slots
    availabilities
    appointments
    providers
  ].freeze

  USER_COLUMNS = %i[
    booking_confirmations
    booking_patterns
    cancellation_notices
    health_history
    is_provider
    provider_id
    reminders_24h
  ].freeze

  def up
    TABLES.each { |table| drop_table table }

    remove_index :users, :provider_id
    USER_COLUMNS.each { |column| remove_column :users, column }
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "The triage and booking domain was removed; restore it from git history."
  end
end
