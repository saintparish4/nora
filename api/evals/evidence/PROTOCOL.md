# Protocol: making the evidence eval deeper

Written 2026-10-22. Scope stays GLP-1 weight-management prior authorization
(Wegovy, Zepbound, Saxenda) and the four payers already modelled. Nothing here
changes the app or its production behaviour.

| Part | Where | Status |
|---|---|---|
| 1. Criteria from published payer policies | `policies/` | Done, with gaps listed there; seeded as library version 2 |
| 2. External benchmark (n2c2 2018 Track 1) | below | Blocked: the data are closed |
| 3. Failure taxonomy | `taxonomy.yml`, `eval:evidence:taxonomy` | Done; tags not yet checked by a second reader |
| 4. medspaCy/ConText baseline and the three model conditions | `PLAN-2026-10-22.md`, `RESULTS-2026-10-22.md`, `context/` | Done |
| 5. Power and labelling protocol | below | Written |
| 6. Study of the human check | below | Designed, not run |
| 7. Sealed test set | below | Proposed, not built |

## 2. External benchmark: n2c2 2018 Track 1

**What it is.** 288 diabetic patients from Partners HealthCare, 2 to 5
longitudinal records each, 202 train / 86 test, labelled met or not met on 13
eligibility criteria at the patient level (Stubbs et al., JAMIA 2019,
doi:10.1093/jamia/ocz163). Best of 109 runs: 0.91 on the task's averaged F1,
median 0.82. The top 10 were rule-based or hybrid; none was purely machine
learning. Mean inter-annotator kappa was 0.54.

**Why it fits.** Several criteria test exactly the failure types Nora fails
on: timing (MI-6MOS, KETO-1YR, DIETSUPP-2MOS: "taken a dietary supplement in
the past 2 months"), thresholds (HBA1C 6.5 to 9.5%, CREATININE above normal,
ADVANCED-CAD: two of four), and negation and family history throughout. The
winning system was built on negation and family-history detection, which is
what condition F tests here.

**Status: not obtainable today.** The Harvard DBMI portal
(https://portal.dbmi.hms.harvard.edu/projects/n2c2-nlp/) reads "The n2c2
datasets are temporarily unavailable", and archived copies show the notice
since about September 2024. The 2014 i2b2/UTHealth corpus it was built from is
served from the same portal.

**Plan for when it reopens (fixed now so it cannot be fitted later):**

1. Use the 8 criteria that are statements a chart either documents or does
   not: HBA1C, CREATININE, MI-6MOS, KETO-1YR, DIETSUPP-2MOS, ASP-FOR-MI,
   ABDOMINAL, ADVANCED-CAD. Skip ENGLISH, MAKES-DECISIONS, ALCOHOL-ABUSE,
   DRUG-ABUSE (judgement calls, kappa 0.31 to 0.63) and report them as
   excluded.
2. Write each as a Nora criterion with hint vocabulary from the training set
   only. The "now" for time windows is the most recent record, as in the task.
3. A patient is "met" when the method proposes at least one excerpt that
   survives its own rules. Score with the task's metric (per criterion, the
   mean of met and not-met F1; then the mean over criteria), using the 86 test
   patients once, after the method is frozen at a tagged commit.
4. Compare per criterion with the winner (Graz) and the best per criterion
   from the paper's Table 4.
5. Model conditions only with a model that runs locally, or with Partners'
   prior written consent: the agreement forbids disclosing the data "to or
   with any other person or entity, including any subcontractor", which an
   external API plausibly is.

**What this cannot show.** n2c2 labels are patient-level. It measures whether
the method decides criteria correctly on real notes, not whether the quoted
span is the right one. Span agreement still has to come from part 5.

**Interim realism check (MIMIC-IV-Note).** MIMIC-IV-Note 2.2 on PhysioNet has
real de-identified notes but no labels for these criteria, so it is not a
benchmark. Its use here would be to have the reviewers in part 5 label 20 to
40 discharge summaries against the GLP-1 criteria, which tests how the method
behaves on long, messy notes. PhysioNet's policy (2025-09-24) forbids sending
the data through API services unless zero retention, no training and no human
review are verified, and recommends local models. The OpenAI key in `api/.env`
must not be used on it.

