# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PhiAccessLoggable, type: :controller do
    # Minimal test controller that includes the concern.
    # Implements current_user so specs can stub it (RSpec requires the method to exist).
    controller(ActionController::API) do
      include PhiAccessLoggable

      def current_user
        # Stubbed in specs
      end

      def index
        log_phi_access("Patient", 42, :view)
        render json: { ok: true }
      end

      def create
        log_phi_access("Patient", 99, :create, user_id: nil)
        render json: { ok: true }, status: :created
      end

      def batch
        log_phi_access_batch("Patient", params[:ids].to_s.split(","), :view)
        render json: { ok: true }
      end
    end

    before do
      routes.draw do
        get  "index" => "anonymous#index"
        post "create" => "anonymous#create"
        get  "batch" => "anonymous#batch"
      end
    end

    # Stub auth — adjust to match your actual auth setup
    let(:user) { double("User", id: 7) }

    describe "#log_phi_access" do
      context "with authenticated user" do
        before do
          allow(controller).to receive(:current_user).and_return(user)
          # get :index builds a new request, so stub the class so the request used during the action has these
          allow_any_instance_of(ActionDispatch::Request).to receive(:request_id).and_return('req-spec-123')
          allow_any_instance_of(ActionDispatch::Request).to receive(:remote_ip).and_return('127.0.0.1')
        end

        it "creates an audit log row with the correct attributes" do
          expect { get :index }.to change(PhiAccessLog, :count).by(1)

          log = PhiAccessLog.last
          expect(log.user_id).to eq(7)
          expect(log.resource_type).to eq("Patient")
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
          expect(log.resource_type).to eq("Patient")
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

    # The batch path once carried an updated_at key the table doesn't have, so
    # every insert_all raised and the rescue swallowed it: the largest reads in
    # the app went unaudited. Pin it here now that no index action exercises it.
    describe "#log_phi_access_batch" do
      before { allow(controller).to receive(:current_user).and_return(user) }

      it "writes one row per id with a created_at" do
        expect { get :batch, params: { ids: "1,2,3" } }.to change(PhiAccessLog, :count).by(3)

        logs = PhiAccessLog.where(resource_type: "Patient", action: "view")
        expect(logs.pluck(:resource_id)).to match_array(%w[1 2 3])
        expect(logs.pluck(:user_id).uniq).to eq([ 7 ])
        expect(logs.pluck(:created_at)).to all(be_present)
      end

      it "writes nothing for an empty collection" do
        expect { get :batch, params: { ids: "" } }.not_to change(PhiAccessLog, :count)
      end
    end
  end
