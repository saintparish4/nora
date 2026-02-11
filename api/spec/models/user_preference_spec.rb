require 'rails_helper'

RSpec.describe UserPreference, type: :model do
  describe 'associations' do
    it { should belong_to(:user) }
  end

  describe 'validations' do
    subject { UserPreference.new(user: create(:user)) }

    it { should validate_uniqueness_of(:user_id) }
  end

  describe 'one preference per user' do
    let(:user) { create(:user) }

    it 'allows creating a preference for a user' do
      pref = UserPreference.create!(user: user)
      expect(pref).to be_persisted
    end

    it 'prevents a second preference for the same user' do
      UserPreference.create!(user: user)
      duplicate = UserPreference.new(user: user)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:user_id]).to be_present
    end
  end
end
