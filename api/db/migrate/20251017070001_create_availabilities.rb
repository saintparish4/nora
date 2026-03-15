class CreateAvailabilities < ActiveRecord::Migration[8.0]
  def change
    create_table :availabilities do |t|
      t.references :provider, null: false, foreign_key: true
      t.integer :day_of_week, null: false # 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      t.time :start_time, null: false
      t.time :end_time, null: false
      t.boolean :is_available, default: true

      t.timestamps
    end

    add_index :availabilities, [ :provider_id, :day_of_week ]
  end
end
