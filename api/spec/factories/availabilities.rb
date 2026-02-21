FactoryBot.define do
  factory :availability do
    provider
    day_of_week { Date.tomorrow.wday }
    start_time { "09:00" }
    end_time { "17:00" }
    is_available { true }
  end
end
