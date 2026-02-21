# frozen_string_literal: true

module RequestHelpers
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { 'Authorization' => "Bearer #{token}" }
  end

  def parsed_body
    JSON.parse(response.body)
  end
end
