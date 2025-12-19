class CreateConversations < ActiveRecord::Migration[8.0]
  def change
    create_table :conversations do |t|
      t.references :user, null: false, foreign_key: true
      t.string :session_id
      t.string :status, default: 'active' # active, completed, abandoned
      t.json :context, default: {} # Store conversation metadata
      t.datetime :completed_at
      t.timestamps
    end

    add_index :conversations, :session_id 
    add_index :conversations, :status 
  end
end
