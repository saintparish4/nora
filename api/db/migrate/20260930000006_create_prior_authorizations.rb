class CreatePriorAuthorizations < ActiveRecord::Migration[8.1]
  def change
    create_table :prior_authorizations do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :patient, null: false, foreign_key: true
      t.references :patient_coverage, null: false, foreign_key: true
      t.references :policy_template, null: false, foreign_key: true
      t.references :requested_by, null: false, foreign_key: { to_table: :users }
      t.references :assigned_to, foreign_key: { to_table: :users }
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.string :item_name, null: false
      t.string :item_code
      t.string :status, null: false, default: "draft"
      t.string :extraction_status, null: false, default: "idle"
      t.string :extraction_error
      t.datetime :extracted_at
      t.datetime :submitted_at
      t.datetime :decided_at
      t.string :payer_reference
      t.integer :prep_minutes_reported
      t.timestamps
    end
    add_index :prior_authorizations, [ :organization_id, :status ]

    create_table :authorization_requirements do |t|
      t.references :prior_authorization, null: false, foreign_key: true
      t.references :policy_criterion, null: false, foreign_key: true
      t.string :status, null: false, default: "pending"
      t.text :ai_summary
      t.text :note
      t.references :reviewed_by, foreign_key: { to_table: :users }
      t.datetime :reviewed_at
      t.timestamps
    end
    add_index :authorization_requirements, [ :prior_authorization_id, :policy_criterion_id ], unique: true,
              name: "index_auth_requirements_on_pa_and_criterion"

    create_table :authorization_evidence do |t|
      t.references :authorization_requirement, null: false, foreign_key: true
      t.references :chart_document, null: false, foreign_key: true
      t.text :excerpt, null: false
      t.integer :start_offset, null: false
      t.integer :end_offset, null: false
      t.decimal :confidence, precision: 4, scale: 3
      t.string :extracted_by, null: false
      t.text :rationale
      t.references :verified_by, foreign_key: { to_table: :users }
      t.datetime :verified_at
      t.references :rejected_by, foreign_key: { to_table: :users }
      t.datetime :rejected_at
      t.timestamps
    end
  end
end
