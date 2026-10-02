# Marks the shared, synthetic demo practice. One-click demo sign-in only ever
# reaches a practice with this flag, and its staff and settings are locked so
# the next visitor finds it working.
class AddDemoToOrganizations < ActiveRecord::Migration[8.1]
  def change
    add_column :organizations, :demo, :boolean, null: false, default: false
  end
end
