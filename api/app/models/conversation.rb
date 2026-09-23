class Conversation < ApplicationRecord
  belongs_to :user, optional: true
  has_many :conversation_messages, dependent: :destroy
  has_many :risk_assessments, dependent: :destroy

  validates :session_id, presence: true, uniqueness: true

  scope :active, -> { where(status: "active") }
  scope :by_session, ->(sid) { where(session_id: sid) }
  scope :recent_first, -> { order(created_at: :desc) }

  def complete!
    update!(status: "completed", completed_at: Time.current)
  end

  # First thing the patient said, for the history list. Falls back to the
  # opening assistant line so a conversation never lists as blank.
  def preview(limit: 120)
    message = conversation_messages.ordered.find { |m| m.role == "user" } ||
              conversation_messages.ordered.first
    return nil if message.nil?

    message.content.to_s.truncate(limit)
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
