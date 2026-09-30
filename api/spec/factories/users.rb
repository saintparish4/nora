FactoryBot.define do
  factory :user do
    organization
    email { Faker::Internet.unique.email }
    password { 'password123' }
    password_confirmation { 'password123' }
    first_name { Faker::Name.first_name }
    last_name { Faker::Name.last_name }
    role { 'staff' }

    trait(:clinician) { role { 'clinician' } }
    trait(:admin) { role { 'admin' } }
  end
end
