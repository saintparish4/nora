# Request-form eval

Measures the CoverMyMeds request form Nora fills from the chart:

- **Administrative fields:** does each field hold exactly what a careful staff member would type, and stay empty when the chart does not hold it?
- **The plan's questions:** does Nora answer the questions a person could answer from the chart, and say "don't know" (ask the prescriber's office, or check the chart) for the rest, without ever answering one it cannot source?

The system under test is `RequestForm::AdminFields` and `RequestForm::ClinicalAnswers`, the code behind `GET /api/v1/prior_authorizations/:id/request_form`. Nothing is re-implemented. A case's requirement states are passed in, the way a reviewed request holds them.

```bash
bin/rails eval:request_form               # every case
bin/rails eval:request_form CASES=id,id   # some of them
```

`spec/evals/request_form_eval_spec.rb` runs it in the suite and fails if anything is filled or answered wrongly.

## The cases

20 cases in `cases.yml`, on 9 charts:

- **The five demo patients** (`db/fhir/demo`), as seeded, and **10 variants** made by changing one thing in the chart: a Blue Focus plan, a coverage that does not name the FEP option, a prescription old enough to be a renewal, a stopped Zepbound order, a cancelled older coverage, a member ID only in `subscriberId`, a 16-year-old, a newer BMI that moves the patient into the 27 to 29.9 range, the problem list without the comorbidities, and an order written with the generic name but carrying the brand's RxNorm code.
- **Four Synthea patients** (`patients/`): generated with Synthea (`-s 2026 -p 40 -a 25-70 Ohio Columbus`), the first four adults with a BMI of 27 or more, kept to what Nora reads, plus a coverage and a GLP-1 order added by `import_synthea.rb` and tagged `nora-eval-added`. Synthea records diagnoses as SNOMED encounter diagnoses, with no ICD-10 problem list, which is a real way a chart can differ from the demo's.

## How the labels were written

By reading each chart, not by running Nora:

- A field is labelled with the value as it appears in the chart, in the format CoverMyMeds takes (dates MM/DD/YYYY, quantity with its unit). A value the chart does not hold is labelled empty. That includes the ICD-10 fields on the Synthea charts: turning a SNOMED finding into an ICD-10 code is coding, which is the prescriber's office's job, not lookup.
- A question is labelled with the answer a careful staff member could give **from the chart in front of them**, or `ask`/`check` when they could not. "None of the above" for comorbidities is always `ask`: an incomplete problem list does not prove a negative.
- A question that should not appear for this patient is left out.

**The labels were written by the same person who wrote the code** (me, the assistant that built Nora, with Sharif's workflow answers as the reference). They are not independent. So the scores show that Nora does what its rules say on realistic variation, and that it catches its own mistakes when the chart shifts. They do not show that the rules match what a plan expects. Labels from someone who has done these requests are the fix; see `docs/TIMED-TASK-PROTOCOL.md`.

## Scores

| | First run | After fixes |
|---|---|---|
| Fields exactly right (580) | 580 (100%) | 580 (100%) |
| Questions a person could answer from the chart: answered correctly | 136 of 141 | 140 of 141 |
| Questions where "don't know" is right: Nora said so | 43 of 44 | 46 of 46 |
| Answered wrongly or without a source | 2 | **0** |
| Shown when it should not be, or missing | 3 | 0 |

The first run is in `runs/2026-10-23-first.txt` and the second in `runs/2026-10-23-after-fixes.txt`. Problems in the first run, and what each turned out to be:

| Case | What happened | Cause | Fix |
|---|---|---|---|
| `elena-fep-wegovy-generic-name` | Answered "Generic" for an order written "semaglutide" but coded with Wegovy's branded RxNorm code | **Nora bug:** brand or generic was read from the drug's name only | Read the RxNorm code first |
| `tom-older-prescription` | Showed the comorbidity question although the BMI was 36.5 | **Nora bug:** a question whose parent was itself conditional stayed on even when the parent's known answer ruled it out | A known, non-matching answer now turns the question off |
| `tom-option-not-named` | Answered the FEP option from the coverage | **Harness error:** the case changed the plan's name but not its code, which still said `fep-blue-standard` | Case corrected |
| Three Synthea cases | Said "ask" for BMI with a BMI in Vitals | **Harness error:** the import kept Synthea's `urn:uuid` references, which a FHIR server would have resolved to `Patient/id` | Import rewrites references |

The one remaining miss is a real limitation, not a bug: Synthea's Andy Rogahn has myocardial infarction and ischemic heart disease as SNOMED encounter diagnoses. A person reading Encounters would answer the FEP comorbidity question; Nora reads only the ICD-10 problem list, so it says "ask". That is the safe direction.

## What this does not show

- That the derived question sets (UnitedHealthcare, Aetna, Cigna) match what CoverMyMeds actually asks. Those plans' questions are behind CoverMyMeds' login.
- That a real Epic chart looks like these. The demo charts were written for Nora, and the Synthea ones were reshaped to fit. The FHIR reads were checked against a HAPI server and Inferno's simulated server, not against Epic.
- How long the form saves. That needs people; see the protocol.

## SMART Backend Services on Inferno

Nora reads a FHIR server as a SMART Backend Services client (`Fhir::SmartBackendAuth`). On 2026-10-23 it passed the hosted ONC Inferno **SMART App Launch STU2.2 Client** suite, Backend Services Confidential Asymmetric option: registration, token request and token use. It was serving only Tom Okafor's synthetic chart. Details are in `inferno/2026-10-23-smart-backend-services.json`. Inferno's one advisory was to publish the key set at a URL rather than paste it. Nora serves it at `/.well-known/jwks.json`, but a laptop is not reachable from Inferno.

Not run, and why:

- **Inferno's US Core and (g)(10) suites:** they test FHIR servers. Nora is a client. Running them against the HAPI server that holds the demo data would test HAPI. The demo bundles are checked against US Core 6.1 with the HL7 validator instead (`bin/rails fhir:validate`).
- **SMART App Launch (EHR or standalone launch with a user):** Nora does not implement it. It is how an MA would open Nora from inside Epic, and it would be the next step.
- **Inferno's simulated server answers reads but not searches:** Nora's searches got a 400 there. Searches were checked against HAPI instead, with identical fields for all five demo patients.
