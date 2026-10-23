# Nora

A prior-authorization workspace for front-desk staff and medical assistants: it checks a patient's chart against the payer's published criteria, quotes the chart text that documents each one, and turns what is missing into tasks, so staff can finish and submit the request themselves.

![The demo's featured request: Cigna's criteria for Wegovy, the evidence quoted from the chart, and the gaps still open](docs/images/request-page.png)

**Live demo:** [mai-omega.vercel.app/demo](https://mai-omega.vercel.app/demo) opens a synthetic practice with no sign-up. Add `?tour=1` for a guided walkthrough.

## Features

- **Built for the person who does the work:** front-desk staff and MAs complete and submit medication PAs themselves, under the prescriber's name. Nora is designed around that real workflow ([mapped step by step](docs/FRONT-DESK-WORKFLOW.md)), not around a doctor's sign-off.
- **Quotes, never claims:** every requirement is answered with the chart's own sentence, its document and date. Staff verify each quote, and Nora never marks a requirement met by itself.
- **Real payer criteria:** the initial-authorization criteria for Wegovy, Zepbound and Saxenda from UnitedHealthcare, Aetna, Cigna and the BCBS Federal Employee Program, each linked to its published policy and effective date. Criteria are versioned, so a request keeps the criteria it was opened under.
- **The CoverMyMeds form, filled from the chart:** demographics, insurance with BIN/PCN/Rx group, prescriber with NPI, drug, quantity, days' supply and diagnoses are read from the chart over FHIR R4 (US Core), by lookup, with no model. Each value shows the FHIR element and the Epic screen it came from, ready to paste; a value the chart lacks says where to get it (the card scan in Coverages, or the pharmacy).
- **The plan's own questions, answered in CQL:** the BCBS FEP forms for Wegovy, Zepbound and Saxenda word for word, and question sets derived from UnitedHealthcare, Aetna and Cigna criteria, as branching FHIR Questionnaires. Every answer is a named CQL expression over the patient's US Core data and the quotes a person verified, the way Da Vinci DTR fills in a form. An expression that returns nothing is explained in plain language and listed for the prescriber's office. Nora never answers a question it cannot source. ([How it works](docs/DTR-AND-CQL.md))
- **What the office said goes on the record:** staff record the prescriber's office's reply, or correct Nora's answer, and each answer keeps its origin (Nora's CQL, entered by staff, or changed by staff) in a DTR QuestionnaireResponse that the final check keeps with the submission.
- **Modelled on the wire format:** each question set is also written as the NCPDP SCRIPT ePA question set a PBM sends to CoverMyMeds, and mapped back to FHIR. [What survives the trip, and what does not](docs/NCPDP-MAPPING.md).
- **Gaps become tasks:** a requirement the chart does not support is marked missing and becomes a task for staff, with the option to ask the prescriber's office. Nothing else waits on it.
- **The form is measured too:** 20 labelled cases (demo patients, variants, and Synthea patients) score the request form's fields by exact match and its answers on accuracy and correct "don't know": 580/580 fields, 140 of 141 answerable questions, 0 answered without a source ([the eval](api/evals/request_form/README.md)). Nora's FHIR client passes ONC Inferno's SMART Backend Services client tests. Against Inferno's Da Vinci DTR Full EHR suite it passes 10 of 13 tests, and the [failures are reported as they came](docs/DTR-AND-CQL.md). A [timed-task protocol](docs/TIMED-TASK-PROTOCOL.md) and a blind labelling kit with Cohen's kappa are ready for people who do this work. Neither has been run yet.
- **Measured, not assumed:** an evaluation, planned in writing before it ran, found that adding a language model made the evidence worse (it proposed text for unsupported requirements far more often), so Nora runs on rules. [The evaluation in two minutes](docs/EVALUATION.md).
- **A final check that means something:** before submitting, staff confirm every answer and its source. Nora records exactly what went out, who submitted it, and the prescriber it went out under. The packet renders as a PDF and is tracked to the payer's decision.
- **Workflow integrity:** a request's status changes only through one service that records an event and an actor; every read or write of patient data is logged; the browser authenticates with an httpOnly cookie and a CSRF token.
- **Tested end to end:** RSpec on SQLite and PostgreSQL, Jest, and Cypress driving the real console against the real API, all in CI.

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Ruby 4.0, Rails 8.1 (API mode)** | Backend, workflow services, rule-based evidence extraction |
| **SQLite / PostgreSQL** | SQLite for zero-setup development; PostgreSQL via `DATABASE_URL`, tested in CI |
| **Active Job, solid_queue** | Evidence extraction in the background |
| **OpenAI via `Ai::Client`** | Optional model pass and payer-question help, behind one adapter (off by default) |
| **FHIR R4, US Core 6.1** | Structured chart reads (Patient, Coverage, MedicationRequest, Condition, Observation, Practitioner) and the plans' questions as Questionnaires, checked with the HL7 validator |
| **CQL, Da Vinci DTR 2.0.1** | Every answer to a plan's question: cqframework's translator for ELM, `cql-execution` and `cql-exec-fhir` in Node to run it; QuestionnaireResponses with information origin |
| **NCPDP SCRIPT ePA (2023011)** | The question sets as PAInitiationResponse QuestionSets, and back to FHIR |
| **prawn, pdf-reader** | Submitted packets as PDF; text from uploaded chart PDFs |
| **Next.js 16, React 19, TypeScript** | The staff console |
| **Tailwind CSS, shadcn/ui, SWR, Zod** | Styling, components, data fetching, response validation |
| **RSpec, Jest, Cypress** | Backend, frontend and end-to-end tests |
| **medspaCy** | Clinical NLP baseline in the evaluation |
| **Render, Vercel** | API and console hosting for the demo |

