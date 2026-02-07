module Providers
  class ProviderMatchingService
    def initialize(user, specialty: nil, location: nil)
      @user = user
      @specialty = specialty
      @location = location || user.user_preference&.preferred_location
    end

    def find_best_matches(limit: 10)
      providers = Provider.all

      # Filter by AI-recommended specialty if available
      if @specialty.present?
        providers = Provider.by_ai_specialty(@specialty)
      end

      # Score and sort providers
      scored_providers = providers.map do |provider|
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

      # Location match (15 points)
      if @location && provider.location&.downcase&.include?(@location.downcase)
        score += 15
      end

      # Rating (max 25 points)
      score += (provider.rating || 0) * 5

      # Experience (max 10 points)
      score += [provider.experience_years || 0, 10].min

      # Availability (bonus 10 points if has slots)
      if provider.availabilities.any?
        score += 10
      end

      score
    end
  end
end
