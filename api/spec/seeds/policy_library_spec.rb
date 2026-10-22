require 'rails_helper'

RSpec.describe 'db/seeds/policy_library.rb' do
  before { silence_seed_output { load Rails.root.join('db/seeds/policy_library.rb') } }

  published = {
    'UnitedHealthcare' => 'uhcprovider.com', 'Aetna' => 'aetna.com', 'Cigna' => 'cigna.com',
    'Blue Cross Blue Shield Federal Employee Program' => 'fepblue.org'
  }

  it "resolves every payer's published criteria, with their source, for all three drugs" do
    published.each do |payer_name, host|
      %w[Wegovy Zepbound Saxenda].each do |item|
        template = PolicyTemplate.resolve(item_name: item, payer: Payer.find_by!(name: payer_name))

        expect(template.version).to eq(2)
        expect(template).not_to be_generic
        expect(URI(template.source_url).host).to end_with(host)
        expect(template.criteria).not_to be_empty
      end
    end
  end

  it 'gives any other payer the common baseline, and says it is not a policy' do
    template = PolicyTemplate.resolve(item_name: 'Wegovy', payer: Payer.find_by!(name: 'Blue Cross Blue Shield'))

    expect(template).to be_generic
    expect(template.version).to eq(2)
    expect(template.notes).to include('No published policy on file')
  end

  it 'keeps version 1 where it already exists, so earlier requests keep their criteria' do
    v1 = create(:policy_template, item_name: 'Wegovy', payer: nil, version: 1)
    silence_seed_output { load Rails.root.join('db/seeds/policy_library.rb') }

    expect(v1.reload).to be_persisted
    expect(PolicyTemplate.resolve(item_name: 'Wegovy', payer: nil).version).to eq(2)
  end

  it 'can be loaded twice without duplicating anything' do
    expect { silence_seed_output { load Rails.root.join('db/seeds/policy_library.rb') } }
      .not_to(change { [ PolicyTemplate.count, PolicyCriterion.count, Payer.count, InsurancePlan.count ] })
  end
end
