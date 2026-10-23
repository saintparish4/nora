# Answering the plan's questions with CQL, the Da Vinci DTR way

Every answer Nora gives to a plan's question is a named CQL expression run over the patient's chart. When the expression returns nothing, the question goes to the prescriber's office. Nora never computes an answer anywhere else.

This follows HL7 Da Vinci **Documentation Templates and Rules** (DTR). In DTR a payer ships its questions as FHIR Questionnaires, with CQL libraries that prefill them from the chart. A DTR client runs the CQL, lets a person finish the form, and keeps a QuestionnaireResponse recording where each answer came from.

## How it is built

| Piece | Where | What it does |
|---|---|---|
| Question sets | `api/db/questionnaires/*.json` | FHIR Questionnaires, profiled as DTR 2.0.1 `dtr-std-questionnaire`. Each declares its library (`cqf-library`), and each item names its expression in `sdc-questionnaire-initialExpression` (`text/cql`, e.g. `NoraFepSaxenda."initiation-bmi"`). |
| Shared CQL | `api/cql/src/NoraCommon.cql` | How Nora reads the chart, by hand: age, FEP option, the order and its quantity, ICD-10 diagnoses and comorbidities, the latest BMI, the prescription history, and the evidence a person verified. |
| Per-set CQL | `api/cql/src/Nora<Set>.cql` | One generated library per question set. For each question it has an answer expression and a `<question> Source` expression listing the resources the answer was read from. |
| ELM | `api/db/questionnaires/libraries/*.json` | FHIR Library resources holding each library's CQL and its ELM. The ELM is compiled by cqframework's translator (`cqframework/cql-translation-service:v2.9.0`). FHIRHelpers 4.0.1 comes from HL7's Using CQL with FHIR IG. |
| Engine | `api/cql/dist/run.cjs` | cqframework's `cql-execution` 3.3.2 and `cql-exec-fhir` 2.2.0, bundled into one file. The API needs Node 22 and no npm install. |
| Verified evidence | `RequestForm::ClinicalAnswers#resources` | A quote a person verified becomes an Observation coded with its criterion, its text in `valueString`. **Not US Core**: it is Nora's own record. The CQL reads it like any other resource. |
| People's answers | `FormAnswer` | What the prescriber's office replied (**manual**), or a correction to Nora's answer (**override**). |
| QuestionnaireResponse | `RequestForm::QuestionnaireResponseBuilder` | DTR 2.0.1 `dtr-questionnaireresponse`. Each answer carries `information-origin` (auto, manual or override, with an author for a person's answer), plus the coverage and order it is for (`qr-context`) and `intendedUse` "withpa". It validates against the DTR 2.0.1 profiles with 0 errors. |
| Final check | `Approval#submitted_form` | The fields and the QuestionnaireResponse as they stood at submission. Exported as FHIR at `GET /api/v1/prior_authorizations/:id/questionnaire_response`. |
| DTR client | `Dtr::PayerClient`, `Dtr::Fill`, `bin/rails dtr:fill` | Calls a payer's `$questionnaire-package` with the coverage and order, authorized with SMART Backend Services. Runs the CQL the package carries over the patient's chart, and returns the QuestionnaireResponse. |
| DTR package | `Dtr::Package`, `bin/rails dtr:packages` | Nora's own sets as `$questionnaire-package` responses, valid against DTR 2.0.1. |

The rewrite from Ruby rules to CQL changed no answer. The request-form eval scored the same before and after:
- 580 of 580 fields correct;
- 140 of 141 answerable questions correct;
- 46 of 46 "don't know"s correct;
- 0 harmful answers.

## Inferno: the Da Vinci DTR Full EHR suite

On 2026-10-23 Nora was run against the hosted ONC Inferno **Da Vinci DTR Full EHR Test Suite v2.0.1** (`davinci_dtr_test_kit` 0.18.0), as a client authenticating with SMART Backend Services. Inferno played the payer. Its response to `$questionnaire-package` was Nora's own FEP Saxenda package, given as the suite's "custom" package.

The request was Tom Okafor's (synthetic) Saxenda request, on the e2e database:
- the office confirmed the weight management program by phone, so that answer is manual;
- staff corrected the pens for 90 days from 15 to 18, an override;
- the other nine answers came from the CQL (auto).

Nora fetched the package, ran the package's CQL, and produced a response identical to the one it stored at the final check.

Results as reported, from the second run (after the expression language fix) unless noted. Full records are in `api/evals/dtr/2026-10-23-inferno-dtr-full-ehr.json`.

| Test | Result | Why |
|---|---|---|
| Client registration (SMART Backend Services) | pass | |
| Launch DTR (attestation) | pass | Answered true: Tom's chart fills nine answers. |
| Invoke the Questionnaire Package operation | pass | Nora's client, token from Inferno's token endpoint. |
| Questionnaire Package request is valid | **fail** | "Request made to wrong URL: https://inferno.healthit.gov**:443**/…". A plain `curl` request in a separate diagnostic session got the same failure, so the cause is the hosted instance, not Nora. |
| Custom Questionnaire Package response is valid | **fail** | `bdl-3` and `bdl-4` on the PackageBundle, a collection Bundle with no request or response, inside Parameters. The current HL7 validator passes the same package against DTR 2.0.1 with 0 errors. Not reproduced, so not explained. Inferno's own Dinner Order package also failed this check in the diagnostic session, for a different reason. |
| Package contains the libraries needed | pass | |
| Questionnaires contain the needed extensions | pass | |
| Items contain expressions | pass | It failed in the first run: Nora declared `text/cql-identifier`, which DTR 2.2 recommends, and this 2.0.1 suite wants `text/cql`. Nora now declares `text/cql`; its expressions are valid either way. |
| Renders the Questionnaire (attestation) | pass | Answered true: the request form shows this Questionnaire's questions, honours its hidden items and branching, and takes answers. |
| Pre-populates the Questionnaire (attestation) | pass | Answered true: nine answers from CQL. |
| User can change and add answers (attestation) | pass | Answered true: one override, one manual, nine unchanged. My script recorded them through the same service the console's buttons call; Cypress drives the buttons. |
| Completes and stores the QuestionnaireResponse (attestation) | pass | Answered true, after adding the export endpoint: until then the response was stored but could not be exported. |
| QuestionnaireResponse is conformant | pass | DTR 2.0.1 `dtr-questionnaireresponse`. |
| QuestionnaireResponse is correct for the workflow | **skip** | "Couldn't find Questionnaire …/fep-saxenda\|2026-01-12 in the provided custom questionnaire package". Inferno matches the URL exactly, so a canonical with a version never matches. |
| (Diagnostic, version removed) correct for the workflow | **fail** | Two disagreements with DTR, below. |

**Where Inferno's correctness check and Nora disagree, and Nora keeps its behaviour:**

1. **"origin.source on item program: expected auto or override, found manual."** Inferno expects every question that has a CQL expression to be answered auto or override. DTR 2.0.1 defines *override* as changing an answer that was filled in automatically. Nora's expression for the program question returned nothing (no verified quote), so nothing was filled in, and the office's answer is *manual*. Calling it an override would claim Nora had an answer.
2. **"No answer for item focus-nonformulary" and six more.** These questions are marked required, and `enableWhen` turns them off for Tom (Blue Focus only, ages 12 to 17, renewals). In FHIR, `required` applies only to enabled items. Inferno's check counts disabled ones.

**Not run:**

- **The Dinner Order questionnaires** (Questionnaire Functionality Coverage). `Dtr::Fill` runs any package's CQL, but Nora renders and explains only the question sets it knows. A payer's unfamiliar form would need its own rendering, and a rule for explaining a gap.
- **The adaptive workflows** (`$next-question`). Nora has no adaptive forms.
- **The DTR SMART App suite.** It needs a SMART App Launch with a user, which Nora does not implement.
- **The DTR 2.2.0 client suite** (`dtr_full_ehr_v220`). The research found that its checks still use the 2.0.1 origin codes. Nora's response follows 2.0.1.

## What this cannot show

- **That a real payer's package would work.** Pharmacy-benefit drugs go through NCPDP ePA, not DTR (see `NCPDP-MAPPING.md`). No payer sends DTR packages for Wegovy, Zepbound or Saxenda, and the package Inferno served was Nora's own.
- **That Nora's CQL is right about a real chart.** The request-form eval measures it on synthetic and Synthea charts, labelled by the code's author.
- **Performance at scale.** Each request form runs CQL once, about 0.4 seconds on the demo charts.
