class AddBookingPatternsToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :booking_patterns, :jsonb, default: {}
    add_column :users, :health_history, :jsonb, default: {}
  end
end
