# Nora's public key for SMART Backend Services, as a JWK Set. The
# authorization server fetches it to check the client assertions Nora signs.
# Not found when Nora is not set up as a SMART client.
class JwksController < ActionController::API
  def show
    auth = Fhir::SmartBackendAuth.from_env if ENV["FHIR_BASE_URL"].present?
    return head :not_found unless auth

    render json: Fhir::SmartBackendAuth.jwks(auth.private_key)
  end
end
