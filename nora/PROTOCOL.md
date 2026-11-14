# Scoring protocol: synthetic heart disease admissions

Version 1, written 2026-11-10, before any generator of ours exists.

This file is the contract. Its sha256 is pinned in `protocol/lock.json`,
so a later edit is visible. Section numbers are cited from the code; do
not renumber them. Changes go in section 15, never silently into the text.

## 1. What is being claimed

One claim, for one population and one task:

> A synthetic table of adult heart disease admissions can stand in for the
> real table when training a 30-day readmission model, without revealing
> which real patients it was built from.

Three measurements test it: utility (section 6), fidelity (section 7), and
privacy (section 8). All three are reported together, always. A table that
is perfect on two can be worthless on the third (section 9 shows how).

Not claimed: that the readmission model is clinically useful, that the
synthetic records are realistic to a clinician (section 12 tests that
separately), or anything about other populations.

## 2. Cohort

An index admission is a hospital admission that meets all of:

1. **Primary diagnosis is a disease of the heart**, as the US National
   Center for Health Statistics defines the term for its leading-causes
   tables: ICD-10 I00-I09, I11, I13, I20-I51. For records coded in ICD-9
   the same definition is 390-398, 402, 404, 410-429. Only the first-listed
   diagnosis counts.
2. **The patient is 18 or older** at admission.
3. **Discharge is after admission.** Anything else is a data error.

The definition is an external one so that it cannot be tuned after results
are seen. Hypertension without heart involvement (I10, I12) and stroke
(I60-I69) are outside it.

A patient can contribute several index admissions.

## 3. The admission table

Every source is mapped into one table, one row per index admission. Scoring
only ever sees this table.

| Column | Meaning | Type |
|---|---|---|
| `source`, `patient_id`, `admission_id` | Where the row came from | text |
| `age` | Completed years at admission | number |
| `los_days` | Discharge minus admission, in days | number |
| `prior_admissions_365d` | The patient's other admissions discharged in the 365 days before this one began | number |
| `creatinine`, `bun`, `sodium`, `potassium`, `hemoglobin` | Last result of the admission (mg/dL, mg/dL, mmol/L, mmol/L, g/dL) | number |
| `male`, `emergency`, `discharged_home` | Sex; unplanned route in; went home (with or without home care) | 0/1 |
| `diabetes`, `ckd`, `copd`, `hypertension`, `afib` | Any diagnosis position, not only the first | 0/1 |
| `dx_group` | `ischemic`, `heart_failure`, `arrhythmia` or `other`, from the primary diagnosis | category |
| `died_in_hospital`, `readmit_30d` | Outcomes (section 4) | 0/1 |

Rules:

- A column a source cannot supply is present and entirely missing. It is
  never dropped and never filled with a guess.
- The columns were chosen because all of MIMIC-IV, eICU, Synthea and FHIR
  can express them, so the same patients can later be rendered as FHIR
  bundles, notes, and claims (the later steps of the plan).
- Heart failure is checked before the other groups, because ICD-10 codes
  most heart failure admissions as hypertensive heart disease with failure
  (I11.0), which is not in I50.
- The comorbidity flags are short code-prefix lists, not the full
  Elixhauser definitions.

## 4. Labels and data rules

**Primary outcome, `readmit_30d`.** 1 when the same patient has another
admission that starts within 30 days after this discharge and is not
planned. Planned means the source says so (in MIMIC-IV: admission type
`ELECTIVE` or `SURGICAL SAME DAY ADMISSION`). The index admission itself
may be planned. An admission that ends in death has no readmission label
and is left out of the readmission task.

**Secondary outcome, `died_in_hospital`.** 1 when the patient died during
the admission. Used only for the second site (section 11).

**Lab values.** A lab column holds the last numeric result charted during
the admission. A result outside these bounds is treated as missing, in
every source, and the number blanked is reported:

| Test | Bounds |
|---|---|
| creatinine | 0.1 to 30 mg/dL |
| bun | 1 to 300 mg/dL |
| sodium | 90 to 200 mmol/L |
| potassium | 1 to 12 mmol/L |
| hemoglobin | 1 to 25 g/dL |

The bounds are for catching typing errors and runaway simulated values.
They are not clinical reference ranges. Any other value outside the
table's rules (an age of 170, a flag of 2) is a mapping bug and stops the
pipeline.

