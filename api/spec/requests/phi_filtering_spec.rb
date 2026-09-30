# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'PHI filtering' do
  it 'filters chart text and identifiers from logged parameters' do
    filter = ActiveSupport::ParameterFilter.new(Rails.application.config.filter_parameters)
    filtered = filter.filter('body' => 'BMI 34.2', 'quote' => 'x', 'mrn' => 'A1', 'date_of_birth' => '1984-03-14', 'kind' => 'office_note')

    expect(filtered.except('kind').values.uniq).to eq([ '[FILTERED]' ])
    expect(filtered['kind']).to eq('office_note')
  end
end
