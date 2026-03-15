class Provider < ApplicationRecord
    has_many :availabilities, dependent: :destroy
    has_many :appointments, dependent: :destroy
    has_many :blocked_slots, dependent: :destroy
    has_many :provider_conditions, dependent: :destroy

    before_validation :set_default_avatar_url, on: :create

    validates :name, presence: true
    validates :specialty, presence: true
    validates :avatar_url, presence: true
    validates :hourly_rate, numericality: { greater_than: 0 }, allow_nil: true
    validates :experience_years, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
    validates :rating, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 5 }, allow_nil: true

    # Map AI specialty keys (from SymptomAnalyzerService) to provider specialties.
    # Every key the analyzer can return must be present so chat recommendations
    # always find matching providers when they exist in the database.
    SPECIALTY_MAPPINGS = {
        "primary_care" => [ "Primary Care" ],
        "cardiology" => [ "Cardiology" ],
        "dermatology" => [ "Dermatology" ],
        "urgent_care" => [ "Urgent Care" ],
        "emergency" => [ "Emergency Room", "Emergency Medicine" ],
        "mental_health" => [ "Mental Health Counseling", "Psychiatry", "Psychology" ],
        "pediatrics" => [ "Pediatrics" ],
        "gynecology" => [ "Gynecology", "OB-GYN" ],
        "oncology" => [ "Oncology" ],
        "orthopedics" => [ "Orthopedics", "Orthopedic Surgery" ],
        "physical_therapy" => [ "Physical Therapy" ],
        "nutrition" => [ "Nutrition Counseling", "Nutrition" ],
        "ophthalmology" => [ "Ophthalmology" ],
        "dentistry" => [ "Dentistry" ]
    }.freeze

    scope :by_ai_specialty, ->(ai_specialty) {
        return all if ai_specialty.blank?

        matching_specialties = SPECIALTY_MAPPINGS[ai_specialty] || []
        where(specialty: matching_specialties)
    }
    scope :by_specialty, ->(specialty) { where(specialty: specialty) if specialty.present? }
    scope :by_location, ->(location) { where("LOWER(location) LIKE LOWER(?)", "%#{location}%") if location.present? }
    scope :rated_above, ->(rating) { where("rating >= ?", rating) if rating.present? }

    SUMMARY_FIELDS = %i[id name specialty avatar_url location].freeze
    DETAIL_FIELDS  = %i[id name specialty avatar_url location bio rating hourly_rate experience_years].freeze

    def as_summary_json(extra = {})
        as_json(only: SUMMARY_FIELDS).merge(extra)
    end

    def as_detail_json(extra = {})
        as_json(only: DETAIL_FIELDS).merge(extra)
    end

    private

    def set_default_avatar_url
        return if avatar_url.present?

        # Use pravatar placeholder so every provider has a displayable image
        self.avatar_url = "https://i.pravatar.cc/150?img=#{rand(1..70)}"
    end
end
