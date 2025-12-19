FactoryBot.define do
  factory :conversation_message do
    conversation { nil }
    role { "MyString" }
    content { "MyText" }
    metadata { "" }
  end
end
