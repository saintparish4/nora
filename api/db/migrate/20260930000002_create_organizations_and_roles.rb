# Every record in the workflow copilot belongs to a practice, and staff share
# its patients. Existing users are moved into one organization per user so the
# column can be required.
class CreateOrganizationsAndRoles < ActiveRecord::Migration[8.1]
  def up
    create_table :organizations do |t|
      t.string :name, null: false
      t.string :npi
      t.string :timezone, null: false, default: "America/New_York"
      t.timestamps
    end

    add_reference :users, :organization, foreign_key: true
    add_column :users, :role, :string, null: false, default: "staff"

    execute <<~SQL
      INSERT INTO organizations (name, timezone, created_at, updated_at)
      SELECT 'Practice for ' || email, 'America/New_York', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users
    SQL
    execute <<~SQL
      UPDATE users SET role = 'admin', organization_id = (
        SELECT organizations.id FROM organizations
        WHERE organizations.name = 'Practice for ' || users.email
      )
    SQL

    change_column_null :users, :organization_id, false
  end

  def down
    remove_reference :users, :organization, foreign_key: true
    remove_column :users, :role
    drop_table :organizations
  end
end
