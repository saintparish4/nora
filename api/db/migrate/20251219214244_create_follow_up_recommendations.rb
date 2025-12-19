class CreateFollowUpRecommendations < ActiveRecord::Migration[8.0]
  def change
    create_table :follow_up_recommendations do |t|
      t.references :user, null: false, foreign_key: true
      t.references :appointment, null: false, foreign_key: true
      t.string :recommendation_type # check_in, follow_up_appointment, prevention_tip 
      t.text :message
      t.datetime :scheduled_for
      t.datetime :sent_at
      t.boolean :acknowledged, default: false 
      t.json :metadata, default: {} 
      t.timestamps
    end

    add_index :follow_up_recommendations, [:user_id, :scheduled_for] 
    add_index :follow_up_recommendations, :recommendation_type 
  end
end
