Rails.application.routes.draw do
  # All API routes under /api/v1 namespace
  namespace :api do
    namespace :v1 do
      # Auth routes
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      # Browser clients read this to prove a mutating request came from our own
      # page; the session cookie itself is httpOnly and unreadable.
      get "auth/csrf", to: "auth#csrf"
      # Non-browser clients exchange a rotating refresh token for a new access
      # token here. Browsers never receive either.
      post "auth/refresh", to: "auth#refresh"
      get "auth/me", to: "auth#me"
      patch "auth/profile", to: "auth#update_profile"

      # The practice and its staff
      resource :organization, only: [ :show, :update ] do
        resources :members, only: [ :index, :create, :update ]
      end

      # The console
      get "today", to: "today#show"
      get "metrics", to: "metrics#show"

      resources :patients, only: [ :index, :show, :create, :update ] do
        resources :coverages, only: [ :create ]
        resources :chart_documents, only: [ :create ]
      end
      resources :chart_documents, only: [ :show, :destroy ]

      # Reference data
      resources :payers, only: [ :index ]
      resources :policy_templates, only: [ :index, :show ]

      # Nora Auth
      resources :prior_authorizations, only: [ :index, :show, :create, :update ] do
        member do
          post :extract
          post :approve
          post :transition
          get :packet
          get :events
        end
      end
      resources :authorization_requirements, only: [ :update ] do
        member { post :evidence, action: :add_evidence }
      end
      resources :authorization_evidence, only: [ :update ]
      resources :tasks, only: [ :index, :update ]
    end
  end
end
