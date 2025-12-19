FactoryBot.define do
  factory :provider_condition do
    provider { nil }
    condition_name { "MyString" }
    expertise_level { 1 }
    cases_treated { 1 }
  end
end
