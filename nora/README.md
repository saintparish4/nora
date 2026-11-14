# Nora

A synthetic patient record generator for adult heart disease admissions,
scored against real data.

It produces three things for each synthetic admission: a FHIR bundle (US
Core 6.1.0), a discharge note that states the same facts, and an answer
key that says where in the note each fact is. It is meant for testing
software that reads charts, where the right answer has to be known.

Every claim below is a number a stranger can reproduce from this
directory. The rules they are judged by are in [PROTOCOL.md](PROTOCOL.md),
which was committed before any result existed.

## What has been shown, and what has not

| Claim | Evidence | Status |
|---|---|---|
| The scorer gives right verdicts | `nora selfcheck`: four stand-ins with known verdicts, including a verbatim copy that must fail privacy | Shown |
| Bundles are valid FHIR | HL7 validator 7.0.5 against US Core 6.1.0 on all 1,000 generated bundles: **0 errors, 0 warnings** ([result](results/fhir-validation/copula-v2.json)) | Shown |
| The record, the note and the table agree | Every bundle is read back into its table row before it is written, and every answer-key entry is checked against the bundle | Shown |
| The generator is closer to real data than Synthea | Fidelity on two open datasets, below | Shown, on 42 and 206 real admissions |
| The method holds at a second site | Repeated on the open eICU demo, 206 training admissions from other hospitals | Shown for fidelity; too few deaths for a verdict on usefulness |
| The numbers reproduce | CI rebuilds both cohorts from the open data, redraws the synthetic tables and rescores them against the committed results | Shown |
| Planted defects can be found by the answer key, and a validator misses most | 300 defects in 1,100 bundles, below | Shown |
| A model trained on the synthetic data is as good as one trained on real data | Needs a real test set with 30 outcomes. The open ones hold 0 and 5 | **Not assessable on open data** |
| The synthetic data does not reveal who was in the training data | No leak is detectable, but the protocol cannot call so few admissions private | **Not met**: see Privacy |
| A clinician cannot tell real from synthetic | The blind packet is built and scored by `nora packet`. No clinician has rated one | **Not run** |

## Results

Two open datasets stand in for real data. Both are far too small for a
verdict on usefulness or privacy, and the protocol refuses to pretend
otherwise.

| | MIMIC-IV demo | eICU demo |
|---|---|---|
| Heart disease admissions | 50, one hospital | 261, many hospitals, all with intensive care |
| For training / held out | 42 / 8 | 206 / 55 |
| Outcome scored | readmission in 30 days | death in hospital |
| Outcomes in the held-out set | 0 | 5 |

### Fidelity

Against the training admissions. 0 is identical; the discriminator is at
0.5 when real and synthetic rows cannot be told apart.

| | Per-column distance | Correlation gap | Discriminator |
|---|---|---|---|
| **MIMIC-IV demo** | | | |
| Synthea v4.0.0 | 0.356 | 0.188 | 0.995 |
| This generator (`copula-v2`) | 0.021 | 0.151 | 0.285 |
| **eICU demo** | | | |
| Synthea v4.0.0 | 0.395 | 0.102 | 1.000 |
| This generator (`copula-v2`) | 0.016 | 0.056 | 0.584 |
| Two real samples of eICU, for scale | 0.067 | 0.101 | 0.497 |

On eICU the generator is closer to the training data than a second real
sample is, column by column, and a classifier separates it at 0.584. On the
MIMIC-IV demo a discriminator under 0.5 says the 42 synthetic rows it was
shown sit closer to the 42 training rows than chance would put them. That
is the subject of the next section.

### Privacy

The first version of the generator leaked. A membership attack asks, for
each real patient, whether a synthetic row sits unusually close to them;
0.5 is chance, and the protocol passes a table only when the whole 95%
interval is at or under 0.55.

To measure it with unlimited non-members, both versions are fit to an
invented process where the truth is known (`nora selfcheck --generator`,
[result](results/fixture/copula-by-training-size.json)). The middle
column is a fresh sample of the real process, the best any generator
could do:

