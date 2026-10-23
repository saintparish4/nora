module Tasks
  # Records that staff asked the prescriber's office for documentation the
  # chart lacks. The task stays open and stays with staff: nothing waits on the
  # answer, and the rest of the request carries on.
  class AskPrescriberService
    def self.call(...) = new(...).call

    def initialize(task, actor:)
      @task = task
      @actor = actor
    end

    def call
      raise Authorizations::Error, "Only an open task can be sent to the prescriber's office." unless @task.status == "open"

      @task.update!(asked_prescriber_at: Time.current)
      subject = @task.subject
      if subject.is_a?(PriorAuthorization)
        WorkflowEvent.record!(subject: subject, event_type: "asked_prescriber", actor: @actor,
                              payload: { task_id: @task.id, prescriber_id: subject.requested_by_id })
      end
      @task
    end
  end
end
