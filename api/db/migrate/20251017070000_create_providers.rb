class CreateProviders < ActiveRecord::Migration[8.0]
  def change
    create_table :providers do |t|
      t.string :name, null: false
      t.string :specialty, null: false
      t.text :bio
      t.string :location
      t.decimal :hourly_rate, precision: 8, scale: 2
      t.integer :experience_years
      t.decimal :rating, precision: 3, scale: 2, default: 0.0
      t.string :avatar_url

      t.timestamps
    end

    add_index :providers, :specialty
    add_index :providers, :location
  end
end