| Fit to | A fresh real sample | Version 1 | Version 2 |
|---|---|---|---|
| 42 admissions | 0.533 [0.443, 0.622] fail | 0.624 [0.529, 0.712] fail | 0.519 [0.436, 0.595] fail |
| 100 | 0.493 [0.435, 0.553] fail | 0.583 [0.526, 0.643] fail | 0.517 [0.462, 0.580] fail |
| 300 | 0.510 [0.476, 0.546] pass | 0.535 [0.501, 0.569] fail | 0.513 [0.478, 0.549] pass |
| 1,000 | 0.521 [0.495, 0.548] pass | 0.516 [0.491, 0.540] pass | 0.510 [0.487, 0.535] pass |
| 3,000 | 0.509 [0.490, 0.530] pass | 0.515 [0.494, 0.535] pass | 0.521 [0.500, 0.541] pass |

Three things to read from it.

- **Version 1 leaked, and version 2 does not detectably.** Version 1
  learned 153 correlations and 72 group differences from 42 patients. Most
  of what it learned was those 42 patients. Version 2 keeps a relationship
  only when the data can tell it from chance, and its attack score follows
  the fresh sample's at every size.
- **Below about 300 admissions nothing passes, not even real data.** The
  interval is too wide. The protocol is built to fail when it cannot tell,
  so on 42 admissions "fail" describes the amount of data.
- **Privacy is paid for in usefulness.** On the same runs, the AUROC lost
  by training on synthetic rows instead of real ones (it must stay above
  -0.05):

| Fit to | Version 1 | Version 2 |
|---|---|---|
| 42 | -0.002 pass | -0.067 **fail** |
| 100 | +0.036 pass | -0.031 **fail** |
| 300 | -0.007 pass | -0.130 **fail** |
| 1,000 | -0.029 **fail**, by 0.001 | -0.022 pass |
| 3,000 | -0.006 pass | -0.010 pass |

  From 42 patients a model can be useful or private, not both: what makes
  it useful is what it learned about them. Version 2 chooses private, and
  both properties hold together only from about 1,000 admissions.

On the real open data:

| | Attack AUROC | Verdict |
|---|---|---|
| MIMIC-IV demo, `copula-v2` | 0.393 [0.193, 0.592] | not assessable: 8 non-members |
| eICU demo, `copula-v2` | 0.474 [0.384, 0.560] | **fail**: the interval ends 0.010 above the ceiling |
| eICU demo, Synthea | 0.522 [0.432, 0.624] | **fail** |

Synthea has never seen eICU and cannot leak it, and it fails the same test
by more. With 206 members the test cannot pass anything. So the claim
stands as not met: there is no sign of a leak, and not enough open data to
show its absence.

### Usefulness

Not assessable. On eICU the numbers that exist are a model trained on real
data scoring 0.910, on this generator's data 0.824, and on Synthea's
0.339, with 5 deaths in the held-out set. They are reported because they
came out, and they are not evidence.

### Planted defects

`nora defects` plants three kinds of defect in clean bundles and writes an
answer key. As a baseline, the HL7 validator was run on 1,100 bundles
holding 300 of them ([result](results/fhir-validation/copula-v2-defects.json)):

| Defect | Planted | Bundles the validator reported |
|---|---|---|
| The same patient registered twice, with a name or birth date altered | 100 | 0 |
| A diagnosis code that contradicts one already present | 100 | 0 |
| A missing field | 100 | 69 |
| No defect | 800 | 0 |

It caught every missing sex, diagnosis code and lab value, which the
standard requires, and none of the 31 missing birth dates and encounter
periods, which it does not. Duplicates and contradictions are valid FHIR.
Finding them is the job of the software this data is meant to test.

## Reproduce it

