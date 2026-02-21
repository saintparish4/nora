FactoryBot.define do
  factory :conversation do
    session_id { SecureRandom.uuid }
    status { "active" }
    context { {} }
    user { nil }

    trait :with_user do
      user
    end

    trait :completed do
      status { "completed" }
      completed_at { Time.current }
    end
  end
end