## Getting Started

### Prerequisites

Ruby 4.0.x, Node.js 22.13 or later, and pnpm 12 (pnpm 12 refuses to run on older Node). The API needs Node too: it runs the plans' CQL with `node api/cql/dist/run.cjs`. Docker only to run the PostgreSQL test suite locally, or the CQL translator when changing the CQL.

```bash
ruby --version   # 4.0.x
node --version   # v22.13 or later
pnpm --version   # 12.x
```

### Installation

```bash
git clone https://github.com/saintparish4/nora.git
cd nora
make setup                                   # install, create, migrate, seed
cp api/.env.example api/.env                 # set SECRET_KEY_BASE: openssl rand -hex 64
cp base/.env.local.example base/.env.local
```

## Usage

```bash
make dev
```

- Console: http://localhost:3005
- API: http://localhost:3006

The API logs each request with its timing. `make dev SQL_LOG=1` adds every SQL query and the line of code that ran it.

http://localhost:3005/demo signs you in to the synthetic demo practice as the medical assistant and `/demo?tour=1` plays the walkthrough. Or sign in with a seeded account, password `password123`:

| Email | Role |
| :--- | :--- |
| `demo@nora.com` | Admin |
| `clinician@nora.com` | Clinician (prescribes; requests go out under their name) |
| `ma@nora.com` | Medical assistant |

The demo practice has five synthetic patients on four payers and four requests at different stages: decided by the payer, ready to submit, blocked on missing documentation, and just read. The fifth patient has no request, so there is one to start. Every name and note is invented. `cd api && bin/rails demo:reset` puts it back the way the seeds left it.

Run the evaluation (no API key needed for the rule pass):

```bash
cd api
bin/rails eval:evidence:selfcheck   # proves the harness first
bin/rails eval:evidence ROUND=rules
```

## Configuration

Copy the templates and fill in what you need: `api/.env.example` and `base/.env.local.example` list every variable.

- `SECRET_KEY_BASE` (API): required. Signs the session cookie and tokens.
- `NEXT_PUBLIC_API_URL` (console): required. The API's URL, `http://localhost:3006` locally.
- `OPENAI_API_KEY` (API): optional. Enables the model pass and "Help with a payer question". Without it, extraction runs the rules and says so on screen.
- `DEMO_PRACTICE` (API): `true` seeds the demo practice in production and enables `/demo`. Always on outside production; the deployed API rebuilds the practice on every boot.
- `AI_PHI_BAA_CONFIRMED` (API): production refuses to send a real practice's chart text to a model unless this is `true`. The synthetic demo practice is exempt.
- `DATABASE_URL` (API): a `postgres://` URL switches from SQLite to PostgreSQL.
- `FHIR_BASE_URL`, `FHIR_BEARER_TOKEN` (API): optional. Nora reads each patient's structured chart (demographics, coverage with BIN/PCN, prescription, prescriber, diagnoses, BMI) over FHIR R4. Unset, it reads the demo practice's bundles in `api/db/fhir/demo`. To use a real server: `docker run -p 8090:8080 hapiproject/hapi:latest`, then `FHIR_BASE_URL=http://localhost:8090/fhir bin/rails fhir:load`. To read as a SMART Backend Services client instead of with a fixed token, set `FHIR_CLIENT_ID` and `FHIR_PRIVATE_KEY_PATH` (`bin/rails fhir:smart_key` makes the key and prints the JWK Set to register); `FHIR_TOKEN_URL` is optional.

Nora uses synthetic data only. It is a portfolio project, not a product in use with patients.

## Contributing

```bash
make test        # RSpec + Jest
make test-e2e    # Cypress against the real API and console, on ports 3105/3106
make lint        # RuboCop + ESLint
cd api && bundle exec brakeman --no-pager   # security scan, as CI runs it
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). CI ([.github/workflows/test.yml](.github/workflows/test.yml)) runs on every push and pull request to `main`: RuboCop, Brakeman and RSpec on SQLite and on PostgreSQL, ESLint, the production build and Jest, and the Cypress suite. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the services, routes and the safety rules the code enforces.

## License

Distributed under the [MIT License](LICENSE). See `LICENSE` for more information.
