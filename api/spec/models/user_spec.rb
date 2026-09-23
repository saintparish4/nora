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

  describe 'login lockout' do
    let(:user) { create(:user) }

    it 'starts unlocked with no failed attempts' do
      expect(user.failed_login_attempts).to be_zero
      expect(user).not_to be_locked
      expect(user.lockout_seconds_remaining).to be_zero
    end

    it 'counts each failure without locking below the threshold' do
      (User::MAX_FAILED_LOGIN_ATTEMPTS - 1).times { user.register_failed_login! }

      expect(user.failed_login_attempts).to eq(User::MAX_FAILED_LOGIN_ATTEMPTS - 1)
      expect(user).not_to be_locked
    end

    it 'locks at the threshold and reports the time remaining' do
      User::MAX_FAILED_LOGIN_ATTEMPTS.times { user.register_failed_login! }

      expect(user).to be_locked
      expect(user.lockout_seconds_remaining).to be_between(1, User::LOCKOUT_DURATION.to_i)
    end

    it 'expires the lock after the lockout duration' do
      User::MAX_FAILED_LOGIN_ATTEMPTS.times { user.register_failed_login! }

      travel_to(User::LOCKOUT_DURATION.from_now + 1.second) do
        expect(user).not_to be_locked
        expect(user.lockout_seconds_remaining).to be_zero
      end
    end

    it 'clears the counter and the lock on a successful login' do
      User::MAX_FAILED_LOGIN_ATTEMPTS.times { user.register_failed_login! }

      user.register_successful_login!

      expect(user.reload.failed_login_attempts).to be_zero
      expect(user.reload.locked_until).to be_nil
      expect(user).not_to be_locked
    end

    it 'skips the write when there is nothing to clear' do
      expect(user).not_to receive(:update_columns)

      user.register_successful_login!
    end

    it 'does not bump updated_at, so a lock is not mistaken for a profile edit' do
      original = user.updated_at

      user.register_failed_login!

      expect(user.reload.updated_at).to eq(original)
    end
  end
end
