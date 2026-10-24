# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Health check', type: :request do
  it 'answers GET /up without a session' do
    get '/up'

    expect(response).to have_http_status(:ok)
  end

  it 'lets the frontend read the answer across origins, at its live address and the old one it redirects from' do
    %w[https://noras-demo.vercel.app https://mai-omega.vercel.app].each do |origin|
      get '/up', headers: { 'Origin' => origin }

      expect(response.headers['Access-Control-Allow-Origin']).to eq(origin)
    end
  end
end
