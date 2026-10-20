# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Health check', type: :request do
  it 'answers GET /up without a session' do
    get '/up'

    expect(response).to have_http_status(:ok)
  end

  it 'lets the frontend read the answer across origins' do
    get '/up', headers: { 'Origin' => 'https://mai-omega.vercel.app' }

    expect(response.headers['Access-Control-Allow-Origin']).to eq('https://mai-omega.vercel.app')
  end
end