## 5. Power and labelling protocol

### How many cases

`clean` is decided on unsupported requirements, and two conditions are
compared on the same ones, so the test is McNemar's. Requirements needed to
detect a 10-point difference with 80% power:

| Share where the two conditions disagree | alpha 0.05 | alpha 0.01 (5 comparisons) | Cases at today's 1.1 unsupported per case |
|---|---|---|---|
| 0.10 (every disagreement one way) | 77 | 114 | 104 |
| 0.15 | 116 | 173 | 158 |
| 0.20 | 155 | 231 | 210 |
| 0.30 | 234 | 348 | 317 |

To show a condition is no worse than the rules by more than 5 points
(one-sided 0.05, 80% power) takes 124 to 495 unsupported requirements.

Today's test slice has 9 cases with any unsupported requirement. The cheapest
way to more power is denser cases, not more cases: a chart can carry three or
four tempting but insufficient passages, one per criterion, at little extra
writing cost. Target for the next case set: 120 unsupported and 120 supported
requirements, split 50/50 train/test, with every failure type in
`taxonomy.yml` (including `wrong_document`, which today appears in only 5
requirements) represented at least 10 times.

### Labelling guide for two independent reviewers

**Who.** Two people who prepare or review prior authorizations for a living
(a medical assistant, pharmacy technician, nurse, or utilization reviewer with
at least a year of it). Neither has seen Nora's output, the rule hints, or
each other's labels. The person who wrote the cases is not one of them.

**Materials.** For each case: the chart documents, the request date, the drug,
and the criteria as written in the sourced policy (`policies/`), not the
illustrative library. Nothing else.

**Procedure, per criterion.**

1. Decide one label:
   - `supported`: you would mark this criterion met from the chart alone, if a
     payer reviewer asked you to point at the text.
   - `unsupported`: you would not.
   - `not_applicable`: the criterion's own condition excludes this patient
     (for example, a comorbidity requirement when BMI is 30 or more).
   - `ambiguous`: you can argue it either way. Write both arguments.
2. For `supported`, copy every passage that documents it, word for word.
3. For `unsupported`, copy any passage a hurried reader might take as support,
   and write one line on why it is not enough.
4. Record the minutes spent on the case.

**Rules that stay fixed** (from `LABELING.md`, owner-approved 2026-10-02): a
fill or prescription without an outcome is not a trial; a medication list
without a statement does not establish "no other GLP-1"; height and weight
without a stated BMI do not establish BMI. Where a sourced payer policy says
otherwise, the policy wins and the rule is rewritten before labelling starts.

**Calibration.** Five practice cases first, labelled together and discussed.
They are not scored and do not enter the case set.

### Agreement statistic

- Per criterion and overall: Cohen's kappa on the four labels, and on the
  binary supported versus not. Also Gwet's AC1, because most requirements are
  supported, and kappa understates agreement when one label dominates.
- Span agreement on supported requirements: the share of each reviewer's
  passages that overlap the other's by at least one character (the grader's
  own rule), in both directions.
- Bar for a criterion to enter the eval: kappa of 0.7 or more on the binary
  label. Below that, the rule for that criterion is rewritten and the
  criterion relabelled; labels are not averaged into agreement.

n2c2 reached a mean kappa of 0.54 on its criteria, so 0.7 is demanding; it is
also where a gold label starts to mean something.

### Adjudication

A third person who prepares prior authorizations (or the owner, if no third
reviewer is available, recorded as such) sees both labels, both sets of
passages and both reasons, and decides. The decision and its one-line reason
go in `DISAGREEMENTS.md` with a category (misread chart, rule unclear, rule
disputed, payer policy unclear). A case nobody can settle is labelled
`ambiguous` and left out of the score. Rule disputes go to the owner, and a
changed rule means relabelling every case it touches.

Note on the current set: `LABELING.md` reports a second reader who agreed on
all 189 criteria. The record does not say who that was or whether they do
this work. Treat the current labels as single-author until part 5 is run.

