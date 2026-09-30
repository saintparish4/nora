class CreateApprovalsEventsAndTasks < ActiveRecord::Migration[8.1]
  def change
    create_table :approvals do |t|
      t.references :approvable, polymorphic: true, null: false
      t.references :approved_by, null: false, foreign_key: { to_table: :users }
      t.string :content_digest, null: false
      t.datetime :created_at, null: false
    end

    # Append-only history. No updated_at: rows never change.
    create_table :workflow_events do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :subject, polymorphic: true, null: false
      t.references :actor, foreign_key: { to_table: :users }
      t.string :event_type, null: false
      t.string :from_status
      t.string :to_status
      t.json :payload, null: false, default: {}
      t.datetime :created_at, null: false
    end
    add_index :workflow_events, [ :subject_type, :subject_id, :created_at ]

    create_table :tasks do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :subject, polymorphic: true, null: false
      t.references :source, polymorphic: true
      t.references :assignee, foreign_key: { to_table: :users }
      t.string :title, null: false
      t.date :due_on
      t.string :status, null: false, default: "open"
      t.datetime :completed_at
      t.timestamps
    end
    add_index :tasks, [ :organization_id, :status ]
  end
end
