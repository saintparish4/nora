module Api
  module V1
    # Chart text for a patient. Pasted text arrives as JSON; files arrive as
    # multipart and are reduced to text before anything is stored.
    class ChartDocumentsController < ApplicationController
      # POST /api/v1/patients/:patient_id/chart_documents
      def create
        patient = current_organization.patients.find(params[:patient_id])
        attrs = params.permit(:kind, :title, :occurred_on)
        file = params[:file]

        body, source, filename, content_type =
          if file.respond_to?(:read)
            [ Chart::TextExtractor.call(file), "upload", file.original_filename, file.content_type ]
          else
            [ params[:body].to_s, "paste", nil, nil ]
          end

        document = patient.chart_documents.new(
          attrs.merge(organization: current_organization, uploaded_by: current_user, body: body,
                      source: source, original_filename: filename, content_type: content_type)
        )
        document.title = filename.presence || "Pasted note" if document.title.blank?

        if document.save
          log_phi_access("ChartDocument", document.id, :create)
          render json: { chart_document: document.as_api_json(include_body: true) }, status: :created
        else
          render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
        end
      rescue Chart::TextExtractor::Error => e
        render json: { errors: [ e.message ] }, status: :unprocessable_entity
      end

      # GET /api/v1/chart_documents/:id
      def show
        document = current_organization.chart_documents.find(params[:id])
        log_phi_access("ChartDocument", document.id, :view)
        render json: { chart_document: document.as_api_json(include_body: true) }
      end

      # DELETE /api/v1/chart_documents/:id
      def destroy
        document = current_organization.chart_documents.find(params[:id])
        if document.destroy
          log_phi_access("ChartDocument", document.id, :delete)
          head :no_content
        else
          render json: { error: "This document is cited as evidence and cannot be deleted." }, status: :conflict
        end
      end
    end
  end
end