**What the label cannot see.** Readmissions to a different hospital, and
readmissions after the end of the dataset. Both make the real rate an
undercount. That is accepted and stated with every result.

## 5. Split and lock

- **By patient.** All admissions of one patient are on the same side.
- **By hash.** A patient is in the test set when
  `sha256("nora-protocol-v1:" + patient_id)`, read as a number, falls in
  the lowest 20% . No stored list, no random state: the rule gives the same
  split on the full MIMIC-IV the day access arrives.
- **Locked.** `protocol/lock.json` records, per dataset, the sha256 of this
  file, of the whole table, and of the test rows. Scoring refuses to run if
  any of them has changed. A lock entry is never overwritten by code;
  changing one is a hand edit to a committed file, explained in section 15.
- **What may touch the test set.** Scoring only. No generator is fit to it,
  tuned on it, or selected by it. Development decisions use the training
  side.

## 6. Utility: train on synthetic, test on real

- **Model, fixed in advance:** logistic regression on all features, missing
  values filled with the training median, features standardised,
  `dx_group` one-hot. Plain on purpose, so a gap is about the data.
- **Comparison:** the same model trained on the synthetic table and on the
  real training table, both tested on the locked real test set. Metric:
  AUROC.
- **Uncertainty:** 1,000 bootstrap resamples of test **patients** (not
  admissions), seed 20261110, 95% percentile interval on the difference
  (synthetic minus real).
- **Passes when** the lower end of that interval is above **-0.05**. This
  is a non-inferiority margin, fixed here.
- **Not assessable** when the test set holds fewer than 30 readmitted or
  fewer than 30 not-readmitted admissions, or when a training or test set
  has only one outcome class. The numbers are still reported, with the
  reason. No verdict is given, and it never counts as a pass.

## 7. Fidelity

Reported, with no pass mark. Each number is shown next to its **floor**: the
same measurement between the real training set and the real test set, which
is how far apart two honest samples of the same hospital are by chance.

- **Marginal distance.** Per column, the larger of (a) the
  Kolmogorov-Smirnov statistic for numbers, or total variation distance for
  flags and categories, over the values present, and (b) the gap in the
  share missing. Averaged over columns. 0 is identical, 1 is nothing in
  common.
- **Correlation gap.** Mean absolute difference between the two Spearman
  correlation matrices of the numeric and flag columns.
- **Discriminator.** Cross-validated AUROC of a random forest told to
  separate real rows from synthetic rows. 0.5 means it cannot.

## 8. Privacy: membership inference

- **Attack:** distance to the closest record. For every real admission,
  find the nearest synthetic row. The attacker guesses "this patient was in
  the training data" when that distance is small.
- **Members** are the real training admissions. **Non-members** are the
  locked test admissions, which no generator has seen.
- **Metric:** AUROC of that guess, with a 1,000-resample bootstrap
  interval. Also reported: the share of training rows and of test rows that
  have an exact synthetic copy.
- **Passes when** the upper end of the interval is at or below **0.55**.
  The burden is on safety: too little data fails, it does not pass.
- **Not assessable** with fewer than 30 training or fewer than 30 test
  admissions. Reported with the reason; never a pass.
- **Limit.** This is a weak attack. Passing it is necessary, not
  sufficient. Stronger attacks are listed in section 14.

## 9. Self-check: the scorer is tested before any generator

Four stand-in "generators" with known right verdicts are scored on an
invented process whose truth is written into the code:

| Stand-in | What it is | Must come out as |
|---|---|---|
| holdout | A fresh sample of the same process | Passes utility and privacy; discriminator near 0.5 |
| copy | The training data itself | Passes utility; **fails privacy** with attack AUROC near 1 |
| marginals | Every column shuffled independently | Columns still match; **fails utility**; discriminator catches it |
| noise | Random values in range | Fails utility and fidelity |

If any verdict is wrong, no score from this scorer is reported.

## 10. Baseline

Synthea, pinned to release v4.0.0, with fixed seeds and fixed reference and
end dates. It has never seen MIMIC-IV. Every generator of ours is reported
next to it, on the same locked test set. A generator that does not beat
Synthea on utility and fidelity has no reason to exist.

## 11. Second site

eICU-CRD, a different set of hospitals. The whole method is repeated there:
its own cohort, its own lock, its own generator fit, its own scores.

