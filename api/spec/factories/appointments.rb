FactoryBot.define do
    factory :appointment do
      association :patient, factory: :user
      provider
      start_time { 2.days.from_now.change(hour: 10, min: 0) }
      end_time { 2.days.from_now.change(hour: 10, min: 30) }
      status { 'confirmed' }
      notes { Faker::Lorem.sentence }
    end
  end
