FactoryBot.define do
  factory :conversation_message do
    conversation
    role { "user" }
    content { Faker::Lorem.paragraph(sentence_count: 3) }

    trait :assistant do
      role { "assistant" }
    end

    trait :system do
      role { "system" }
    end
  end
end
