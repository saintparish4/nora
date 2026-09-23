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

        # --- Deterministic emergency screening ---
        # Runs ahead of both conversational gates below. The length minimum and
        # the sufficiency check exist to improve the quality of a routine
        # recommendation; neither is a reason to ask someone describing a heart
        # attack to write more words first. "I have chest pain" is 17
        # characters, and under the old order it got a "tell me more" prompt.
        red_flag = Triage::RedFlagScreenerService.screen(message)

        # --- Minimum character enforcement (client-side is primary, this is a safety net) ---
        if message.length < MIN_MESSAGE_LENGTH && red_flag.nil?
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
        # Skipped outright when the screener fired. Asking a clarifying question
        # of someone reporting stroke signs is not a product decision we get to
        # make for the sake of a better specialty match.
        sufficiency = red_flag ? { sufficient: true } : Triage::ConversationSufficiencyService.new(conversation).check

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

        # No slot list for an emergency, whether it came from the rules or from
        # the model. Offering a bookable appointment next to "call 911" invites
        # exactly the wrong choice.
        providers_with_slots =
          if analysis[:urgency] == "emergency"
            []
          else
            Providers::MatchAndSlotService.new(analysis).call
          end

        # --- Persist the risk assessment (signed-in patients only) ---
        # Best-effort: the recorder swallows its own failures so a history write
        # never costs the patient their recommendation.
        Triage::RiskAssessmentService.record(analysis: analysis, conversation: conversation)

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
        # Two states get their own copy rather than the normal
        # "see a <specialty> specialist" framing, because in both of them
        # offering a bookable appointment as the answer would mislead.
        return emergency_message(analysis) if analysis[:urgency] == "emergency"
        return degraded_message(analysis) if analysis[:assessment_failed]

        specialty = analysis[:specialty_name]
        reasoning = analysis[:reasoning]

        msg = "Based on what you've described, I'd recommend seeing a **#{specialty}** specialist. "
        msg += "#{reasoning} "

        msg += if analysis[:urgency] == "urgent"
                 "I'd suggest scheduling an appointment within the next 24–48 hours."
        else
                 "You can schedule this at your convenience within the next week or two."
        end

        msg += if providers.any?
                 " I found #{providers.size} provider#{'s' if providers.size > 1} who can help."
        else
                 " I wasn't able to find providers in this specialty right now, but you can check back soon."
        end

        msg + safety_net
      end

      # An emergency is not a booking problem. Lead with the action and do not
      # bury it under a provider count — scheduling anything is the wrong next
      # step here.
      def emergency_message(analysis)
        msg = "**Please seek emergency care now.** #{analysis[:reasoning]} "

        flags = Array(analysis[:red_flags]).compact_blank
        msg += "What stood out: #{flags.to_sentence.downcase}. " if flags.any?

        msg + "If you are in the US, call 911 or go to your nearest emergency room. " \
              "If you are having thoughts of harming yourself, call or text 988 to reach the " \
              "Suicide & Crisis Lifeline."
      end

      # The analyzer could not reach or could not read the model. Say that
      # plainly instead of dressing an absence of assessment up as a result.
      def degraded_message(analysis)
        "#{analysis[:reasoning]} " \
        "I've pointed you to urgent care as the safer default, but this is not an assessment of " \
        "your symptoms — it's us telling you our check didn't run."
      end

      # Every non-emergency recommendation carries its own escalation advice, so
      # a patient told "routine" still knows what would change that.
      def safety_net
        " If your symptoms get worse, or you develop chest pain, trouble breathing, severe bleeding, " \
        "or sudden weakness or confusion, treat it as an emergency and call 911."
      end
    end
  end
end
