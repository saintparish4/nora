# The front-desk prior authorization, step by step

Written 2026-10-23 from Sharif's experience doing this at a practice on Epic,
with CoverMyMeds, and corrected by him the same day. His experience is the
source. Where he could not recall a detail it says so; nothing here is a
guess presented as fact.

## The workflow being served

1. The doctor prescribes Zepbound or Wegovy at a visit.
2. The pharmacy's claim is rejected: prior authorization required.
3. Front-desk staff or an MA start the request on CoverMyMeds and fill it in
   from Epic.
4. The plan may send clinical questions.
5. Staff submit, then watch for the decision.

Doctors are not in the loop, except to answer a question the chart can't.

## How the times are estimated

Keystroke-level model (Card, Moran and Newell): each step is broken into
operators and their times added.

| Operator | Meaning | Time |
|---|---|---|
| M | Deciding what to do next, finding something with the eyes | 1.35 s |
| P | Pointing the mouse at something | 1.1 s |
| B | A click (BB: press and release) | 0.1 s (0.2 s) |
| K | One keystroke, average typist (about 40 words a minute) | 0.28 s |
| R | Waiting for a screen to load | 1.5–2 s, assumed |

One typed field is roughly M + P + BB + n×K: about 2.65 s, plus 0.28 s per
character. Switching between Epic and CoverMyMeds to read one value and type it
is about M + 2×(P + BB) = 4 s on top.

The model assumes an expert making no mistakes, so these are **lower bounds**.
It does not model searching a chart or making a clinical judgment; those get a
range from the description, marked as such.

## The task map

| # | Step | Where the information lives in Epic | Estimate | What slows it down |
|---|---|---|---|---|
| 0 | **Learn a PA is needed.** Usually the patient calls after the pharmacy tells them, or the pharmacy faxes the office. | Not in Epic: phone or fax | Not modelled: hours to days before work starts | The office often hears last, from the patient |
| 1 | **Open the patient's chart.** Search by name or date of birth, pick the right patient. | Patient lookup → patient header (name, DOB, MRN) | M + P+BB + 12K + K + R + M + P+BB + R ≈ **12 s** | Similar names; confirming DOB |
| 2 | **Start a new request on CoverMyMeds** under your own login. Type the drug and strength, choose it from the list, enter BIN, PCN and Rx group to find the plan's form. | Drug and strength from the prescription order | ≈ **13 s**, plus finding BIN/PCN (step 4) | Picking the right strength and form |
| 3 | **Patient demographics.** First and last name, DOB, sex, address, city/state/ZIP, phone. | Patient header and demographics | 7 fields: ≈ 19 s of field entry + 22 s typing + 28 s switching windows ≈ **70 s** | Re-keying what Epic already has; typos |
| 4 | **Insurance.** Plan, member ID, group, and the pharmacy-benefit IDs: **BIN, PCN and Rx group**. | **Coverages** for plan, member ID and group. BIN, PCN and Rx group are on the **scanned insurance card**, or not in Epic at all, and then **staff call the pharmacy**. | ≈ 20 s typing + 18 s finding the coverage + 10 s reading the card ≈ **50 s**; a call to the pharmacy is **minutes** | Pharmacy IDs not stored as data; a phone call |
| 5 | **Prescriber.** Name, NPI, address, phone, fax. | The provider's details. Each staff member types them into CoverMyMeds once, under their own login, then saves them. | ≈ **60 s** the first time per prescriber, ≈ **4 s** after | Finding the NPI the first time |
| 6 | **Medication details.** Quantity, days' supply, directions. | The prescription order | ≈ 8 s finding the order + 22 s typing ≈ **30 s** | Quantity and days' supply for weekly pens (4 pens = 28 days) |
| 7 | **Diagnosis.** ICD-10 codes, e.g. E66.9 obesity plus Z68.3x BMI. | Problem list, or the visit's diagnoses | ≈ **15 s**, if you know which codes count | Knowing which code the plan wants |
| 8 | **Send to the plan.** | Not Epic | ≈ 3 s, then the plan returns its clinical questions | |
| 9 | **Answer the clinical questions.** Their number varies by plan. Some are worded so it is hard to tell what they are asking. Typical subjects: BMI and when it was measured, weight-related conditions, how long a diet and exercise program has run, earlier weight-loss drugs and what happened, whether another GLP-1 is being taken. | BMI: **Vitals**. Program and earlier drugs: notes in **Encounters**. Conditions: problem list. Current drugs: medication list. | Not modelled. **1–3 minutes a question** to work out what it means and find the answer in the notes; longer without medical training | Unclear wording; reading notes; the answer isn't written down |
| 9a | **A question the chart can't answer:** ask the prescriber. | A message to the provider | ≈ **60 s** to write, then **hours to days** of waiting | Everything stops |
| 10 | **Attach chart notes.** Plans request them. | Notes from **Encounters**, exported and uploaded | ≈ **1–2 min** | Choosing which notes |
| 11 | **Submit under the prescriber's name.** Staff submit; the doctor does not see, sign, or approve it. | Not Epic | ≈ **5 s** | Attesting to clinical answers you can't judge |
| 12 | **Follow up.** The patient is usually told **24–72 hours depending on the plan**, though answers sometimes come back within hours. CoverMyMeds can take the patient's phone number and send them the approval or denial directly. | CoverMyMeds dashboard | Not modelled: hours to days | |

