module Tasks
  # Keeps follow-up tasks in step with a prior authorization's requirements.
  # A missing or unclear requirement gets one open task for the requesting
  # clinician; once resolved, the task closes. A closed or cancelled PA
  # dismisses whatever is left.
  class SyncService
    NEEDS_TASK = %w[missing unclear].freeze
    DUE_IN = 2.days

    def self.call(...) = new(...).call

    def initialize(prior_authorization, actor:)
      @pa = prior_authorization
      @actor = actor
    end

    def call
      open_tasks = Task.open.where(subject: @pa).to_a

      if %w[cancelled closed].include?(@pa.status)
        open_tasks.each { |task| task.update!(status: "dismissed") }
        return
      end

      @pa.requirements.includes(:policy_criterion).each do |requirement|
        existing = open_tasks.find { |t| t.source_type == "AuthorizationRequirement" && t.source_id == requirement.id }

        if NEEDS_TASK.include?(requirement.status)
          next if existing

          task = Task.create!(
            organization_id: @pa.organization_id,
            subject: @pa,
            source: requirement,
            assignee: @pa.requested_by,
            title: "Document for #{@pa.item_name}: #{requirement.policy_criterion.text.truncate(160)}",
            due_on: DUE_IN.from_now.to_date
          )
          WorkflowEvent.record!(subject: @pa, event_type: "task_created", actor: @actor,
                                payload: { task_id: task.id, requirement_id: requirement.id })
        elsif existing
          existing.update!(status: "done")
          WorkflowEvent.record!(subject: @pa, event_type: "task_completed", actor: @actor,
                                payload: { task_id: existing.id, requirement_id: requirement.id })
        end
      end
    end
  end
end
