module Api
  module V1
    class TasksController < ApplicationController
      # GET /api/v1/tasks?status=open&mine=true
      def index
        scope = current_organization.tasks.includes(:assignee, subject: :patient).order(Arel.sql("due_on IS NULL"), :due_on, :id)
        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.where(assignee: current_user) if params[:mine] == "true"
        tasks, meta = paginate(scope, default_per: 50)
        render json: { tasks: tasks.map(&:as_api_json), meta: meta }
      end

      # PATCH /api/v1/tasks/:id  { status, assignee_id }
      def update
        task = current_organization.tasks.find(params[:id])
        attrs = params.permit(:status, :due_on)
        attrs[:assignee] = current_organization.users.find(params[:assignee_id]) if params[:assignee_id].present?

        if task.update(attrs)
          render json: { task: task.as_api_json }
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end
