module Api
  module V1
    class ProvidersController < ApplicationController
      skip_before_action :authenticate_request, only: [:index, :show]

      # GET /api/v1/providers
      #
      # Supports optional pagination via `page` (1-based) and `per_page`
      # (default 20, max 100). Without these params the response is identical
      # to the old format so existing clients continue to work.
      def index
        @providers = Provider.all

        # AI Specialty Filter
        if params[:ai_specialty].present?
          @providers = @providers.by_ai_specialty(params[:ai_specialty])
        end

        # Apply filters
        @providers = @providers.by_specialty(params[:specialty]) if params[:specialty].present?
        @providers = @providers.by_location(params[:location])   if params[:location].present?
        @providers = @providers.rated_above(params[:rating])     if params[:rating].present?

        # Sorting
        @providers = case params[:sort]
                     when 'rating_desc'    then @providers.order(rating: :desc)
                     when 'rating_asc'     then @providers.order(rating: :asc)
                     when 'price_desc'     then @providers.order(hourly_rate: :desc)
                     when 'price_asc'      then @providers.order(hourly_rate: :asc)
                     when 'experience_desc' then @providers.order(experience_years: :desc)
                     else                      @providers.order(created_at: :desc)
                     end

        # Pagination
        per_page    = [ [params[:per_page].to_i, 1].max, 100 ].min
        per_page    = 20 if params[:per_page].blank?
        page        = [ params[:page].to_i, 1 ].max
        page        = 1  if params[:page].blank?
        total       = @providers.count
        total_pages = (total.to_f / per_page).ceil

        # Eager load availabilities on the paginated slice only, then
        # materialize so .any? uses the loaded association.
        paginated = @providers
                      .offset((page - 1) * per_page)
                      .limit(per_page)
                      .includes(:availabilities)
                      .load

        render json: {
          providers: paginated.map { |p|
            p.as_detail_json(has_availability: p.availabilities.any?)
          },
          total:        total,
          page:         page,
          per_page:     per_page,
          total_pages:  total_pages,
          ai_filtered:  params[:ai_specialty].present?
        }
      end

      # GET /api/v1/providers/:id
      def show
        provider = Provider.find(params[:id])
        render json: {
          provider: provider.as_detail_json(availabilities: provider.availabilities)
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Provider not found' }, status: :not_found
      end
    end
  end
end
