require "active_support/testing/time_helpers"

module Demo
  # Plays one demo request forward through the real workflow services, each
  # step at its own simulated time. The demo practice therefore has history
  # that obeys every rule a live request does: quotes that match the chart,
  # events with actors, an approval with a pinned digest.
  #
  # Only the rule pass of extraction runs, so seeding never calls a model.
  #
  # Time is stubbed process-wide while a step runs. Use this from seeds and
  # rake tasks only, never from a request or a job inside the server.
  class Story
    include ActiveSupport::Testing::TimeHelpers

    # Gap between consecutive steps, so events keep a readable order.
    PACE = 40.seconds

    attr_reader :prior_authorization

    def self.play(**options)
      story = new(**options)
      yield story
      story.prior_authorization.reload
    end

    # @param staff [User] opens the request and reviews the evidence
    # @param clinician [User] ordered the item and approves the packet
    def initialize(patient:, item_name:, staff:, clinician:, starts_at:)
      @patient = patient
      @staff = staff
      @clinician = clinician
      @clock = starts_at
      @prior_authorization = step do
        Authorizations::CreateService.call(
          organization: patient.organization, actor: staff, patient: patient, coverage: patient.coverages.first!,
          item_name: item_name, requested_by: clinician, assigned_to: staff
        )
      end
    end

    # Let time pass before the next step.
    def wait(duration)
      @clock += duration
    end

    # Move the clock to a later moment.
    def at(time)
      raise ArgumentError, "a story only moves forward in time" if time < @clock

      @clock = time
    end

    def extract
      step { Authorizations::EvidenceExtractionService.call(pa, actor: @staff, model_pass: false) }
    end

    # Staff reject the excerpts containing any of `rejecting`, verify the rest,
    # and mark the requirement met.
    def meet(position, rejecting: [])
      review_evidence(position, rejecting: rejecting)
      decide(position, "met")
    end

    # Staff reject the excerpts containing any of `rejecting` and mark the
    # requirement missing, which opens a task for the ordering clinician.
    def missing(position, note:, rejecting: [])
      review_evidence(position, rejecting: rejecting, verify_rest: false)
      decide(position, "missing", note: note)
    end

    def not_applicable(position, note:)
      decide(position, "not_applicable", note: note)
    end

    # Staff cite chart text the rule pass did not find.
    def cite(position, document:, quote:)
      chart_document = @patient.chart_documents.find_by!(title: document)
      step { Authorizations::AddEvidenceService.call(requirement(position), actor: @staff, document: chart_document, quote: quote) }
    end

    def approve
      step { Authorizations::ApproveService.call(pa, actor: @clinician) }
    end

    def move_to(status, **details)
      step { Authorizations::ManualTransitionService.call(pa, actor: @staff, to: status, **details) }
    end

    private

    def pa
      @prior_authorization.reload
    end

    def requirement(position)
      pa.requirements.joins(:policy_criterion).find_by!(policy_criteria: { position: position })
    end

    def review_evidence(position, rejecting:, verify_rest: true)
      unmatched = rejecting.dup
      requirement(position).evidence.each do |evidence|
        rejected = rejecting.find { |text| evidence.excerpt.include?(text) }
        unmatched.delete(rejected)
        next unless rejected || verify_rest

        step { Authorizations::EvidenceReviewService.call(evidence, actor: @staff, action: rejected ? "reject" : "verify") }
      end
      raise ArgumentError, "criterion #{position} has no excerpt containing #{unmatched.first.inspect}" if unmatched.any?
    end

    def decide(position, status, note: nil)
      step { Authorizations::RequirementReviewService.call(requirement(position), actor: @staff, status: status, note: note) }
    end

    def step
      result = travel_to(@clock) { yield }
      @clock += PACE
      result
    end
  end
end
