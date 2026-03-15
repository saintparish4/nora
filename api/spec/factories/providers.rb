FactoryBot.define do
    factory :provider do
        name { Faker::Name.name }
        specialty { [ 'Physical Therapy', 'Personal Training', 'Nutrition Counseling', 'Yoga Instruction', 'Mental Health Counseling' ].sample }
        bio { Faker::Lorem.paragraph }
        location { "#{Faker::Address.city}, #{Faker::Address.state_abbr}" }
        hourly_rate { Faker::Number.between(from: 100, to: 300) }
        experience_years { Faker::Number.between(from: 1, to: 20) }
        rating { Faker::Number.between(from: 4.0, to: 5.0).round(1) }
        avatar_url { "https://i.pravatar.cc/150?img=#{Faker::Number.between(from: 1, to: 74)}" }
    end
end
