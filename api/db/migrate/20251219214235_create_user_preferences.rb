class CreateUserPreferences < ActiveRecord::Migration[8.0]
  def change
    create_table :user_preferences do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.string :preferred_location
      t.json :preferred_times, default: [] # ["morning", "afternoon", "evening"]
      t.string :insurance_info
      t.string :provider_gender_preference
      t.json :language_preferences, default: []
      t.json :communication_preferences, default: {}
      t.timestamps
    end
  end
end
