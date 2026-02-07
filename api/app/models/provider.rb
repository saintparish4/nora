class Provider < ApplicationRecord
    has_many :availabilities, dependent: :destroy
    has_many :appointments, dependent: :destroy

    before_validation :set_default_avatar_url, on: :create

    validates :name, presence: true
    validates :specialty, presence: true
    validates :avatar_url, presence: true
    validates :hourly_rate, numericality: { greater_than: 0 }, allow_nil: true
    validates :experience_years, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
    validates :rating, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 5 }, allow_nil: true

    # Map AI specialty keys to provider specialties
    SPECIALTY_MAPPINGS = {
        'primary_care' => ['Primary Care'],
        'cardiology' => ['Cardiology'],
        'ophthalmology' => ['Ophthalmology'],
        'dentistry' => ['Dentistry'],
        'pediatrics' => ['Pediatrics']
    }.freeze

    scope :by_ai_specialty, ->(ai_specialty) {
        return all if ai_specialty.blank?

        matching_specialties = SPECIALTY_MAPPINGS[ai_specialty] || []
        where(specialty: matching_specialties)
    }
    scope :by_specialty, ->(specialty) { where(specialty: specialty) if specialty.present? }
    scope :by_location, ->(location) { where('location ILIKE ?', "%#{location}%") if location.present? }
    scope :rated_above, ->(rating) { where('rating >= ?', rating) if rating.present? }

    private

    def set_default_avatar_url
        return if avatar_url.present?

        # Use pravatar placeholder so every provider has a displayable image
        self.avatar_url = "https://i.pravatar.cc/150?img=#{rand(1..70)}"
    end
end
