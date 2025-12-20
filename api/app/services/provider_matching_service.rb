class ProviderMatchingService 
    def initialize(user, risk_assessment: nil, location: nil) 
        @user = user 
        @risk_assessment = risk_assessment 
        @location = location || user.user_preference&.preferred_location 
    end 

    def find_best_matches(limit: 10) 
        providers = Provider.all 

        # Filter by recommended specialties if available 
        if @risk_assessment&.recommended_specialties&.any? 
            specialty_providers = [] 
            @risk_assessment.recommended_specialties.each do |specialty|
                specialty_providers += Provider.by_ai_specialty(specialty).to_a 
            end 
            providers = specialty_providers.uniq 
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

        # Historical booking patterns (30 points) 
        if @user.preferred_providers.include?(provider.id.to_s) 
            score += 30 
        end 

        # Specialty preference (20 points) 
        if @user.preferred_specialties.include?(provider.specialty) 
            score += 20 
        end 

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