## 6. Study of the human check

Nora never decides; a person verifies every excerpt. That only protects
anyone if reviewers catch wrong excerpts. This measures whether they do.

### Planted-error study (synthetic data, no BAA needed)

- **Where.** A separate study practice built from the demo seeds on a local or
  staging deployment. Not the shared public demo, whose behaviour must not
  change.
- **Material.** 24 requests drawn from charts like the eval's. Into each,
  insert evidence at a fixed rate of about 1 planted false excerpt per 4 true
  ones. The planted ones are real chart text, chosen from the trap passages in
  the case labels, spread over the failure types (hypothetical, timing,
  incomplete, threshold, negation, experiencer), and shown with the same
  source labels and confidence range as true ones.
- **Participants.** 6 or more people who prepare prior authorizations, not
  the developer. Each reviews 12 requests as they would at work; the order of
  requests is randomised.
- **Measured.**
  - catch rate: planted excerpts rejected or left unverified ÷ planted
    excerpts shown
  - most severe miss: a requirement marked met whose only verified evidence is
    planted
  - false rejection rate: true excerpts rejected
  - minutes per request
  - each of these broken down by failure type and by the excerpt's source label
- **Size.** About 100 planted excerpts in total gives a catch rate to within
  ±10 points (95%). Six reviewers × 12 requests × about 1.5 planted per
  request is about 108.
- **What the app needs (not built; a code change for a later decision):** a
  study flag on planted evidence, visible only in the database, so verify and
  reject events (already logged as `WorkflowEvent`s with an actor) can be
  joined to it. No change to what reviewers see.
- **Decision it informs.** If the catch rate on a type is low, quotes of that
  type should not be offered at all, whatever their precision. That turns the
  eval's clean metric into a measured cost.

### Pilot log (real patients: needs agreements first)

What to record per request:

- every excerpt shown, with its source
- verify and reject actions, with actor and time
- notes added
- the packet as submitted
- staff-reported prep minutes (already collected)
- the payer's decision: approved, denied, or more information requested, with
  the reason code and the date

Most of the workflow side is already in `WorkflowEvent`. Payer outcomes are
entered by staff today (`approved_by_payer`, `denied`); add the reason code.

**What needs a Business Associate Agreement before any real patient record
enters the system:**

| Party | Why |
|---|---|
| The pilot practice (covered entity) with you | Nora stores and processes PHI on their behalf |
| Render (API and database) | Stores PHI |
| The model provider, if the model pass is on | Receives chart text; `AI_PHI_BAA_CONFIRMED` stays false until this is signed |
| Sentry | Error reports can carry request data |
| Resend | Emails may name patients |
| Vercel | Serves the frontend; check whether any PHI passes through it (server rendering, logs) |

Whether the pilot also needs an IRB determination depends on whether results
will be published as research; quality improvement inside one practice
usually does not, but that is the practice's call, not this document's.

## 7. Sealed test set

- **Holder.** Someone outside the project who prepares prior authorizations,
  ideally one of the part 5 reviewers. They write 40 or more cases in the
  existing YAML format, labelled under part 5, and keep them in their own
  private storage. Nobody working on Nora sees the cases.
- **Running it.** The harness gains two options (not built yet): `CASES_DIR=`,
  to read cases from a path outside the repo; and `SCORES_ONLY=1`, which
  writes aggregate `clean`, `found`, `precision` with intervals, plus per-type
  counts, and deletes traces and per-case rows when it finishes. The holder
  runs a tagged commit (`git checkout <tag>`, or a container built from it)
  with their own API key, and sends back only that summary.
- **Rules.**
  - The method is frozen at a tag before each scoring.
  - At most one scoring per tag, and at most one a month.
  - The holder keeps a log of tag, date and score.
  - Scores are reported as is, including bad ones.
  - When the method has been tuned against the sealed scores more than about
    five times, the holder writes a fresh set.
- **What it buys.** The first number about Nora that neither the person who
  built the method nor the person who wrote the cases could have shaped.
