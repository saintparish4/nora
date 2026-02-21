# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Availability, type: :model do
  describe 'associations' do
    it { should belong_to(:provider) }
  end

  describe 'validations' do
    it { should validate_presence_of(:day_of_week) }
    it { should validate_presence_of(:start_time) }
    it { should validate_presence_of(:end_time) }
    it { should validate_inclusion_of(:day_of_week).in_range(0..6) }
  end

  describe 'end_time_after_start_time' do
    it 'is invalid when end_time equals start_time' do
      avail = build(:availability, start_time: '09:00', end_time: '09:00')
      expect(avail).not_to be_valid
      expect(avail.errors[:end_time]).to include('must be after start time')
    end

    it 'is invalid when end_time is before start_time' do
      avail = build(:availability, start_time: '14:00', end_time: '09:00')
      expect(avail).not_to be_valid
      expect(avail.errors[:end_time]).to include('must be after start time')
    end

    it 'is valid when end_time is after start_time' do
      avail = build(:availability, start_time: '09:00', end_time: '17:00')
      expect(avail).to be_valid
    end
  end

  describe '#day_name' do
    it 'returns the human-readable day name' do
      expect(build(:availability, day_of_week: 0).day_name).to eq('Sunday')
      expect(build(:availability, day_of_week: 1).day_name).to eq('Monday')
      expect(build(:availability, day_of_week: 6).day_name).to eq('Saturday')
    end
  end

  describe 'DAYS constant' do
    it 'maps all 7 days' do
      expect(Availability::DAYS.keys).to match_array((0..6).to_a)
    end
  end
end
