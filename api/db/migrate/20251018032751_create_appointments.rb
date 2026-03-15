class CreateAppointments < ActiveRecord::Migration[8.0]
  def change
    create_table :appointments do |t|
      t.references :user, null: false, foreign_key: true
      t.references :provider, null: false, foreign_key: true
      t.datetime :start_time, null: false
      t.datetime :end_time, null: false
      t.string :status, default: 'pending', null: false
      t.text :notes

      t.timestamps
    end

    add_index :appointments, [ :provider_id, :start_time ]
    add_index :appointments, [ :user_id, :start_time ]
    add_index :appointments, :status
  end
end
