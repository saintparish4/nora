Rails.application.routes.draw do
  # Auth routes
 post 'auth/signup', to: 'auth#signup'
 post 'auth/login', to: 'auth#login'
 delete 'auth/logout', to: 'auth#logout'
 get 'auth/me', to: 'auth#me'
 patch 'auth/update_preferences', to: 'auth#update_preferences'
 
 # Providers routes
 resources :providers, only: [:index, :show] do
    member do 
        get 'available_slots', to: 'slots#available_slots'
    end
  end

  # Appointments routes
  resources :appointments, only: [:index, :show, :create] do
    member do 
        patch :cancel
    end
  end

  # Quick booking routes (streamlined flow)
  post '/quick-booking/analyze', to: 'quick_booking#analyze'
  post '/quick-booking/book', to: 'quick_booking#book'

  # API routes
  namespace :api do
    namespace :v1 do
      post '/analyze-symptoms', to: 'symptoms#analyze'

      # Chat routes
      post 'chat/message'
      get 'chat/history'
      post 'chat/reset'
      get 'chat/recommended_providers'

      # Follow-up routes
      resources :follow_ups, only: [:index] do
        member do
          patch 'acknowledge'
        end
      end

      # Provider routes
      namespace :provider do
        get 'dashboard', to: 'dashboard#index'

        # Calendar routes
        namespace :calendar do
          get 'connect'
          get 'callback'
          post 'sync'
          delete 'disconnect'
          get 'status'
        end

        # Appointments routes
        resources :appointments, only: [:index, :update] do
          member do
            patch 'complete'
            patch 'cancel'
          end
        end
      end
    end
  end
end

