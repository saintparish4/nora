FactoryBot.define do
  factory :risk_assessment do
    conversation { association :conversation, :with_user }
    user { conversation.user }
    care_level { "routine" }
    confidence { 80 }
    reasoning { "Symptoms suggest a non-urgent musculoskeletal issue." }
    red_flags { [] }
    self_care_options { [] }
    escalation_triggers { [] }
    recommended_specialties { [ "Orthopedics" ] }

    trait :urgent do
      care_level { "urgent" }
      red_flags { [ "worsening pain" ] }
    end

    trait :emergency do
      care_level { "emergency" }
      red_flags { [ "chest pain", "shortness of breath" ] }
    end
  end
end
