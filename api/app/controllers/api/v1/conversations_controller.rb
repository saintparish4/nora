module Api
  module V1
    # Read-only history of the patient's own symptom-chat conversations.
    #
    # Writes happen in SymptomChatController, which is guest-friendly; this
    # controller is not — a history only exists for an account, so it requires
    # authentication and is scoped to `current_user` on every action.
    class ConversationsController < ApplicationController
      # GET /api/v1/conversations
      def index
        conversations = current_user.conversations
                                   .recent_first
                                   .includes(:conversation_messages, :risk_assessments)

        log_phi_access_batch("Conversation", conversations.map(&:id), :view)

        render json: {
          conversations: conversations.map { |c| summary_json(c) }
        }
      end

      # GET /api/v1/conversations/:id
      def show
        conversation = current_user.conversations
                                   .includes(:conversation_messages, :risk_assessments)
                                   .find(params[:id])

        log_phi_access("Conversation", conversation.id, :view)

        render json: {
          conversation: summary_json(conversation).merge(
            messages: conversation.conversation_messages.ordered.map { |m| message_json(m) },
            risk_assessments: conversation.risk_assessments.sort_by(&:created_at).reverse.map(&:as_summary_json)
          )
        }
      end

      private

      def summary_json(conversation)
        latest = conversation.risk_assessments.max_by(&:created_at)

        {
          id: conversation.id,
          session_id: conversation.session_id,
          status: conversation.status,
          preview: conversation.preview,
          message_count: conversation.conversation_messages.size,
          created_at: conversation.created_at,
          completed_at: conversation.completed_at,
          latest_risk_assessment: latest&.as_summary_json
        }
      end

      def message_json(message)
        {
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.created_at
        }
      end
    end
  end
end
