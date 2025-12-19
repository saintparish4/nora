class Provider < ApplicationRecord
    has_many :availabilities, dependent: :destroy 
    has_many :appointments, dependent: :destroy 
    has_many :blocked_slots, dependent: :destroy
    has_one :calendar_connection, dependent: :destroy
    has_many :provider_conditions, dependent: :destroy 

    validates :name, presence: true 
    validates :specialty, presence: true 
    validates :hourly_rate, numericality: { greater_than: 0 }, allow_nil: true 
    validates :experience_years, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true 
    validates :rating, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 5 }, allow_nil: true

    # Map AI specialty keys to provider specialties
    SPECIALTY_MAPPINGS = {
        'primary_care' => ['Primary Care', 'Family Medicine', 'Internal Medicine'],
        'cardiology' => ['Cardiology', 'Cardiovascular'],
        'dermatology' => ['Dermatology', 'Skin Care'],
        'urgent_care' => ['Urgent Care', 'Walk-in Clinic'],
        'emergency' => ['Emergency Medicine', 'ER'],
        'mental_health' => ['Mental Health Counseling', 'Psychology', 'Psychiatry'],
        'physical_therapy' => ['Physical Therapy', 'Sports Medicine'],
        'nutrition' => ['Nutrition Counseling', 'Dietitian']
    }.freeze
    
    scope :by_ai_specialty, ->(ai_specialty) {
        return all if ai_specialty.blank?
        
        matching_specialties = SPECIALTY_MAPPINGS[ai_specialty] || []
        where(specialty: matching_specialties)
    }
    scope :by_specialty, ->(specialty) { where(specialty: specialty) if specialty.present? }
    scope :by_location, ->(location) { where('location ILIKE ?', "%#{location}%") if location.present? }
    scope :rated_above, ->(rating) { where('rating >= ?', rating) if rating.present? } 
    scope :with_conditions_expertise, ->(condition) {
        joins(:provider_conditions) 
        .where(provider_conditions: { condition_name: condition })
        .order('provider_conditions.expertise_level DESC, provider_conditions.cases_treated DESC') 
    }
    
    def calendar_connected?
        calendar_connection.present? && calendar_connection.active?
    end

    def expertise_in(condition) 
        provider_conditions.find_by(condition_name: condition)
    end 
    
    def match_score_for(user, condition: nil, location: nil) 
        score = 0 

        # User has booked with this provider before 
        if user.preferred_providers.include?(id.to_s) 
            score += 30 
        end

        # Speciality match with user's history 
        if user.preferred_specialties.include?(specialty) 
            score += 20 
        end 

        # Condition expertise 
        if condition && expertise_in(condition) 
            expertise = expertise_in(condition) 
            score += expertise.expertise_level * 10 
            score += [expertise.cases_treated / 10, 10].min # Cap at 10 points 
        end 

        # Location preference 
        if location && self.location.to_s.downcase.include?(location.downcase) 
            score += 15 
        end 

        # Rating 
        score += (rating || 0) * 5 
    end 
end
