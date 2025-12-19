class User < ApplicationRecord
    has_secure_password
    has_many :appointments, foreign_key: 'patient_id', dependent: :destroy 
    has_many :conversations, dependent: :destroy
    has_many :risk_assessments, dependent: :destroy 
    has_one :user_preference, dependent: :destroy 
    has_many :follow_up_recommendations, dependent: :destroy 
    belongs_to :provider_profile, class_name: 'Provider', foreign_key: 'provider_id', optional: true

    validates :email, presence: true, uniqueness: true
    validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
    validates :password, length: { minimum: 6 }, if: -> { new_record? || password.present? }

    before_save { self.email = email.downcase } 
    
    def provider?
        is_provider && provider_profile.present?
    end

    def update_booking_pattern(provider_id, speciality)
        patterns = booking_patterns || {} 
        patterns['providers'] ||= {} 
        patterns['specialities'] ||= {} 

        patterns['providers'][provider_id.to_s] = (patterns['providers'][provider_id.to_s] || 0) + 1
        patterns['specialties'][specialty] = (patterns['specialties'][specialty] || 0) + 1
    
        update(booking_patterns: patterns)
    end

    def preferred_providers 
        (booking_patterns['providers'] || {}).sort_by { |_, count| -count }.map(&:first).take(5)
    end 

    def preferred_specialties
        (booking_patterns['specialties'] || {}).sort_by { |_, count| -count }.map(&:first)
    end 
end 