**Hands-on total for one request: about 3½–5 minutes of administrative entry
(steps 1–8, 11) plus 6–20 minutes of clinical questions (step 9), before any
waiting.** The clinical questions are most of the time, and they are where
staff without medical training are least sure.

## Where Nora fits

| Step | Today | With Nora |
|---|---|---|
| 1–7 | Re-key about 25 values that Epic already holds, switching windows for each | Every field filled from the chart, deterministically (no AI), each with its source, ready to copy. Staff check, they don't type |
| 4 | BIN/PCN read off the scanned card, or a call to the pharmacy | Filled when the coverage record carries them; when it doesn't, flagged as missing, with "check the card scan in Coverages, or call the pharmacy" |
| 9 | Search notes for each question; guess at medical wording | Each question explained in plain language; answered from the chart with the quote that supports it; or marked "ask the prescriber's office" when the chart doesn't say |
| 9a | Everything waits on the message | Only that one question waits; the rest is done |
| 10 | Choose which notes to attach | The notes that hold each quoted answer, listed, ready to attach |
| 11 | Submit under the prescriber's name, unsure of the clinical answers | Every clinical answer has its source, or says plainly it has none; a final check records what was submitted, by whom, on whose behalf |

## What Sharif confirmed (2026-10-23)

- The trigger is usually the patient or a pharmacy fax, and staff mostly start
  **new** requests.
- BIN, PCN and Rx group come from the **insurance card scanned into Epic**, or a
  **call to the pharmacy**.
- Each staff member has their own CoverMyMeds login and saves prescribers
  there after typing them once.
- The number of clinical questions varies, and some are **worded so it is hard
  to tell what they ask**.
- Plans **request chart notes**.
- Patients are told 24–72 hours; CoverMyMeds can text the patient the outcome.
- Epic screens: **Coverages** (insurance), **Encounters** (notes), **Vitals**.
- **Staff submit under the prescriber's name, without the doctor seeing,
  signing, or approving it.** Every published form ends with a prescriber
  attestation, so the person submitting is attesting on the prescriber's
  behalf. That is why Nora never answers a clinical question it cannot source,
  and why its final check records who submitted and on whose behalf.

---

# Design note: what changes, what goes

## Removed

- **The clinician approval gate.** No "Approve packet" step, no "Ready for
  approval" status, no button locked for staff. `ApproveService` and the
  approval check before submission go; the approvals table becomes the record
  of the final check (below).
- **Tasks to the ordering clinician by default.** A gap becomes a staff task.
- **Clinician-centred copy and demo.** The walkthrough's "Not Jordan's to
  approve", the closing screen's "Switch to the clinician", Today's
  "Awaiting clinician approval", the README's "a clinician approves the
  packet", and the demo request seeded as waiting on a clinician.

## Changed

- **Statuses.** Gathering → needs clarification (a staff task is open) →
  ready to submit → submitted → payer decision. Nothing waits on a clinician.
- **Final check.** Before submitting, the staff member confirms each answer
  and its source. Nora records what was submitted (the existing content digest
  does this), who submitted it, and the prescriber it was submitted on behalf
  of.
