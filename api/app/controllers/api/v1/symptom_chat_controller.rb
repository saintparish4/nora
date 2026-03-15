module Api
  module V1
    class SymptomChatController < ApplicationController
      # This endpoint is accessible to guests (no auth required).
      # If a valid token is present the conversation is bound to the user.
      skip_before_action :authenticate_request

      MIN_MESSAGE_LENGTH = 30

      # POST /api/v1/symptom-chat/send
      #
      # Params:
      #   session_id (string, required) – client-generated UUID
      #   message    (string, required) – user's chat message
      #
      # Response (always 200 unless server error):
      #   {
      #     assistant_message: "...",
      #     need_more_detail:  true|false,
      #     session_id:        "...",
      #     analysis:          { ... } | null,
      #     providers:         [ ... ] | null
      #   }
      def send_message
        session_id = params[:session_id]
        message    = params[:message].to_s.strip

        if session_id.blank?
          return render json: { error: "session_id is required" }, status: :unprocessable_entity
        end

        if message.blank?
          return render json: { error: "message is required" }, status: :unprocessable_entity
        end

        # --- Minimum character enforcement (client-side is primary, this is a safety net) ---
        if message.length < MIN_MESSAGE_LENGTH
          return render json: {
            session_id: session_id,
            assistant_message: "Please describe your symptoms in a bit more detail (at least #{MIN_MESSAGE_LENGTH} characters) so I can help you effectively.",
            need_more_detail: true,
            analysis: nil,
            providers: nil
          }
        end

        # --- Find or create conversation ---
        conversation = Conversation.find_or_create_by!(session_id: session_id) do |c|
          c.user = current_user_if_present
          c.status = "active"
          c.context = {}
        end

        # Bind user to existing conversation if they just logged in
        if current_user_if_present && conversation.user_id.nil?
          conversation.update!(user_id: current_user_if_present.id)
        end

        # --- Persist user message ---
        conversation.conversation_messages.create!(
          role: "user",
          content: message
        )

        # --- Sufficiency check ---
        sufficiency = Triage::ConversationSufficiencyService.new(conversation).check

        unless sufficiency[:sufficient]
          # Store the follow-up question as an assistant message
          assistant_msg = sufficiency[:follow_up_question]
          conversation.conversation_messages.create!(
            role: "assistant",
            content: assistant_msg
          )

          log_phi_access("Conversation", conversation.id, :create, user_id: current_user_if_present&.id)

          return render json: {
            session_id: session_id,
            assistant_message: assistant_msg,
            need_more_detail: true,
            analysis: nil,
            providers: nil
          }
        end

        # --- Full analysis ---
        # Conversation transcripts are unique per session and grow with each
        # turn, so caching them wastes cache space and can return a stale
        # result if the user adds more context. Disable caching here; the
        # single-shot /analyze-symptoms endpoint keeps caching enabled.
        transcript = conversation.transcript
        analyzer = Triage::SymptomAnalyzerService.new(transcript, cacheable: false)
        analysis = analyzer.analyze

        providers_with_slots = Providers::MatchAndSlotService.new(analysis).call

        # --- Build assistant summary ---
        assistant_msg = build_recommendation_message(analysis, providers_with_slots)
        conversation.conversation_messages.create!(
          role: "assistant",
          content: assistant_msg
        )

        log_phi_access("Conversation", conversation.id, :create, user_id: current_user_if_present&.id)

        render json: {
          session_id: session_id,
          assistant_message: assistant_msg,
          need_more_detail: false,
          analysis: analysis,
          providers: providers_with_slots
        }
      rescue StandardError => e
        Rails.logger.error "SymptomChat error: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        render json: {
          error: "Something went wrong. Please try again."
        }, status: :internal_server_error
      end

      private

      def build_recommendation_message(analysis, providers)
        specialty = analysis[:specialty_name]
        urgency = analysis[:urgency]
        reasoning = analysis[:reasoning]

        msg = "Based on what you've described, I'd recommend seeing a **#{specialty}** specialist. "
        msg += "#{reasoning} "

        case urgency
        when "emergency"
          msg += "This appears urgent — please seek immediate medical attention or call 911 if you're in danger."
        when "urgent"
          msg += "I'd suggest scheduling an appointment within the next 24–48 hours."
        else
          msg += "You can schedule this at your convenience within the next week or two."
        end

        if providers.any?
          msg += " I found #{providers.size} provider#{'s' if providers.size > 1} who can help."
        else
          msg += " I wasn't able to find providers in this specialty right now, but you can check back soon."
        end

        msg
      end
    end
  end
end
