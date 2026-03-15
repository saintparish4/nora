module Providers
  class ProviderMatchingService
    def initialize(user, specialty: nil, location: nil, condition: nil)
      @user = user
      @specialty = specialty
      @location = location || user.user_preference&.preferred_location
      @condition = condition
    end

    def find_best_matches(limit: 10)
      providers = Provider.all

      if @specialty.present?
        providers = Provider.by_ai_specialty(@specialty)
      end

      scored_providers = providers.includes(:provider_conditions, :availabilities).map do |provider|
        {
          provider: provider,
          score: calculate_match_score(provider)
        }
      end

      scored_providers.sort_by { |p| -p[:score] }.take(limit).map { |p| p[:provider] }
    end

    private

    def calculate_match_score(provider)
      score = 0

      if @location && provider.location&.downcase&.include?(@location.downcase)
        score += 15
      end

      score += (provider.rating || 0) * 5

      score += [ provider.experience_years || 0, 10 ].min

      if provider.availabilities.any?
        score += 10
      end

      score += condition_expertise_score(provider)

      score
    end

    # Providers with documented expertise in the patient's condition are ranked
    # higher. expertise_level (1-5) is scaled to a max of 10 bonus points.
    def condition_expertise_score(provider)
      return 0 if @condition.blank?

      pc = provider.provider_conditions.find { |c| c.condition_name.casecmp?(@condition) }
      return 0 unless pc

      (pc.expertise_level || 0) * 2
    end
  end
end
