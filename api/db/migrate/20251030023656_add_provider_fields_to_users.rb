class AddProviderFieldsToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :is_provider, :boolean, default: false
    add_column :users, :provider_id, :integer
    add_index :users, :provider_id
  end
end
