class Provider < ApplicationRecord
    has_many :availabilities, dependent: :destroy
    has_many :appointments, dependent: :destroy

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
end
