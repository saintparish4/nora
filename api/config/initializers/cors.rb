Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
        # The Cypress suite runs its own console on 3105 (base/cypress/run-e2e.sh),
        # so it can run alongside `make dev`. Never allowed in production.
        e2e = ENV["E2E"] == "true" && !Rails.env.production? ? [ "http://localhost:3105" ] : []
        origins "https://mai-omega.vercel.app", "http://localhost:3005", *e2e

        resource "*",
        headers: :any,
        methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
        credentials: true,
        expose: [ "Authorization" ]
    end
end
