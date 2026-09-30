class CreatePatientsAndCoverage < ActiveRecord::Migration[8.1]
  def change
    create_table :patients do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :mrn
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.date :date_of_birth, null: false
      t.string :sex
      t.timestamps
    end
    add_index :patients, [ :organization_id, :mrn ], unique: true, where: "mrn IS NOT NULL"
    add_index :patients, [ :organization_id, :last_name, :first_name ]

    create_table :payers do |t|
      t.string :name, null: false
      t.string :payer_code
      t.timestamps
    end
    add_index :payers, :name, unique: true

    create_table :insurance_plans do |t|
      t.references :payer, null: false, foreign_key: true
      t.string :name, null: false
      t.string :plan_type
      t.timestamps
    end
    add_index :insurance_plans, [ :payer_id, :name ], unique: true

    create_table :patient_coverages do |t|
      t.references :patient, null: false, foreign_key: true
      t.references :insurance_plan, null: false, foreign_key: true
      t.string :member_id, null: false
      t.string :group_number
      t.date :effective_on
      t.boolean :primary, null: false, default: true
      t.timestamps
    end
  end
end
