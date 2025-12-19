FactoryBot.define do
  factory :user_preference do
    user { nil }
    preferred_location { "MyString" }
    preferred_times { "" }
    insurance_info { "MyString" }
    provider_gender_preference { "MyString" }
    language_preferences { "" }
    communication_preferences { "" }
  end
end
