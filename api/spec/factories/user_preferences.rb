FactoryBot.define do
  factory :user_preference do
    user
    preferred_location { "Austin, TX" }
    preferred_times { [ "morning" ] }
    insurance_info { "Blue Cross PPO" }
    provider_gender_preference { "no_preference" }
    language_preferences { [ "English" ] }
    communication_preferences { {} }
  end
end
