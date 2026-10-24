# NORA Development Guide

## Project Structure

```
/api/               - Rails API backend (Ruby)
  /app/             - Controllers, models, services, mailers, jobs
  /config/          - Routes, environments, initializers
  /db/              - Migrations, schema, seeds
  /spec/            - RSpec tests (requests, models, services)
/base/              - Next.js App Router frontend (TypeScript, React)
  /app/             - Pages, layouts, (auth), (protected) routes
  /components/      - UI, navigation, dashboard shell, workspace
  /lib/             - API client, auth context
  /types/           - TypeScript types and API contracts
/docs/              - Architecture and project documentation
.github/            - Workflows (test.yml: full-stack tests) + dependabot.yml
```

## Technology Stack

- **Backend:** Ruby 4.0.x, Rails 8.1 (API mode), SQLite (dev) / PostgreSQL via `DATABASE_URL`, RSpec, RuboCop, Active Job (solid_queue in production), prawn, pdf-reader, Resend, OpenAI via `Ai::Client`
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, pnpm, Jest, Cypress, ESLint
- **Build / run:** Make (optional), Bundler, pnpm
- **CI:** GitHub Actions — a single workflow, `.github/workflows/test.yml`, with a `Rails Tests` job (RuboCop, Brakeman, RSpec), a `Next.js Tests` job (ESLint, build, Jest), and a `Console E2E (Cypress)` job

## Local Development

See `README.md` for full setup. Quick start:

```bash
# One-time setup
make setup
# Create api/.env and base/.env.local with required variables (see README)

# Start both servers
make dev
```

- **Backend:** http://localhost:3006  
- **Frontend:** http://localhost:3005  

Run backend or frontend alone:

```bash
cd api && rails server
cd base && pnpm run dev
```

## Testing

From repo root or per app:

```bash
# All tests (backend + frontend)
make test

# Backend only
make test-backend
# or: cd api && bundle exec rspec

# Frontend only
make test-frontend
# or: cd base && pnpm test
```

**Evidence eval:** `cd api && bin/rails eval:evidence:selfcheck && bin/rails eval:evidence` scores what the extraction service proposes against 31 hand-labelled synthetic charts (`api/evals/evidence/`, start with its `README.md`). It is a measurement, not a test: run it before and after changing the rule hints, the prompt, or the model, and read failures only from the train slice.

**Request-form eval:** `cd api && bin/rails eval:request_form` scores the request form (`RequestForm::AdminFields`, `RequestForm::ClinicalAnswers`) against 20 labelled cases in `api/evals/request_form/cases.yml`: fields by exact match, questions on accuracy and correct "don't know". `spec/evals/request_form_eval_spec.rb` fails on any wrong or unsourced answer. A change to a question set, the demo bundles, or the answer rules can need a label change; say why in the case's note.

**Independent labels and the timed task:** `bin/rails eval:request_form:packet` writes the blind labelling packet. `eval:request_form:agreement` gives Cohen's kappa against the eval's labels, and `eval:request_form:timed` scores timed-task sessions (`api/evals/request_form/labeling`, `timed`). Neither has been run: no labellers or participants are available, so treat them as ready tooling, not pending work.

**Backend:** RSpec in `api/spec/` (requests, models, services, controllers).  
**Frontend:** Jest in `base/` (e.g. `__tests__/`). Use `pnpm test:watch` for watch mode, `pnpm test:coverage` for coverage.  
**Console end to end:** `make test-e2e` (or `cd base && pnpm e2e`, `pnpm e2e:open` for the runner) seeds a demo practice into `api/storage/e2e.sqlite3`, builds the console, boots both servers on their own ports (console 3105, API 3106, so `make dev` can keep running), and runs Cypress (`base/cypress/e2e/`). `E2E=true` is what moves the API onto that file and lifts its rate limits; neither applies in production. Specs that change a request call `cy.resetDemo()` first and find requests by patient name, because ids change on every reset. Logs and failure screenshots land in `base/cypress/logs` and `base/cypress/screenshots`.

## Code Quality

No Docker required for lint/format. Run on host:

```bash
# Lint both apps
make lint

# Auto-fix where supported
make lint-fix
```

Per app:

