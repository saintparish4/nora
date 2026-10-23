# Does the model help? An evaluation of Nora's evidence search

Nora reads a patient's chart against a payer's prior-authorization criteria and
proposes the sentences that document each one. A person verifies every quote.
The question this evaluation answers: **does adding a language model to the
hand-written rules make those proposals better?**

**Short answer: no.** On these cases the model found slightly more supporting
text, too little to measure, and proposed text for requirements the chart does
not support far more often. The app ships with the model pass off.

## What was measured

31 synthetic charts, each a prior-authorization request for a GLP-1 drug,
labelled by hand criterion by criterion: does the chart support it, and if so,
which sentences? Each system's proposals are graded against those labels:

- **clean**: on requirements the chart does *not* support, how often nothing
  was proposed. This is the costly error: a plausible wrong quote a busy
  reviewer may approve.
- **found**: on requirements the chart supports, how often a supporting
  sentence was proposed.
- **precision**: of everything proposed, how much was right.

Scores are per case with bootstrap intervals, compared on a held-out test
slice. The conditions and the decision rule were written down and committed
before the runs ([plan](../api/evals/evidence/PLAN-2026-10-22.md)).

## Results (test slice)

| System | clean | found | precision |
|---|---|---|---|
| Hand-written rules | **100** | 94 | **97** |
| Model alone (gpt-4o-mini) | 28 ▼ | 99 | 87 |
| Rules + model | 28 ▼ | 100 | 85 ▼ |
| Model only where the rules found nothing | 28 ▼ | 99 | 84 ▼ |
| Rules + model, filtered through medspaCy ConText | 57 ▼ | 97 | 90 ▼ |
| medspaCy/ConText baseline, no model | 89 | 92 | 97 |

▼: worse than the rules by more than the eval's error margin (99% paired
interval, corrected for five comparisons). No condition is better than the
rules by a margin the eval can resolve.

## What it means

- **The model's mistakes are the classic clinical-NLP traps.** It quoted a
  drug that was discussed and declined as a "trial", a diet that was advised as
  a program, a BMI below the threshold, a BMI from an outdated note. Most
  repeat in all three runs; they are systematic, not noise.
- **A negation filter fixes only what it models.** ConText removed the model's
  errors on negation and on relatives' conditions, and none of its errors on
  advice, timing, thresholds, or which document may carry a fact.
- **"Only where the rules found nothing" cannot help.** The rules propose
  nothing on unsupported requirements, so that gate lets every model error
  through on exactly those requirements.
- **An off-the-shelf clinical NLP tool did about as well as the hand-written
  rules**, using the same vocabulary, with no tuning of its own.

## What it cannot show

- **Real charts.** The charts are synthetic, short, and written by the same
  person who wrote the rules, so the rules' perfect scores flatter them.
- **Small differences.** 9 test cases decide `clean`; resolving a 10-point
  change would take about 100 ([power calculation](../api/evals/evidence/PROTOCOL.md#5-power-and-labelling-protocol)).
- **Other models or prompts.** Only gpt-4o-mini with the current prompt was run.
- **Real payers, for the cases.** The cases were labelled against an earlier,
  illustrative set of criteria. The app now uses criteria sourced from
  UnitedHealthcare, Aetna, Cigna and the BCBS Federal Employee Program, and
  45% of the labelled requirements test criteria those payers do not have
  ([the comparison](../api/evals/evidence/policies/DIFF.md)). The eval runs on a
  frozen copy of the old criteria, so its numbers stay comparable.

## Where to look

| | |
|---|---|
| How the eval works, how to run it | [api/evals/evidence/README.md](../api/evals/evidence/README.md) |
| The pre-registered plan, and the results with every caveat | [PLAN](../api/evals/evidence/PLAN-2026-10-22.md), [RESULTS](../api/evals/evidence/RESULTS-2026-10-22.md) |
| Every failure, tagged by type | [taxonomy.yml](../api/evals/evidence/taxonomy.yml) |
| Published payer criteria, with sources | [policies/](../api/evals/evidence/policies/) |
| What a real deployment would need (independent reviewers, a public benchmark, a study of the human check) | [PROTOCOL.md](../api/evals/evidence/PROTOCOL.md) |

Total model spend for everything above: about $0.08.
