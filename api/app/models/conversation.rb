class Conversation < ApplicationRecord
  belongs_to :user
  has_many :messages, class_name: 'ConversationMessage', dependent: :destroy
  has_one :risk_assessment, dependent: :destroy 

  validates :session_id, presence: true 
  validates :status, inclusion: { in: %w[active completed abandoned] }

  scope :active, -> { where(status: 'active') }
  scope :completed, -> { where(status: 'completed') }
  scope :recent, -> { where('created_at > ?', 24.hours.ago) }

  def complete!
    update(status: 'completed', completed_at: Time.current)
  end 

  def abandon!
    update(status: 'abandoned')
  end 

  def add_message(role:, content:, metadata: {})
    messages.create!(
      role: role,
      content: content,
      metadata: metadata 
    )
  end 

  def message_history
    messages.order(:created_at).pluck(:role, :content)  
  end 

  def symptoms_mentioned 
    context['symptoms'] || [] 
  end 

  def information_gathered 
    context['gathered_info'] || {}  
  end 
end
