class CreateBlockedSlots < ActiveRecord::Migration[7.0]
  def change
    create_table :blocked_slots do |t|
      t.references :provider, null: false, foreign_key: true
      t.datetime :start_time, null: false
      t.datetime :end_time, null: false
      t.string :reason
      t.string :source, default: 'manual' # manual, google_calendar
      t.string :external_event_id # Google Calendar event ID

      t.timestamps
    end

    add_index :blocked_slots, [ :provider_id, :start_time ]
    add_index :blocked_slots, :external_event_id
  end
end
