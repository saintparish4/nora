module Triage
  # The report the whole risk_assessments table exists to produce.
  #
  # Two very different questions live here, and conflating them is the easiest
  # way to tell a flattering lie:
  #
  # 1. **Follow-through** — did the patient act on the recommendation, and what
  #    became of the booking? Computable today, from data we own end to end.
  # 2. **Routing concordance** — was the recommendation *clinically correct*?
  #    Only answerable for assessments a clinician has graded by setting
  #    actual_care_level. That is currently nobody, so this section will report
  #    n=0 until there is a provider-facing way to record a disposition.
  #
  # Reporting (2) from (1) would be the flattering lie: a patient attending the
  # appointment they were sent to says nothing about whether it was the right
  # appointment. The report keeps them apart and states the sample size for
  # each, so a small n is visible rather than persuasive.
  class ConcordanceReportService
    def self.call(since: nil, until_time: nil)
      new(since: since, until_time: until_time).call
    end

    def initialize(since: nil, until_time: nil)
      @since = since
      @until_time = until_time
    end

    def call
      {
        generated_at: Time.current.iso8601,
        window: { since: @since&.iso8601, until: @until_time&.iso8601 },
        totals: totals,
        follow_through: follow_through,
        concordance: concordance,
        calibration: calibration
      }
    end

    private

    def scope
      relation = RiskAssessment.all
      relation = relation.where(created_at: @since..) if @since
      relation = relation.where(created_at: ..@until_time) if @until_time
      relation
    end

    def totals
      {
        assessments: scope.count,
        with_outcome: scope.with_outcome.count,
        awaiting_outcome: scope.awaiting_outcome.count,
        clinically_graded: scope.scorable.count
      }
    end

    # Outcome mix per predicted care level. Read the counts, not the rates,
    # until n is respectable.
    def follow_through
      RiskAssessment::CARE_LEVELS.index_with do |level|
        rows = scope.where(care_level: level)
        resolved = rows.with_outcome
        by_outcome = resolved.group(:outcome).count

        {
          predicted: rows.count,
          resolved: resolved.count,
          outcomes: RiskAssessment::OUTCOMES.index_with { |o| by_outcome.fetch(o, 0) },
          booked_rate: ratio(resolved.where.not(outcome: "not_booked").count, resolved.count),
          no_show_rate: ratio(by_outcome.fetch("no_show", 0), resolved.count)
        }
      end
    end

    # The defensibility number. Deliberately reports nothing at all rather than
    # a reassuring 100% when no clinician has graded anything.
    def concordance
      graded = scope.scorable
      n = graded.count

      return { sample_size: 0, available: false, note: no_grading_note } if n.zero?

      rows = graded.to_a
      under = rows.count(&:under_triaged?)

      {
        sample_size: n,
        available: true,
        concordant: ratio(rows.count { |r| r.concordant? }, n),
        # The one that can end the company: routed to a lower acuity than the
        # patient turned out to need. Tracked on its own, never netted off
        # against over-triage.
        under_triage_rate: ratio(under, n),
        over_triage_rate: ratio(rows.count { |r| (r.triage_delta || 0).positive? }, n),
        by_predicted_level: RiskAssessment::CARE_LEVELS.index_with do |level|
          level_rows = rows.select { |r| r.care_level == level }
          {
            sample_size: level_rows.size,
            concordant: ratio(level_rows.count { |r| r.concordant? }, level_rows.size),
            under_triaged: level_rows.count(&:under_triaged?)
          }
        end
      }
    end

    # Is the model's stated confidence worth anything? Buckets of 10, each
    # reporting how often a graded assessment in that bucket was right. Also
    # empty until grading exists.
    def calibration
      graded = scope.scorable.where.not(confidence: nil).to_a
      return { sample_size: 0, available: false, note: no_grading_note } if graded.empty?

      buckets = graded.group_by { |r| (r.confidence / 10) * 10 }

      {
        sample_size: graded.size,
        available: true,
        buckets: buckets.transform_values do |rows|
          {
            sample_size: rows.size,
            stated_confidence: "#{rows.first.confidence / 10 * 10}-#{(rows.first.confidence / 10 * 10) + 9}",
            actual_accuracy: ratio(rows.count { |r| r.concordant? }, rows.size)
          }
        end.sort.to_h
      }
    end

    def no_grading_note
      "No assessment has actual_care_level set. Concordance and calibration " \
      "need a clinician-recorded disposition; follow-through above does not " \
      "substitute for it."
    end

    def ratio(numerator, denominator)
      return nil if denominator.to_i.zero?

      (numerator.to_f / denominator).round(4)
    end
  end
end
