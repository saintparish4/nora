class CreateConversationMessages < ActiveRecord::Migration[8.0]
  def change
    create_table :conversation_messages do |t|
      t.references :conversation, null: false, foreign_key: true
      t.string :role # user, assistant, system 
      t.text :content
      t.json :metadata, default: {} # Store suggested_replies, confidence, etc. 
      t.timestamps
    end

    add_index :conversation_messages, [:conversation_id, :created_at] 
  end
end