```bash
# Backend: format + lint
cd api && bundle exec rubocop
cd api && bundle exec rubocop -a   # auto-correct

# Frontend
cd base && pnpm run lint
cd base && pnpm run build
```

## Build and Run Commands

```bash
make help          # List all targets
make install       # Install deps (base: pnpm, api: bundle)
make setup         # install + api db:create db:migrate db:seed
make dev           # Start API + Next.js dev servers
make dev-stop      # Kill processes on 3005 and 3006
make test          # Run backend + frontend tests
make test-backend  # RSpec only
make test-frontend # Jest only
make lint          # RuboCop (api) + ESLint (base)
make lint-fix      # Lint with auto-fix
make db-reset      # api: db:drop db:create db:migrate db:seed
make db-migrate    # api: db:migrate
make db-seed       # api: db:seed
make clean         # Remove .next, node_modules (base), tmp/cache (api)
make clean-all     # clean + remove api vendor/bundle
make docker-up     # docker-compose up -d
make docker-down   # docker-compose down
```

## Coding Standards

- **Ruby/Rails:** snake_case (methods, variables), PascalCase (classes, modules). Follow RuboCop; document public APIs with yard/rdoc where helpful.
- **TypeScript/Next.js:** TypeScript throughout; App Router conventions; `'use client'` only where needed. Use ESLint and project conventions.
- **Line endings:** LF (Unix).
- **API:** All routes under `/api/v1/`; add controllers in `api/app/controllers/api/v1/`, services in `api/app/services/` by domain (e.g. `Authorizations::`, `Chart::`, `Ai::`).
- **Frontend:** Types in `base/types/`, API client in `base/lib/api/`; keep components under `base/components/` and pages under `base/app/`.
- **Frontend styling:** Use the tokens in `base/app/globals.css` (`bg-tile`, `text-ink`, `text-body`, `text-blue-deep`, `bg-green-tint`, ...) rather than raw Tailwind palette colours. Build screens from `PageHeader`, `Panel`, `Card`, `Notice`, `Pill`, `Button`, `Input`, and `NativeSelect`; status colours come from `lib/prior-auth.ts`, not from the page. `docs/ARCHITECTURE.md` describes what each accent means.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert  

**Scopes (examples):** api, base, auth, authorizations, docs, deps  

**Examples:**

- `feat(api): add evidence extraction and review workflow`
- `fix(api): print packet approval time in the practice's timezone`
- `docs(readme): document OPENAI_API_KEY requirement`
- `chore(deps): bump Next.js to 16.1.6`

**Breaking changes:** Add `!` after type/scope or use `BREAKING CHANGE:` in the footer.

## Feature and Change Guidelines

- **New API feature:** Add controller under `api/app/controllers/api/v1/`, domain logic in `api/app/services/`, routes in `config/routes.rb`, and RSpec in `api/spec/`.
- **New frontend feature:** Add types in `base/types/`, API functions in `base/lib/api/`, components and pages under `base/app/`; add tests where appropriate.
- **PHI / security:** Use existing patterns (e.g. `PhiAccessLog`, `PhiAccessLoggable`); log access to sensitive data and avoid logging PHI in plain text. Scope every query through `current_organization`.
- **Environment:** Copy `api/.env.example` → `api/.env` and `base/.env.local.example` → `base/.env.local`. Both templates are committed (the `.gitignore` files negate them explicitly); keep them in step with the README tables when adding a variable.

## Common Gotchas

- **Package manager:** Frontend uses **pnpm**, not npm. CI and local commands use `pnpm install`, `pnpm run dev`, `pnpm test`, etc.
- **Ruby version:** Pinned to 4.0.7 in `api/.ruby-version`, `api/Gemfile`, and `api/Dockerfile` — change all three together. CI reads `.ruby-version` via `bundler-cache`.
- **Node version:** Frontend needs Node >= 22.13; pnpm 12 hard-errors on anything older. `base/pnpm-workspace.yaml` lists the packages allowed to run install scripts — a new native dependency will fail `pnpm install` until it is added there.
- **`pnpm run <script> -- --flag`:** pnpm 10+ forwards the `--` to the script, so `pnpm test -- --ci` reaches Jest as a path pattern and matches zero tests. Pass flags directly: `pnpm test --ci`.
- **Database:** `config/database.yml` picks its adapter from `DATABASE_URL` — unset means SQLite
  (zero-setup local dev), a `postgres://` URL means PostgreSQL. CI runs the suite both ways; the
  `Rails Tests (PostgreSQL)` job is the one that speaks to locking, transaction semantics, and
  concurrent status transitions. Locally: `docker compose up -d postgres && make test-backend-postgres`.
