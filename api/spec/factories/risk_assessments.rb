FactoryBot.define do
  factory :risk_assessment do
    conversation { nil }
    user { nil }
    care_level { "MyString" }
    confidence { 1 }
    reasoning { "MyText" }
    red_flags { "" }
    self_care_options { "" }
    escalation_triggers { "" }
    recommended_specialties { "" }
  end
end
