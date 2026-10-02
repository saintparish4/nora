# Evidence eval

Measures one thing: when Nora reads a chart against a payer's criteria, does it
propose the right text for each criterion, and stay quiet when the chart does
not support one?

The system under test is `Authorizations::EvidenceExtractionService`, called
the way `ExtractEvidenceJob` calls it, on a request built through
`Authorizations::CreateService`. Nothing is re-implemented here.

## What a case is

One request: a synthetic chart (one to three documents), a medication, and a
plan. `cases/*.yml` holds the 31 cases and, for each payer criterion, a label
written by a person reading the chart. `LABELING.md` gives the rule behind each
label. `REVIEW.md` shows every case in full.

## What is scored

| Metric | Question | A system that proposes nothing | A system that proposes every line |
|---|---|---|---|
| `clean` | On requirements the chart does not support, how often was nothing proposed? | 1.0 | 0.0 |
| `found` | On requirements the chart supports, how often was a supporting passage proposed? | 0.0 | 1.0 |
| `precision` | Of everything proposed, how much supports its criterion? | n/a | low |
| `verbatim` | Does every stored excerpt equal the chart text at its offsets? | 1.0 | 1.0 |

`clean` and `found` pull against each other, so neither is reported alone.
Scores are per case, then averaged over cases with a bootstrap interval.

The service never marks a requirement met; a person verifies every excerpt.
So this eval measures what the reviewer is handed, not a final decision.

## Running it

```bash
bin/rails eval:evidence:selfcheck     # prove the harness first; must exit 0
bin/rails eval:evidence               # rule pass only -> evals/evidence/baseline
bin/rails eval:evidence ROUND=v1      # after a change, a new round
bin/rails eval:evidence:summary       # totals by criterion and by source
bin/rails eval:evidence:graded        # GRADED.md: graded examples, train slice
python3 ~/.claude/skills/eval-discipline/scripts/score.py evals/evidence --metric clean
python3 ~/.claude/skills/eval-discipline/scripts/score.py evals/evidence --metric found --split test
```

The model pass costs money and needs a key:

```bash
OPENAI_API_KEY=... bin/rails eval:evidence MODEL=on CASES=pass_basic,fill_only_pharmacy_record ROUND=model_pilot
OPENAI_API_KEY=... bin/rails eval:evidence MODEL=on REPS=3 ROUND=model_baseline CONFIRM_SPEND=yes
```

Run the pilot first and read its token counts from `results.jsonl`; estimate
the full run from those, not from a guess. The model is not deterministic, so
use three or more reps.

Each run uses a scratch SQLite database (`storage/eval.sqlite3`) that is
deleted and rebuilt, so it never touches development or test data.

## What a run writes

`<round>/results.jsonl` (one row per case and rep), `errors.jsonl` (attempts
that failed and were not scored, with a class), `traces/` (the chart, the
criteria, every proposal and its verdict, and what the service recorded), and
`fingerprint.json` (commit, policy library digest, prompt digest, model served).
A crashed run resumes; rows already written are skipped.

A model outage, a cut-off answer, or a model other than the one requested is an
error, not a score. The service keeps the rule evidence when the model fails,
which is right for the app and would otherwise make an outage look like a
result here.

## Rules for using the numbers

- **Train and test.** `state.json` fixes a random split. Whoever changes the
  service reads failures from the train slice only (`GRADED.md` shows only
  train). The number to quote comes from `--split test`.
- **The policy library is pinned.** `state.json` holds a digest of the criteria
  and rule hints the labels were written against. If the library changes, the
  run stops until the labels are re-read.
- **Sign-offs.** `state.json` records whether the owner has approved the cases
  and the grading. Until both are set, treat every number as provisional.

## Known limits

- The cases are synthetic, short, and written by someone who had read the rule
  pass. Real charts are longer and messier. Cases written from memory by
  someone who does this work would make `found` more trustworthy.
- One therapeutic area (GLP-1 weight management) and an illustrative policy
  library.
- 31 cases resolve large differences only. The interval on `clean` is about
  20 points either way.