- **Production is SQLite on a disk that does not persist.** The Render deploy uses the
  four-database SQLite layout in `config/database.yml` with no `DATABASE_URL` (checked
  2026-10-24 from the live demo's ids, which restart at 1 on every boot). Each deploy or wake
  starts empty and reseeds the demo, so nothing else survives. Moving to PostgreSQL is a Render
  change (a database plus `DATABASE_URL`) plus pointing the cache/queue/cable entries at it; see Known gaps in
  `docs/ARCHITECTURE.md`.
- **Auth:** The browser uses an httpOnly session cookie plus CSRF token; API clients opt in to a JWT and rotating refresh token with `X-Client-Type: api`. See `docs/ARCHITECTURE.md`.
- **Workflow status:** Never write `PriorAuthorization#status` directly. Go through `Authorizations::TransitionService` (the model rejects anything else) so every change has an event and an actor.
- **AI:** Call models only through `Ai::Client`. Never log prompts or chart text. Use synthetic data only; production refuses model calls until `AI_PHI_BAA_CONFIRMED=true`.
- **Demo walkthrough:** `/demo?tour=1` plays `base/lib/demo-tour.ts` on one page, the featured request (the one waiting for clarification), as the medical assistant; the spotlight glides between panels and the page never changes. Steps find their targets by `data-tour` attributes and select requirements by position in Cigna's Wegovy criteria, and must only look (select a requirement, open a document), never change a request, because the practice is shared. Renaming a `data-tour` attribute, reordering those criteria, or reseeding the featured request means updating the steps.
- **Demo practice:** The seeds build a shared synthetic practice with four requests in progress, played through the real services by `Demo::Story` (`db/seeds/demo_requests.rb`). `/demo` signs in to it with no password. It is off in production unless `DEMO_PRACTICE=true`. `bin/rails demo:reset` rebuilds it. The landing page's worked example (`base/components/landing/worked-example.tsx`) quotes the seeded chart text, so change the two together.
- **The eval runs on a frozen library, not the seeds.** The 31 cases were labelled against version 1 of the criteria, frozen in `api/evals/evidence/library_v1.rb`; `state.json` pins its digest, and editing it stops `eval:evidence` and `spec/evals` (deliberately). `db/seeds/policy_library.rb` is version 2, taken from published payer policies, so a change there does not move the eval: measuring the new criteria needs new cases labelled against them (`api/evals/evidence/PROTOCOL.md`).
- **Policy versions are append-only.** Requests point at the criteria they were opened under. Change criteria by seeding a new `version`, never by editing a version that requests already use.
- **Structured chart over FHIR:** administrative fields (demographics, coverage with BIN/PCN/Rx group, prescriber, prescription, diagnoses) come from FHIR R4 via `Fhir.source`: `FHIR_BASE_URL` if set, else the demo bundles in `api/db/fhir/demo`. Those bundles are generated from `api/db/fhir/demo_patients.rb` (`bin/rails fhir:demo_bundles`) and must agree with the seeded notes in `db/seeds/synthetic_charts.rb`; change the two together, then `bin/rails fhir:validate` (the official HL7 validator against US Core 6.1, needs Java) must report 0 errors. Never fill an administrative field by guessing: a value the chart lacks is returned empty with where to get it. Epic names an order's drug by `medicationReference` to a Medication; `Fhir::Chart` copies that Medication's code onto the order, and `spec/support/epic_shaped_source.rb` serves the demo charts that way, so read orders through the chart, not the source. The request-form eval labels the demo bundles too, so a bundle change can need a label change in `api/evals/request_form/cases.yml`. `FHIR_CLIENT_ID` + `FHIR_PRIVATE_KEY_PATH` switch the HTTP source to SMART Backend Services (`Fhir::SmartBackendAuth`); the key in `api/tmp` is a throwaway test key, never commit one.
- **The plans' clinical questions are FHIR Questionnaires.** `api/db/questionnaires/definitions.rb` is the source; `bin/rails questionnaires:build` writes the `*.json` Nora reads, and a spec fails if they drift. FEP sets are the plan's published forms word for word (kind `form`, with the PDF's revision date and sha256); UnitedHealthcare, Aetna and Cigna sets are one question per policy criterion (kind `derived`), because those plans put their questions behind CoverMyMeds' login. `RequestForm::ClinicalAnswers` answers a question only from structured FHIR data or a requirement met with verified evidence, and never reads "none" into a problem list; everything else is `ask_prescriber` or `check_chart`. A criterion number in a question set is a position in `db/seeds/policy_library.rb`, so renumbering the library means updating the sets. `bin/rails questionnaires:validate` runs the HL7 validator (0 errors expected).
- **Answers come from CQL, not Ruby.** `RequestForm::ClinicalAnswers` runs the question set's CQL (`api/cql/src`, compiled to ELM in `api/db/questionnaires/libraries`) through Node and only decides which questions apply and why one has no answer. To change how a question is answered, edit `api/cql/src/NoraCommon.cql` or the generator in `lib/tasks/questionnaires.rake`. Then:
  1. `bin/rails questionnaires:build`
  2. `docker run -d -p 8091:8080 cqframework/cql-translation-service:v2.9.0`
  3. `bin/rails questionnaires:elm`
  4. `bin/rails questionnaires:ncpdp`
  5. `bin/rails eval:request_form`, which must still score 0 harmful.

  Specs fail if the ELM, the generated CQL, or the Questionnaires drift. `api/cql/dist/run.cjs` is the engine bundled into one file (`bin/rails questionnaires:runner`, which needs npm) so the API needs Node 22 and no npm install. The Dockerfile copies the node binary; CI sets up Node in the Rails jobs.
- **A person's answer is a `FormAnswer`:** `manual` when Nora had none, `override` when it replaces Nora's. Never store Nora's own answer. The final check keeps the form and the DTR QuestionnaireResponse in `Approval#submitted_form`. `Demo::ResetService` must delete every table that hangs off a request, `form_answers` included.
- **Inferno DTR results are reported as they came** (`docs/DTR-AND-CQL.md`). Two of its correctness rules disagree with DTR and FHIR (manual origin on an item that has an expression; required items turned off by `enableWhen`), and Nora keeps its behaviour. Do not change Nora to pass them.
- **Inflections:** `criterion`/`criteria` is irregular and `evidence` is uncountable (`config/initializers/inflections.rb`). `AuthorizationEvidence` still sets `table_name` explicitly because Rails pluralizes compound names.
- **Brakeman exits non-zero on *warnings*, not just errors.** `bundle exec brakeman` exits 3 when it
  reports anything, and CI runs it unpiped, so the `Rails Tests` job fails. Two traps: piping it
  (`brakeman | tail`) throws the exit code away and looks clean, and `make lint` does **not** run
  Brakeman at all — only CI does. Verify with `brakeman --no-pager; echo $?`.
- **`main` can go red with no code change.** Brakeman's `EOLRails` check fails the build once the
  pinned Rails version passes its end-of-support date (8.0.3 ended 2026-10-07 and broke the build
  on that schedule). This is deliberate — running an unsupported Rails is a real finding, so it is
  not suppressed. The mitigation is the `rails` group in `.github/dependabot.yml`, which keeps
  Rails current; merge that PR promptly rather than ignoring the check.
- **One CI workflow:** `.github/workflows/test.yml` runs both jobs on every push/PR to main/develop. The old `api/.github/workflows/ci.yml` (later `.github/workflows/api-ci.yml`) duplicated the Rails side and has been removed.

## Key Documentation

- `README.md` — Overview, setup, env vars, tech stack, architecture link
- `docs/ARCHITECTURE.md` — Backend/frontend structure, services, routes, design decisions, technical debt
- `Makefile` — All make targets and one-line descriptions
- `api/README.md`, `base/README.md` — App-specific notes if present
