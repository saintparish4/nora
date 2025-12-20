class ConversationalSymptomService 
    REQUIRED_INFO = %w[duration severity frequency location aggravating_factors].freeze 

    def initialize(user_id, session_id) 
        @user = User.find(user_id) 
        @conversation = Conversation.find_or_create_by(
            user_id: user_id,
            session_id: session_id,
            status: 'active' 
        )
        @client = OpenAI::Client.new 
    end 
    
    def process_message(message) 
        # Add user message to conversation 
        @conversation.add_message(role: 'user', content: message) 

        # Analyze conversation state 
        state = analyze_conversation_state

        # Generate AI response 
        response = generate_response(state) 

        # Save assistant message 
        @conversation.add_message(
            role: 'assistant',
            content: response[:message],
            metadata: {
                suggested_replies: response[:suggested_replies],
                confidence: response[:confidence],
                needs_more_info: response[:needs_more_info] 
            }
        )

        # Create risk assessment if ready 
        if response[:ready_for_assessment]
            create_risk_assessment(response[:assessment])
        end 
        
        response 
    end 

    private 

    def analyze_conversation_state 
        context = @conversation.context || {} 
        gathered_info = extract_information_from_messages 

        {
            messages_count: @conversation.messages.count,
            gathered_info: gathered_info,
            missing_info: REQUIRED_INFO - gathered_info.keys.map(&:to_s),
            symptoms: gathered_info[:symptoms] || [],
            ready_for_assessment: (REQUIRED_INFO - gathered_info.keys.map(&:to_s)).empty?
        }
    end

    def extract_information_from_messages 
        # Use AI to extract structured information from conversation 
        messages = @conversation.message_history 

        prompt = build_extraction_prompt(messages)

        response = @client.chat(
            parameters: {
                model: "gpt-4o-mini",
                messages: [
                    { role: 'system', content: extraction_system_prompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 800 
            }
        )

        content = response.dig('choices', 0, 'message', 'content')
        parsed = JSON.parse(content.gsub(/```json\n?/, '').gsub(/```\n?/, '').strip) 

        parsed.deep_symbolize_keys
    rescue => e 
        Rails.logger.error "Information extraction failed: #{e.message}"
        {}
    end
    
    def generate_response(state)
        if state[:ready_for_assessment]
            generate_final_assessment 
        elsif state[:messages_count] == 1 
            generate_initial_response(state) 
        else 
            generate_follow_up_question(state)
        end 
    end 

    def generate_initial_response(state)
        symptoms = state[:gathered_info][:symptoms] || [] 

        {
            message: "I understand you're experiencing #{symptoms.join(', ')}. To help you better, I'd like to ask a few quick questions. How long have you been experiencing these symptoms?",
            suggested_replies: ['Less than a day', '1-3 days', '4-7 days', 'Over a week'],
            needs_more_info: true,
            confidence: 30,
            ready_for_assessment: false
        }
    end 

    def generate_follow_up_question(state)
        missing_info = state[:missing_info]

        if missing_info.include?('duration')
            {
                message: "How long have you been experiencing these symptoms?",
                suggested_replies: ['Less than a day', '1-3 days', '4-7 days', 'Over a week'],
                needs_more_info: true,
                confidence: 40,
                ready_for_assessment: false 
            }
        elsif missing_info.include?('severity')
            {
                message: "On a scale of 1-10, how would you rate the severity of your symptoms?",
                suggested_replies: ['1-3 (Mild)', '4-6 (Moderate)', '7-8 (Severe)', '9-10 (Very Severe)'],
                needs_more_info: true,
                confidence: 50,
                ready_for_assessment: false 
            }
        elsif missing_info.include?('frequency')
            {
                message: "How often are you experiencing these symptoms?",
                suggested_replies: ['Constantly', 'Several times a day', 'Once a day', 'Occasionally'],
                needs_more_info: true,
                confidence: 60, 
                ready_for_assessment: false 
            }
        elsif missing_info.include?('location') 
            {
                message: "Where exactly are you experiencing these symptoms?",
                suggested_replies: ['Let me describe', 'Prefer not to specify'],
                needs_more_info: true,
                confidence: 70,
                ready_for_assessment: false  
            }
        else 
            generate_final_assessment 
        end 
    end 

    def generate_final_assessment
        messages = @conversation.message_history 

        response = @client.chat(
            parameters: {
                model: "gpt-4o-mini",
                messages: [
                    { role: 'system', content: assessment_system_prompt },
                    { role: 'user', content: build_assessment_prompt(messages) }
                ],
                temperature: 0.3,
                max_tokens: 1000  
            }
        )

        content = response.dig('choices', 0, 'message', 'content')
        assessment = JSON.parse(content.gsub(/```json\n?/, '').gsub(/```\n?/, '').strip)

        {
            message: format_assessment_message(assessment),
            suggested_replies: ['Find providers', 'Ask more questions', 'Start over'],
            needs_more_info: false, 
            confidence: assessment['confidence'],
            ready_for_assessment: true,
            assessment: assessment.deep_symbolize_keys  
        }
    rescue => e
        Rails.logger.error "Assessment generation failed: #{e.message}"
        fallback_response 
    end 

    def create_risk_assessment(assessment_data) 
        @conversation.create_risk_assessment!(
            user: @user,
            care_level: assessment_data[:care_level],
            confidence: assessment_data[:confidence],
            reasoning: assessment_data[:reasoning],
            red_flags: assessment_data[:red_flags] || [],
            self_care_options: assessment_data[:self_care_options] || [],
            escalation_triggers: assessment_data[:escalation_triggers] || [],
            recommended_specialties: assessment_data[:recommended_specialties] || [] 
        )

        @conversation.complete!
    end 

    def extraction_system_prompt 
        <<~PROMPT 
           You are a medical information extraction assistant.
           Extract structured information from patient conversations. 

            Return ONLY valid JSON with these fields:
            {
             "symptoms": ["symptom1", "symptom2"],
             "duration": "description",
              "severity": "1-10 or mild/moderate/severe",
             "frequency": "description",
             "location": "body part or area",
             "aggravating_factors": ["factor1", "factor2"],
             "medical_history": "relevant history if mentioned"
            }

         Only include fields that were explicitly mentioned. 
        PROMPT 
    end
    
    def assessment_system_prompt
        <<~PROMPT
            You are a medical triage assistant providing health risk assessments.
            
            Analyze the conversation and return ONLY valid JSON:
            {
              "care_level": "emergency|urgent|primary|specialist|wellness",
              "confidence": 0-100,
              "reasoning": "clear explanation",
              "red_flags": ["flag1", "flag2"],
              "self_care_options": ["option1", "option2"],
              "escalation_triggers": ["trigger1", "trigger2"],
              "recommended_specialties": ["specialty1", "specialty2"]
            }
            
            Care Levels:
            - emergency: Life-threatening, needs ER (chest pain, difficulty breathing, severe bleeding)
            - urgent: Needs attention within 24-48 hours
            - primary: Routine primary care visit
            - specialist: Specific specialty needed
            - wellness: Preventive care, lifestyle guidance
            
            Be conservative with emergency classification.
            Provide actionable self-care when appropriate.
        PROMPT
    end
    
    def build_extraction_prompt(messages)
        conversation_text = messages.map { |role, content| "#{role}: #{content}" }.join("\n")
        "Extract information from this conversation:\n\n#{conversation_text}"
    end
    
    def build_assessment_prompt(messages)
        conversation_text = messages.map { |role, content| "#{role}: #{content}" }.join("\n")
        "Provide final health risk assessment for:\n\n#{conversation_text}"
    end
    
    def format_assessment_message(assessment)
        care_level = assessment['care_level']
        confidence = assessment['confidence']
        reasoning = assessment['reasoning']
        
        message = "Based on our conversation, I recommend **#{care_level.titleize}** care (#{confidence}% confidence).\n\n"
        message += "**Analysis:** #{reasoning}\n\n"
        
        if assessment['red_flags']&.any?
            message += "**⚠️ Important Notes:**\n"
            assessment['red_flags'].each { |flag| message += "- #{flag}\n" }
            message += "\n"
        end
        
        if assessment['self_care_options']&.any?
            message += "**Self-Care Options:**\n"
            assessment['self_care_options'].each { |option| message += "- #{option}\n" }
        end
        
        message
    end
    
    def fallback_response
        {
            message: "I've gathered enough information. Based on your symptoms, I recommend consulting with a primary care provider. Would you like to see available providers?",
            suggested_replies: ['Find providers', 'Ask more questions'],
            needs_more_info: false,
            confidence: 50,
            ready_for_assessment: false
        }
    end
end