- **Gaps.** A missing answer opens a task for staff. "Ask the prescriber's
  office" is an action on that task. It records that the question was sent,
  but nothing waits on it.
- **The chart.** Nora reads it over FHIR R4 / US Core (Patient, Coverage,
  MedicationRequest, Condition, Observation, Practitioner, notes), from Epic's
  sandbox or a local FHIR server with Synthea patients, instead of pasted text.
  Pasted notes stay as a fallback.
- **The criteria library becomes question sets.** Each plan's clinical
  questions, from its PBM's published form, are a FHIR Questionnaire: typed
  items, options, and branching (`enableWhen`). The existing criteria, rules
  and verified quotes become how each question gets answered.

## Where the chart comes from (checked 2026-10-23)

- **Epic's sandbox needs a registered app.** It is OAuth-only: a free Epic on
  FHIR account, a registered app with each API ticked, and a client ID; there
  is no open endpoint. None of its listed test patients has Coverage, and none
  has a prescription, BMI vitals, coverage and notes together. It can prove that
  Nora reads Epic's real data shapes for one patient (Linda Ross has
  MedicationRequest, Condition and vitals), but it cannot be the demo's chart.
- **Synthea gives realistic US Core patients, with two gaps.** No stock module
  prescribes Wegovy or Zepbound, and it writes no standalone Coverage, let alone
  BIN, PCN or Rx group. So: a small custom Synthea module for the prescription,
  and synthetic Coverage added afterwards, shaped like the CARIN Digital
  Insurance Card profile (`Coverage.class` with `rxbin`, `rxpcn`, `rxgroup`,
  `rxid`), which is where the standards put pharmacy-benefit IDs. US Core itself
  does not.
- **Plan:** a local HAPI FHIR server loaded with those patients is the chart for
  the demo, the eval and the tests. The Epic sandbox is an optional,
  one-patient check, which needs you to register the app. Inferno's US Core
  Client suite can test Nora's reads against its own simulated server.

## Read against Epic's sandbox (2026-10-24)

Nora signed in to Epic's FHIR sandbox
(`fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`) as a registered
Backend Systems app: an RS384-signed JWT for a client-credentials token, with
the public key published as a JWK Set at
`https://noras-demo.vercel.app/epic-jwks.json` (`base/public/epic-jwks.json`).
The private key never left the machine that signs. It then read Linda Ross
(`eIXesllypH3M9tAA5WdJftQ3`, the sandbox patient with orders, problems and
vitals) and filled the request form's fields from her chart.

- **Read as expected:** all nine patient fields; both active problems with
  their ICD-10 codes (J45.40, J20.9); her active Advair order's quantity,
  days' supply and directions; the prescriber's name and NPI.
- **Correctly left empty:** every insurance field (she has no Coverage), and
  BMI (Epic has her weight but no height or BMI).
- **One bug, fixed:** Epic names an order's drug by reference to a Medication
  (`medicationReference`), where the demo bundles, HAPI and Inferno all carry
  it on the order (`medicationCodeableConcept`). Nora read only the second, so
  against Epic it found "no active prescription", left the prescriber empty
  (it is found through the order), and the CQL would have missed prior drugs.
  `Fhir::Chart` now reads the referenced (or contained) Medication's code onto
  the order, the form cites `medicationReference → Medication.code`, and
  `spec/support/epic_shaped_source.rb` serves the demo charts Epic's way so the
  specs check that the form and the CQL answers come out the same.
