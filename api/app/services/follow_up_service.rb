class FollowUpService
    def self.generate_post_visit_recommendations(appointment)
      user = appointment.patient
      provider = appointment.provider
      
      # Check-in recommendation (24 hours after appointment)
      FollowUpRecommendation.create!(
        user: user,
        appointment: appointment,
        recommendation_type: 'check_in',
        message: "Hi! How are you feeling after your appointment with #{provider.name}? Any questions or concerns?",
        scheduled_for: appointment.end_time + 24.hours,
        metadata: {
          appointment_id: appointment.id,
          provider_specialty: provider.specialty
        }
      )
      
      # Follow-up appointment recommendation (based on condition)
      if should_recommend_followup?(appointment)
        FollowUpRecommendation.create!(
          user: user,
          appointment: appointment,
          recommendation_type: 'follow_up_appointment',
          message: "Based on your recent visit, you may benefit from a follow-up appointment in 2-4 weeks. Would you like to schedule one?",
          scheduled_for: appointment.end_time + 2.weeks,
          metadata: {
            original_appointment_id: appointment.id,
            suggested_timeframe: '2-4 weeks'
          }
        )
      end
    end
    
    def self.detect_symptom_recurrence(user)
      # Check if user has similar symptoms as past conversations
      recent_conversations = user.conversations.where('created_at > ?', 30.days.ago)
      
      recent_conversations.each do |conv|
        next unless conv.risk_assessment
        
        # Look for patterns in symptom recurrence
        if symptom_recurring?(user, conv.symptoms_mentioned)
          FollowUpRecommendation.create!(
            user: user,
            recommendation_type: 'symptom_recurrence',
            message: "I noticed you've mentioned similar symptoms before. You may want to consult with a specialist for ongoing management.",
            scheduled_for: Time.current,
            metadata: {
              original_symptoms: conv.symptoms_mentioned,
              recurrence_count: count_symptom_occurrences(user, conv.symptoms_mentioned)
            }
          )
        end
      end
    end
    
    def self.send_prevention_tips(user)
      # Based on user's health history, send preventive care tips
      health_patterns = analyze_health_patterns(user)
      
      health_patterns.each do |pattern|
        FollowUpRecommendation.create!(
          user: user,
          recommendation_type: 'prevention_tip',
          message: generate_prevention_message(pattern),
          scheduled_for: Time.current + 1.week,
          metadata: {
            pattern_type: pattern[:type],
            category: pattern[:category]
          }
        )
      end
    end
    
    private
    
    def self.should_recommend_followup?(appointment)
      # Logic to determine if follow-up is needed
      # Based on provider specialty, appointment notes, etc.
      followup_specialties = ['Physical Therapy', 'Mental Health Counseling', 'Chronic Disease Management']
      followup_specialties.include?(appointment.provider.specialty)
    end
    
    def self.symptom_recurring?(user, symptoms)
      symptom_mentions = user.conversations
                            .where('created_at > ?', 90.days.ago)
                            .where('context @> ?', { symptoms: symptoms }.to_json)
                            .count
      
      symptom_mentions >= 2
    end
    
    def self.count_symptom_occurrences(user, symptoms)
      user.conversations
          .where('created_at > ?', 90.days.ago)
          .where('context @> ?', { symptoms: symptoms }.to_json)
          .count
    end
    
    def self.analyze_health_patterns(user)
      # Analyze user's health history for patterns
      patterns = []
      
      # Check appointment frequency
      if user.appointments.where('created_at > ?', 6.months.ago).count >= 5
        patterns << {
          type: 'high_frequency',
          category: 'wellness',
          message: 'Consider scheduling a comprehensive wellness check'
        }
      end
      
      patterns
    end
    
    def self.generate_prevention_message(pattern)
      case pattern[:type]
      when 'high_frequency'
        "You've had several medical visits recently. A wellness check can help identify any underlying issues and create a preventive care plan."
      else
        "Stay healthy! Regular check-ups and preventive care are important for long-term health."
      end
    end
  end