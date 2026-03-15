class Conversation < ApplicationRecord
  belongs_to :user, optional: true
  has_many :conversation_messages, dependent: :destroy

  validates :session_id, presence: true, uniqueness: true

  scope :active, -> { where(status: "active") }
  scope :by_session, ->(sid) { where(session_id: sid) }

  def complete!
    update!(status: "completed", completed_at: Time.current)
  end

  # Build a text transcript of the conversation for the symptom analyzer.
  # Returns the last `limit` messages formatted as "Role: content" lines.
  def transcript(limit: 20)
    conversation_messages
      .order(created_at: :asc)
      .last(limit)
      .map { |m| "#{m.role.capitalize}: #{m.content}" }
      .join("\n")
  end
end