Needs [uv](https://docs.astral.sh/uv/), and Java 17 or newer for the
validator and Synthea.

```bash
uv sync
uv run pytest -q                      # about two minutes
uv run nora selfcheck                 # the scorer on known verdicts
uv run nora selfcheck --generator     # both generator versions by training size
```

With the two open demos unzipped under `data/raw/` (no account needed:
[MIMIC-IV demo](https://physionet.org/content/mimic-iv-demo/2.2/),
[eICU demo](https://physionet.org/content/eicu-crd-demo/2.0.1/)), the
tests also rebuild every committed number:

```bash
export NORA_MIMIC_DEMO=data/raw/mimic-iv-clinical-database-demo-2.2
export NORA_EICU_DEMO=data/raw/eicu-collaborative-research-database-demo-2.0.1
uv run pytest -q
```

Step by step, for the MIMIC-IV demo:

```bash
uv run nora cohort --mimic $NORA_MIMIC_DEMO --name mimic-iv-demo-2.2
uv run nora generate --name mimic-iv-demo-2.2
uv run nora score --name mimic-iv-demo-2.2 --system copula-v2 \
  --synthetic generated/mimic-iv-demo-2.2/copula-v2/admissions.csv
uv run nora render --table generated/mimic-iv-demo-2.2/copula-v2/admissions.csv --out data/records
uv run nora validate --bundles data/records --system copula-v2
uv run nora defects --records data/records --out data/defects
uv run nora packet --name mimic-iv-demo-2.2 --out data/packet \
  --synthetic generated/mimic-iv-demo-2.2/copula-v2/admissions.csv
```

`nora cohort` checks the data against [protocol/lock.json](protocol/lock.json).
`nora generate` prints the table's sha256, which should be
`a09e4c6a247ebd58c911e7f2ac5de59999c1a61e8fc346744e78567080d88b4c`.

## What is in a record

[generated/mimic-iv-demo-2.2/copula-v2/sample](generated/mimic-iv-demo-2.2/copula-v2/sample)
holds 25 admissions, three files each:

- `<id>.json`: a FHIR transaction bundle. Patient, the admission with its
  ranked ICD-10-CM diagnoses, lab results, any earlier admissions and
  readmission, and the note as a DocumentReference.
- `<id>.txt`: the discharge note.
- `<id>.key.json`: for each fact the note states, the table column, the
  value, and the character offsets of the words that state it. Conditions
  the note denies ("No history of diabetes") are keyed as absent.

The note is a template. It is not meant to pass for a clinician's writing.

[defects](generated/mimic-iv-demo-2.2/copula-v2/defects) holds the same 25
bundles after `nora defects`, 5 duplicates added, with `answers.key.json`
naming every planted defect, the resource it is in and the original value.

## How it is built

| Module | Job |
|---|---|
| `schema`, `codes` | What an admission is: one table row, and which diagnosis codes count |
| `mimic`, `eicu`, `synthea` | Two real sources and the Synthea baseline, mapped into that table |
| `split` | The held-out test set, chosen by a hash and locked |
| `score`, `fixture`, `selfcheck` | Utility, fidelity and privacy, proven on data with known answers |
| `generate` | The generator: a Gaussian copula that keeps only the relationships the data supports |
| `chart`, `fhir`, `note`, `records` | One row as a FHIR bundle, a note and an answer key that agree |
| `defects` | Duplicates, contradicting codes and missing fields, planted with an answer key |
| `packet` | The blind real-or-synthetic packet for a clinician, and its scoring |
| `validate` | The pinned HL7 validator |

## Known limits

- Everything real here is 311 admissions from two open demos. Scores on
  them are a plumbing check (PROTOCOL.md section 13).
- Privacy is not shown, and usefulness cannot be assessed, on open data.
- Fit to fewer than about 1,000 admissions, version 2 gives up most of the
  relationships between columns, and with them most of its usefulness.
- eICU charts active problems, not history, so its comorbidity rates run
  far below MIMIC-IV's (diabetes 2% against 36%). The two sites are not
  compared on them.
- Every synthetic patient has one index admission. Earlier admissions
  exist only as dates.
- Missing lab values are drawn independently, though real ones go missing
  together.
- The blind packet shows admission cards, not notes, and has had no rater.
- Nothing here has been fit to, or scored on, the full MIMIC-IV or eICU.

The generated data is under the Open Database License; see the
`NOTICE.md` beside each table under [generated/](generated/).
