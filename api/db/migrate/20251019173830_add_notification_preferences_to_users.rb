class AddNotificationPreferencesToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :booking_confirmations, :boolean, default: true
    add_column :users, :reminders_24h, :boolean, default: true
    add_column :users, :cancellation_notices, :boolean, default: true
  end
end
