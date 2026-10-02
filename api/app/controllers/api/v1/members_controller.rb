module Api
  module V1
    # Staff accounts within the practice. Admins add people with a temporary
    # password and set roles; there is no self-service join.
    class MembersController < ApplicationController
      before_action :require_admin!, only: [ :create, :update ]
      before_action :refuse_in_demo_practice!, only: [ :create, :update ]
      before_action :reject_unknown_role, only: [ :create, :update ]

      # GET /api/v1/organization/members
      def index
        members = current_organization.users.order(:last_name, :first_name, :email)
        render json: { members: members.map(&:as_member_json) }
      end

      # POST /api/v1/organization/members
      def create
        user = current_organization.users.new(params.permit(:email, :first_name, :last_name, :password))
        user.password_confirmation = user.password
        user.role = requested_role || "staff"

        if user.save
          render json: { member: user.as_member_json }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/organization/members/:id
      def update
        user = current_organization.users.find(params[:id])
        if user == current_user && params[:role].present? && params[:role] != "admin"
          return render json: { error: "You cannot remove your own admin role." }, status: :unprocessable_entity
        end

        user.assign_attributes(params.permit(:first_name, :last_name))
        user.role = requested_role if requested_role

        if user.save
          render json: { member: user.as_member_json }
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def reject_unknown_role
        return if params[:role].blank? || requested_role

        render json: { errors: [ "Role must be one of: #{User::ROLES.join(', ')}" ] }, status: :unprocessable_entity
      end

      # Roles are assigned from a fixed list, never mass-assigned. Only admins
      # reach the actions that call this.
      def requested_role
        role = params[:role].to_s
        User::ROLES.include?(role) ? role : nil
      end
    end
  end
end
