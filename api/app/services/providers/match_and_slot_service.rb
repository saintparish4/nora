module Providers
  class MatchAndSlotService
    DEFAULT_PROVIDER_LIMIT = 5
    DEFAULT_SLOT_LIMIT = 3

    def initialize(analysis, provider_limit: DEFAULT_PROVIDER_LIMIT, slot_limit: DEFAULT_SLOT_LIMIT)
      @analysis = analysis
      @provider_limit = provider_limit
      @slot_limit = slot_limit
    end

    def call
      providers = find_matching_providers
      serialize_with_slots(providers)
    end

    private

    def find_matching_providers
      ai_specialty = @analysis[:specialty]
      matching_specialties = Provider::SPECIALTY_MAPPINGS[ai_specialty] || [ @analysis[:specialty_name] ]

      Provider.where(specialty: matching_specialties)
              .order(rating: :desc)
              .limit(@provider_limit)
    end

    def serialize_with_slots(providers)
      providers.map do |provider|
        all_slots = Appointments::SlotGeneratorService.new(provider).generate_available_slots
        next_slots = all_slots.take(@slot_limit)

        provider.as_detail_json(next_available_slots: next_slots)
      end
    end
  end
end
