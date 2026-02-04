class CreateRiskAssessments < ActiveRecord::Migration[8.0]
  def change
    create_table :risk_assessments do |t|
      t.references :conversation, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :care_level # emergency, urgent, primary, specialist, wellness
      t.integer :confidence # 0-100 
      t.text :reasoning
      t.json :red_flags, default: [] 
      t.json :self_care_options, default: [] 
      t.json :escalation_triggers, default: [] 
      t.json :recommended_specialties, default: [] 
      t.timestamps
    end

    add_index :risk_assessments, :care_level
  end
end
