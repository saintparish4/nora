# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Providers::ProviderMatchingService do
  let(:user) { create(:user) }

  describe '#find_best_matches' do
    context 'with a specialty filter' do
      let!(:dermatologist) { create(:provider, specialty: 'Dermatology', rating: 4.5) }
      let!(:cardiologist) { create(:provider, specialty: 'Cardiology', rating: 4.8) }

      it 'returns only providers matching the mapped specialty' do
        # 'dermatology' maps to ['Dermatology'] via Provider::SPECIALTY_MAPPINGS
        service = described_class.new(user, specialty: 'dermatology')
        results = service.find_best_matches

        expect(results).to include(dermatologist)
        expect(results).not_to include(cardiologist)
      end
    end

    context 'scoring: location match' do
      let!(:local_provider) { create(:provider, location: 'New York, NY', rating: 4.0, experience_years: 5) }
      let!(:remote_provider) { create(:provider, location: 'Los Angeles, CA', rating: 4.0, experience_years: 5) }

      it 'ranks the location-matching provider higher' do
        service = described_class.new(user, location: 'New York')
        results = service.find_best_matches

        expect(results.first).to eq(local_provider)
      end
    end

    context 'scoring: rating and experience' do
      let!(:experienced) { create(:provider, rating: 5.0, experience_years: 10) }
      let!(:beginner) { create(:provider, rating: 3.0, experience_years: 1) }

      it 'ranks the higher-rated, more experienced provider first' do
        service = described_class.new(user)
        results = service.find_best_matches

        expect(results.first).to eq(experienced)
      end
    end

    context 'with limit' do
      before do
        12.times { create(:provider) }
      end

      it 'respects the limit parameter' do
        service = described_class.new(user)
        results = service.find_best_matches(limit: 3)

        expect(results.length).to eq(3)
      end

      it 'defaults to 10' do
        service = described_class.new(user)
        results = service.find_best_matches

        expect(results.length).to eq(10)
      end
    end

    context 'scoring: availability bonus' do
      let!(:provider_with_availability) { create(:provider, rating: 4.0, experience_years: 5) }
      let!(:provider_without_availability) { create(:provider, rating: 4.0, experience_years: 5) }

      before do
        provider_with_availability.availabilities.create!(
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true
        )
      end

      it 'ranks the provider with availability higher' do
        service = described_class.new(user)
        results = service.find_best_matches

        expect(results.first).to eq(provider_with_availability)
      end
    end
  end
end
