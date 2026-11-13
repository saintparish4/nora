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
| Bundles are valid FHIR | HL7 validator 7.0.5 against US Core 6.1.0 on all 1,000 generated bundles: **0 errors, 0 warnings** ([result](results/fhir-validation/copula-v1.json)) | Shown |
| The record, the note and the table agree | Every bundle is read back into its table row before it is written, and every answer-key entry is checked against the bundle (`tests/test_fhir.py`, `tests/test_note.py`) | Shown |
| The generator is closer to real data than Synthea | Fidelity on the open demo, below | Shown, on 42 real admissions |
| A model trained on the synthetic data is as good as one trained on real data | Needs a real test set with 30 readmissions. The open demo's has none | **Not assessable on open data** |
| The synthetic data does not reveal who was in the training data | Fails at this training size, below | **Not met** |

## Results

Real data is the MIMIC-IV open demo: 50 heart disease admissions, 42 for
training and 8 held out. That is too few for a verdict on usefulness or
privacy, and the protocol refuses to give one.

Fidelity against the 42 training admissions (0 is identical; the
discriminator is at 0.5 when real and synthetic rows cannot be told apart):

| | Per-column distance | Correlation gap | Discriminator |
|---|---|---|---|
| Synthea v4.0.0 | 0.356 | 0.188 | 0.995 |
| This generator (`copula-v1`) | 0.021 | 0.099 | 0.229 |

The discriminator of 0.229 is not good news. A value well under 0.5 means
the synthetic rows sit closer to the training rows than a fresh sample
would, which is what a privacy leak looks like.

To measure that properly, the generator is fit to an invented process
where the truth is known and non-members are unlimited
(`nora selfcheck --generator`, [result](results/fixture/copula-by-training-size.json)):

| Fit to | Utility (synthetic minus real AUROC, must stay above -0.05) | Membership attack AUROC (must stay at or under 0.55) |
|---|---|---|
| 42 admissions | -0.002 [-0.036, +0.032] pass | 0.624 [0.529, 0.712] **fail** |
| 100 | +0.036 [+0.001, +0.068] pass | 0.583 [0.526, 0.643] **fail** |
| 300 | -0.007 [-0.030, +0.015] pass | 0.535 [0.501, 0.569] **fail** |
| 1,000 | -0.029 [-0.051, -0.008] **fail** | 0.516 [0.491, 0.540] pass |
| 3,000 | -0.006 [-0.020, +0.008] pass | 0.515 [0.494, 0.535] pass |

Read plainly: the method works when it has data, and 42 admissions is not
enough. Fit to 42, it never copies a row, but it tells an attacker more
than chance about who was in the training set. The 42 are patients of an
already public, de-identified dataset, so nothing private is exposed
here, but the same generator fit to 42 private patients would not be safe
to release. Smoothing and stronger shrinkage were tried and did not close
the gap. More training data does.

## Reproduce it

Needs [uv](https://docs.astral.sh/uv/), and Java 17 or newer for the
validator and Synthea.

```bash
uv sync
uv run pytest -q                      # 140 tests, about a minute
uv run nora selfcheck                 # the scorer on known verdicts
uv run nora selfcheck --generator     # the generator by training size
```

With the open demo ([15.5 MB, no account needed](https://physionet.org/content/mimic-iv-demo/2.2/))
unzipped under `data/raw/`:

```bash
uv run nora cohort --mimic data/raw/mimic-iv-clinical-database-demo-2.2 --name mimic-iv-demo-2.2
uv run nora generate --name mimic-iv-demo-2.2
uv run nora score --name mimic-iv-demo-2.2 --synthetic generated/copula-v1/admissions.csv --system copula-v1
uv run nora render --table generated/copula-v1/admissions.csv --out data/records/copula-v1
uv run nora validate --bundles data/records/copula-v1 --system copula-v1
```

`nora cohort` checks the data against [protocol/lock.json](protocol/lock.json)
and `nora generate` prints the table's sha256, which should be
`644d65ba0980b0eb4a0b28251c249e44ce69b81b3dfd3b188b11d23f78d5b576`.

## What is in a record

[generated/copula-v1/sample](generated/copula-v1/sample) holds 25
admissions, three files each:

- `<id>.json`: a FHIR transaction bundle. Patient, the admission with its
  ranked ICD-10-CM diagnoses, lab results, any earlier admissions and
  readmission, and the note as a DocumentReference.
- `<id>.txt`: the discharge note.
- `<id>.key.json`: for each fact the note states, the table column, the
  value, and the character offsets of the words that state it. Conditions
  the note denies ("No history of diabetes") are keyed as absent.

The note is a template. It is not meant to pass for a clinician's writing.

## How it is built

| Module | Job |
|---|---|
| `schema`, `codes` | What an admission is: one table row, and which diagnosis codes count |
| `mimic`, `synthea` | Real data and the Synthea baseline, mapped into that table |
| `split` | The held-out test set, chosen by a hash and locked |
| `score`, `fixture`, `selfcheck` | Utility, fidelity and privacy, proven on data with known answers |
| `generate` | The generator: a Gaussian copula with a latent mean per diagnosis group |
| `chart`, `fhir`, `note`, `records` | One row as a FHIR bundle, a note and an answer key that agree |
| `validate` | The pinned HL7 validator |

## Known limits

- Everything real here is 50 admissions from one hospital. Scores on it are
  a plumbing check (PROTOCOL.md section 13).
- The generator fails the privacy test at this training size.
- Every synthetic patient has one index admission. Earlier admissions
  exist only as dates.
- Missing lab values are drawn independently, though real ones go missing
  together.
- Not yet built: injected defects with an answer key, a second site, and a
  blind real-versus-synthetic packet for a clinician.

The generated data is under the Open Database License; see
[generated/copula-v1/NOTICE.md](generated/copula-v1/NOTICE.md).
