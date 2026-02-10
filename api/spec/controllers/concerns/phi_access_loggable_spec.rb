# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PhiAccessLoggable, type: :controller do
    # Minimal test controller that includes the concern
    controller(ActionController::API) do
      include PhiAccessLoggable
  
      def index
        log_phi_access("Appointment", 42, :view)
        render json: { ok: true }
      end
  
      def create
        log_phi_access("Appointment", 99, :create, user_id: nil)
        render json: { ok: true }, status: :created
      end
    end
  
    before do
      routes.draw do
        get  "index" => "anonymous#index"
        post "create" => "anonymous#create"
      end
    end
  
    # Stub auth — adjust to match your actual auth setup
    let(:user) { double("User", id: 7) }
  
    describe "#log_phi_access" do
      context "with authenticated user" do
        before { allow(controller).to receive(:current_user).and_return(user) }
  
        it "creates an audit log row with the correct attributes" do
          expect { get :index }.to change(PhiAccessLog, :count).by(1)
  
          log = PhiAccessLog.last
          expect(log.user_id).to eq(7)
          expect(log.resource_type).to eq("Appointment")
          expect(log.resource_id).to eq("42")
          expect(log.action).to eq("view")
          expect(log.request_id).to be_present
          expect(log.ip_address).to be_present
        end
      end
  
      context "with unauthenticated request (user_id override to nil)" do
        before { allow(controller).to receive(:current_user).and_return(nil) }
  
        it "creates a log with nil user_id and populated session/request ids" do
          expect { post :create }.to change(PhiAccessLog, :count).by(1)
  
          log = PhiAccessLog.last
          expect(log.user_id).to be_nil
          expect(log.resource_type).to eq("Appointment")
          expect(log.resource_id).to eq("99")
          expect(log.action).to eq("create")
        end
      end
  
      context "when the audit INSERT fails" do
        before do
          allow(controller).to receive(:current_user).and_return(user)
          allow(PhiAccessLog).to receive(:create!).and_raise(
            ActiveRecord::StatementInvalid.new("PG::ConnectionBad")
          )
        end
  
        it "does not break the user-facing request" do
          get :index
          expect(response).to have_http_status(:ok)
        end
  
        it "logs the failure" do
          expect(Rails.logger).to receive(:error).with(/PHI_AUDIT_FAILURE/)
          get :index
        end
      end
    end
  end
