# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Provider, type: :model do
  describe 'associations' do
    it { should have_many(:availabilities).dependent(:destroy) }
    it { should have_many(:appointments).dependent(:destroy) }
    it { should have_many(:blocked_slots).dependent(:destroy) }
    it { should have_many(:provider_conditions).dependent(:destroy) }
  end

  describe 'validations' do
    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:specialty) }
    it 'requires avatar_url when the default callback is bypassed' do
      provider = build(:provider)
      provider.avatar_url = ''
      # Skip the before_validation callback that auto-fills avatar_url
      provider.class.skip_callback(:validation, :before, :set_default_avatar_url)
      provider.validate
      expect(provider.errors[:avatar_url]).to include("can't be blank")
    ensure
      provider.class.set_callback(:validation, :before, :set_default_avatar_url, on: :create)
    end
    it { should validate_numericality_of(:hourly_rate).is_greater_than(0).allow_nil }
    it { should validate_numericality_of(:experience_years).is_greater_than_or_equal_to(0).allow_nil }
    it { should validate_numericality_of(:rating).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(5).allow_nil }
  end

  describe 'default avatar' do
    it 'sets a default avatar_url when none is provided' do
      provider = create(:provider, avatar_url: nil)
      expect(provider.avatar_url).to be_present
      expect(provider.avatar_url).to match(%r{https://i\.pravatar\.cc/150\?img=\d+})
    end

    it 'keeps an explicit avatar_url' do
      url = 'https://example.com/avatar.png'
      provider = create(:provider, avatar_url: url)
      expect(provider.avatar_url).to eq(url)
    end
  end

  describe 'SPECIALTY_MAPPINGS' do
    it 'is frozen' do
      expect(Provider::SPECIALTY_MAPPINGS).to be_frozen
    end

    it 'maps every key to an array of provider-facing specialty strings' do
      Provider::SPECIALTY_MAPPINGS.each do |key, values|
        expect(key).to be_a(String)
        expect(values).to be_an(Array)
        expect(values).to all(be_a(String))
      end
    end
  end

  describe 'scopes' do
    let!(:dermatologist) { create(:provider, specialty: 'Dermatology', location: 'Boston, MA', rating: 4.8) }
    let!(:cardiologist)  { create(:provider, specialty: 'Cardiology', location: 'New York, NY', rating: 4.2) }

    describe '.by_ai_specialty' do
      it 'returns providers matching the AI specialty key' do
        expect(Provider.by_ai_specialty('dermatology')).to include(dermatologist)
        expect(Provider.by_ai_specialty('dermatology')).not_to include(cardiologist)
      end

      it 'returns all providers when the key is blank' do
        expect(Provider.by_ai_specialty(nil).count).to eq(2)
        expect(Provider.by_ai_specialty('').count).to eq(2)
      end
    end

    describe '.by_specialty' do
      it 'filters by exact specialty string' do
        expect(Provider.by_specialty('Cardiology')).to eq([cardiologist])
      end
    end

    describe '.by_location' do
      it 'filters by case-insensitive partial match' do
        expect(Provider.by_location('boston')).to include(dermatologist)
        expect(Provider.by_location('boston')).not_to include(cardiologist)
      end
    end

    describe '.rated_above' do
      it 'returns providers at or above the threshold' do
        expect(Provider.rated_above(4.5)).to include(dermatologist)
        expect(Provider.rated_above(4.5)).not_to include(cardiologist)
      end
    end
  end

  describe '#as_summary_json / #as_detail_json' do
    let(:provider) { create(:provider, bio: 'Great doctor', hourly_rate: 200) }

    it 'as_summary_json includes only summary fields' do
      json = provider.as_summary_json
      expect(json.keys.map(&:to_s)).to match_array(%w[id name specialty avatar_url location])
    end

    it 'as_detail_json includes extended fields' do
      json = provider.as_detail_json
      expect(json.keys.map(&:to_s)).to include('bio', 'rating', 'hourly_rate', 'experience_years')
    end

    it 'as_detail_json merges extra keys' do
      json = provider.as_detail_json(slots: [])
      expect(json).to have_key(:slots)
    end
  end
end
