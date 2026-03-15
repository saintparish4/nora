FactoryBot.define do
    factory :user do
        email { Faker::Internet.unique.email }
        password { 'password123' }
        password_confirmation { 'password123' }
        booking_confirmations { true }
        reminders_24h { true }
        cancellation_notices { true }
    end
end