- **One field left empty on purpose:** Epic's Medication lists every RxNorm
  code the drug maps to (Advair's has five, ingredients and products). Picking
  the first gave salmeterol's ingredient code, so the RxNorm field now stays
  empty and names the candidates whenever there is more than one.
- **As Epic sends it:** the prescriber's office phone, fax and address are not
  on the sandbox Practitioner, and the directions carry Epic's appended
  "Starting ..., Until ..., Print". Both are shown as they came.

## The question sets (checked 2026-10-23)

Only one of the four payers publishes questions written for these drugs:

| Payer (PBM) | What exists publicly | How Nora models it |
|---|---|---|
| BCBS FEP (CVS Caremark) | Wegovy (revised 9/18/2026), Zepbound (1/1/2026) and Saxenda (1/12/2026) forms, each with numbered, typed, branching questions | **The real question sets**, word for word, as FHIR Questionnaires: answer types, options and branching (`enableWhen`) from the forms, with each PDF's revision date and SHA-256. Wegovy's MASH page is left out |
| UnitedHealthcare (Optum Rx) | A general drug form only; the plan-specific questions come through ePA, behind login | One question per criterion of UHC's policy (2026 P 1114-23), marked "derived: the wording is Nora's, not the plan's" |
| Aetna (CVS Caremark) | A general form (GR-68988) only | The same, from Aetna's bulletins for each drug |
| Cigna (Express Scripts) | A general form only; Cigna is moving to ePA only | The same, from Cigna IP0813, IP0814 and IP0816 |

The general forms were left out: their questions ("medications tried", "diagnosis") are free text, which the derived questions and the administrative fields already cover.

As built (`api/db/questionnaires`), each question names how Nora answers it:

- **Structured chart data:** age from the date of birth; the FEP plan option from the coverage; pens and quantity limits from the prescription; diagnosis and comorbidities from the ICD-10 problem list; BMI from Vitals; whether this is a new start from the prescription history.
- **A quote a person verified** against the matching requirement.
- **Always the prescriber's office:** for example step therapy, renewal weight loss, or a pediatric BMI percentile.

Anything unsourced is "ask the prescriber's office", with a plain-language explanation. Nora never reads "None of the above" into a problem list.

What the real forms add that the criteria library didn't have:

- **Branching on initiation versus continuation**: "Has the patient been on
  this medication continuously for the last 4 months excluding samples?"
  decides which questions follow.
- **BMI as a range choice**: under 27, 27 to 29.9, or 30 and over. Plus a
  comorbidity list (FEP adds established cardiovascular disease) that appears
  only for 27 to 29.9.
- **Medical-record page citations.** FEP's Zepbound form requires "medical
  record page number(s)" for each answer, and says records must be submitted.
  So Nora's sources become citable pages, and attaching notes (step 10) is
  required, not optional, for that plan.
- **Plan-option questions**, e.g. FEP Blue Standard/Basic versus Blue Focus.
  Answering these needs the member's plan option, which is an administrative
  field.
- **A prescriber attestation on every form.** See question 9 above.

## Added

- **A CoverMyMeds-style screen** (the request page's "Request form"):
  demographics, insurance, prescriber, medication, diagnosis, then the plan's
  questions, each value with a copy button and its source. The questions for
  the prescriber's office are collected into one message to paste, and the
  chart notes behind verified quotes are listed to attach.
- **Administrative fields with provenance**, filled by mapping, never by a
  model.
- **Plain-language explanations** for each clinical question, written once per
  question, not generated per request.

## AI's role, stated honestly

None in the administrative fields: those are lookups. For the clinical
questions, the rules find the supporting quote and a person verifies it. The
measured evaluation found the model made quotes worse, so it stays off for
quotes. Nora is an agent in the sense that it does the work end to end and
says what it couldn't do; the language model is optional.

## What can't be verified without real users or real CoverMyMeds access

- **CoverMyMeds' real screens, field order and wording.** The screen will be a
  model built from public material and your description, not a copy.
- **What a plan actually sends back.** The question sets will come from the
  PBMs' published fax forms. The electronic question set can differ, and it
  can branch further.
- **Real Epic data quality**: how often BIN/PCN, lifestyle-program dates or
  prior-drug outcomes are actually recorded. The sandbox and Synthea show the
  shapes, not the gaps.
- **The time saved.** The keystroke-level estimates are lower bounds. Only a
  timed task with people who do this work ([protocol](TIMED-TASK-PROTOCOL.md)),
  or real use, measures it. No participants are available, so it has not been
  run; the protocol and its scoring stay ready.
- **Independent labels.** The request-form eval (20 cases, 0 harmful answers
  after fixing the two bugs it found) is labelled by the code's author. The
  blind labelling packet and the kappa script are ready, but no outside
  labeller is available, so the labels are not independent.
- **Epic beyond one sandbox patient.** Nora has read Epic's sandbox as a
  backend system (below), for one patient with no coverage, BMI or
  weight-loss drug. A real Epic build, with its own data habits, is untested.
- **Approval rates.** No real submissions, so no payer outcomes.
