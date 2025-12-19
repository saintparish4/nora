class CreateProviderConditions < ActiveRecord::Migration[8.0]
  def change
    create_table :provider_conditions do |t|
      t.references :provider, null: false, foreign_key: true
      t.string :condition_name
      t.integer :expertise_level # 1-5 
      t.integer :cases_treated, default: 0
      t.timestamps
    end

    add_index :provider_conditions, [:provider_id, :condition_name] 
  end
end
