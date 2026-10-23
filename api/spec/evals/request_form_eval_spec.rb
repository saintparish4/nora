# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('evals/request_form/harness')

# The request-form eval (evals/request_form) as a guard: every labelled case
# runs, and nothing Nora fills in or answers is something a person would have
# to undo. The full scores are in the eval's README; this only holds the line.
RSpec.describe 'request form eval' do
  let(:result) { RequestFormEval::Runner.new(out: StringIO.new).call }

  it 'fills no field wrongly and answers no question wrongly or without a source' do
    totals = result[:totals]
    expect(totals[:cases]).to eq(20)
    expect(totals[:harmful]).to eq(0), JSON.pretty_generate(totals)
    expect(totals[:answer_outcomes].keys).not_to include(:shown_wrongly, :not_shown)
  end
end
