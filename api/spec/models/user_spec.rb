# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'associations' do
    it { should have_many(:appointments).with_foreign_key('patient_id').dependent(:destroy) }
    it { should have_one(:user_preference).dependent(:destroy) }
  end

  describe 'validations' do
    subject { build(:user) }

    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email) }
    it { should validate_length_of(:password).is_at_least(6) }

    it 'rejects an invalid email format' do
      user = build(:user, email: 'not-an-email')
      expect(user).not_to be_valid
      expect(user.errors[:email]).to be_present
    end

    it 'requires password confirmation to match' do
      user = build(:user, password: 'password123', password_confirmation: 'different')
      expect(user).not_to be_valid
    end
  end

  describe 'email normalization' do
    it 'downcases email before save' do
      user = create(:user, email: 'JOE@Example.COM')
      expect(user.reload.email).to eq('joe@example.com')
    end

    it 'prevents exact-case duplicate emails' do
      create(:user, email: 'alice@example.com')
      duplicate = build(:user, email: 'alice@example.com')
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to include('has already been taken')
    end
  end

  describe 'secure password' do
    let(:user) { create(:user, password: 'password123', password_confirmation: 'password123') }

    it 'authenticates with the correct password' do
      expect(user.authenticate('password123')).to eq(user)
    end

    it 'rejects an incorrect password' do
      expect(user.authenticate('wrong')).to be_falsey
    end
  end
end