**eICU cannot support the primary task.** It stores no dates, only a
discharge year and offsets within one stay, so the order of a patient's
hospital stays inside a year is unknown and a 30-day readmission cannot be
computed. On eICU, utility is therefore scored on `died_in_hospital`.
Fidelity and privacy need no label and are repeated in full.

The mortality model uses values recorded during the stay (last labs, length
of stay). It is a check that synthetic data preserves how features relate
to an outcome. It is not a usable mortality predictor and is never
described as one.

How eICU maps to the admission table:

- An admission is a hospital stay, which can hold several intensive care
  unit stays. Every admission therefore included intensive care.
- The primary diagnosis is the earliest one marked "Primary" during the
  hospital stay, the lowest diagnosis id breaking a tie. When that entry
  carries both an ICD-9 and an ICD-10 code, the ICD-10 code is used. A stay
  whose earliest Primary diagnosis has no code is left out of the cohort.
- `readmit_30d` and `prior_admissions_365d` are entirely missing.
- An age recorded as "> 89" is 90.
- `emergency` is 1 when the hospital admission source is the emergency
  department. `discharged_home` is 1 when the discharge location is "Home".
  Each is missing when eICU leaves the field blank.
- Comorbidities come from the diagnoses charted during the stay. eICU
  charts active problems, not history, so these rates run lower than
  MIMIC-IV's and the two sites are not compared on them.

## 12. Blind clinician packet

- **What the clinician sees:** admission cards. One page per admission,
  showing the structured facts of section 3 in one fixed layout. Half real,
  half synthetic, shuffled, with a sealed key.
- **Real cards come only from the open MIMIC-IV demo** (Open Database
  License), so the rater does not need PhysioNet credentials. Showing
  records from the full MIMIC-IV to anyone who has not signed its agreement
  is forbidden.
- **Why cards and not notes:** there is no open sample of real MIMIC
  discharge notes, and real notes are long free text that a template cannot
  pass for. A real-versus-synthetic test on notes waits for a
  model-written note generator and a credentialed rater.
- **Scored as:** the rater's accuracy at telling real from synthetic, with
  an exact binomial interval. 50% means they cannot tell.

## 13. Done, and how results are reported

| Evidence | Meets it |
|---|---|
| HL7 validator reports 0 errors on generated bundles | Phase 3 |
| Utility passes on real held-out data | Section 6, on the **full** MIMIC-IV |
| Repeated on a second site | Section 11 |
| A seeded run reproduces the numbers in CI | Open demo data only |
| Blind packet ready for a clinician | Section 12 |

Reporting rules:

- Every number is reported as it came, including the ones that miss.
- Every result names its dataset. **Scores on the 100-patient demo are a
  plumbing check and are never quoted as evidence**: its test set holds
  eight admissions, none of them readmitted.
- Results are quoted from the locked test set only.
- A run that fails for an infrastructure reason is an error, not a score.

## 14. Known limits

- The readmission rate is an undercount (section 4).
- Membership inference by closest record is a weak attack. Not yet done:
  shadow-model attacks, attribute inference, differential privacy.
- The comorbidity lists are simplified.
- The utility model is linear. A generator could pass with wrong
  non-linear structure; the discriminator is the guard against that.
- One hospital system per dataset. MIMIC-IV is one Boston academic centre.
- Anything fit to the full MIMIC-IV, and its output, may only be shared on
  PhysioNet under the same agreement (the PhysioNet Credentialed Health
  Data Use Agreement 1.5.0). The openly shareable artifacts are the code,
  the scores, Synthea output, and anything fit to the open demo.

## 15. Changes

Each entry: date, section, what changed, why, and whether any result was
produced before the change.

- **2026-11-13, section 5.** The salt changed from `synth-protocol-v1` to
  `nora-protocol-v1` when the project took the name Nora, before this file
  was first committed or locked. The only scores under the old salt were
  trial runs on the open demo, which give no verdict (section 13). The
  change moved the demo's test set from 5 admissions with one readmission
  to 8 with none. The new string follows from the name; it was not picked
  by looking at the split.
- **2026-11-13, section 11.** Added how eICU fields map to the admission
  table. Written after counting the open demo's cohort (261 admissions, 26
  deaths) and before any generator was fit to it or any score computed on
  it. The lock entry for `mimic-iv-demo-2.2` was edited by hand to carry
  this file's new sha256; its table and test digests are unchanged.
