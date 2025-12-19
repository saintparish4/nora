FactoryBot.define do
  factory :follow_up_recommendation do
    user { nil }
    appointment { nil }
    recommendation_type { "MyString" }
    message { "MyText" }
    scheduled_for { "2025-12-19 16:42:44" }
    sent_at { "2025-12-19 16:42:44" }
    acknowledged { false }
    metadata { "" }
  end
end
