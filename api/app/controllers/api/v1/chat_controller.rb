module Api
    module V1
      class ChatController < ApplicationController
        before_action :authenticate_request
        
        # POST /api/v1/chat/message
        def message
          service = ConversationalSymptomService.new(
            current_user.id,
            params[:session_id] || SecureRandom.uuid
          )
          
          response = service.process_message(params[:message])
          
          render json: {
            message: response[:message],
            suggested_replies: response[:suggested_replies],
            confidence: response[:confidence],
            needs_more_info: response[:needs_more_info],
            ready_for_assessment: response[:ready_for_assessment],
            session_id: service.instance_variable_get(:@conversation).session_id
          }
        rescue => e
          Rails.logger.error "Chat error: #{e.message}"
          render json: { error: 'Failed to process message' }, status: :unprocessable_entity
        end
        
        # GET /api/v1/chat/history
        def history
          conversation = Conversation.find_by(
            user_id: current_user.id,
            session_id: params[:session_id],
            status: 'active'
          )
          
          if conversation
            render json: {
              messages: conversation.messages.order(:created_at).as_json,
              risk_assessment: conversation.risk_assessment&.as_json
            }
          else
            render json: { messages: [], risk_assessment: nil }
          end
        end
        
        # POST /api/v1/chat/reset
        def reset
          conversation = Conversation.find_by(
            user_id: current_user.id,
            session_id: params[:session_id]
          )
          
          conversation&.abandon!
          
          render json: { message: 'Conversation reset', new_session_id: SecureRandom.uuid }
        end
        
        # GET /api/v1/chat/recommended_providers
        def recommended_providers
          conversation = Conversation.find_by(
            user_id: current_user.id,
            session_id: params[:session_id]
          )
          
          if conversation&.risk_assessment
            service = ProviderMatchingService.new(
              current_user,
              risk_assessment: conversation.risk_assessment,
              location: params[:location]
            )
            
            providers = service.find_best_matches(limit: params[:limit] || 10)
            
            render json: {
              providers: providers.as_json(include: :availabilities),
              care_level: conversation.risk_assessment.care_level,
              confidence: conversation.risk_assessment.confidence
            }
          else
            render json: { error: 'No assessment available' }, status: :unprocessable_entity
          end
        end
      end
    end
  end