class ConversationMessage < ApplicationRecord
  belongs_to :conversation

  validates :role, inclusion: { in: %w[user assistant system] } 
  validates :content, presence: true 
end
