class MakeConversationsUserIdNullable < ActiveRecord::Migration[8.0]
  def change
    # Allow guest (anonymous) conversations by making user_id optional.
    # session_id becomes the primary identifier for anonymous sessions.
    change_column_null :conversations, :user_id, true

    # Remove the existing foreign key that enforces NOT NULL at the DB level
    remove_foreign_key :conversations, :users
    # Re-add it without the implicit NOT NULL behaviour
    add_foreign_key :conversations, :users, column: :user_id, on_delete: :nullify
  end
end
