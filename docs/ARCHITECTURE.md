# Nora architecture

Nora is a monorepo: a Rails API (`api/`) that owns workflow state, rules, and
the audit trail, and a Next.js console (`base/`) for practice staff. AI is one
tool inside the API, behind a single adapter; it is not the product.

## The workflow

```
Patient + coverage + chart documents
        │
        ▼
PriorAuthorization (created from a PolicyTemplate: one requirement per criterion)
        │  extract (job)
        ▼
Rule pass ──► Model pass on redacted text ──► keep only verbatim quotes
        │
        ▼
Requirements: pending (evidence to verify) · missing · unclear
        │  staff verify / reject evidence, cite text, mark met / not applicable
        ▼
ready_for_review ──► clinician approves (digest pinned) ──► packet PDF
        │
        ▼
submitted ──► payer_pending ──► approved_by_payer | denied ──► appealed ──► closed
```

Missing or unclear requirements open a task for the ordering clinician; the
task closes when the requirement is resolved.

## Rules the code enforces

| Rule | Where |
|---|---|
| Every status change goes through one service and writes an event with its actor | `Authorizations::TransitionService`; `PriorAuthorization` rejects a status write without it |
| Allowed transitions are a fixed table | `PriorAuthorization::TRANSITIONS` |
| A requirement is met only with evidence a person verified | `AuthorizationRequirement#met_requires_verified_evidence` |
| Not applicable needs a written reason | `AuthorizationRequirement#not_applicable_requires_note` |
| Evidence must be the exact document text at its offsets | `AuthorizationEvidence#excerpt_matches_document` |
| Chart documents cannot be edited once saved, so citations never move | `ChartDocument#body_unchanged` |
| Only clinicians and admins approve; approval pins a SHA-256 digest of the requirements and evidence | `Authorizations::ApproveService`, `PriorAuthorization#content_digest` |
| Any edit after approval voids it and returns the request to review | `Authorizations::StatusSyncService` |
| Submission requires a current approval | `Authorizations::ManualTransitionService` |
| Model failures fail closed: rule evidence stays, other requirements become unclear, nothing is cached | `Authorizations::EvidenceExtractionService` |
| Model quotes not found in the chart are discarded and counted | `EvidenceExtractionService#apply_response`, `QuoteLocator` |
| Patient name, MRN, DOB, and member ID are replaced before text reaches the model | `Chart::Redactor` |
| Prompts are never logged; production refuses to call the model until `AI_PHI_BAA_CONFIRMED=true` | `Ai::Client` |
| Events, approvals, and PHI access logs are append-only | `readonly!` guards on `WorkflowEvent`, `Approval`, `PhiAccessLog` |
| Every query is scoped to the signed-in user's practice | `ApplicationController#current_organization` |
| One-click demo sign-in reaches only the practice flagged `demo`, never as admin, and only where the demo is enabled | `Demo::Practice`, `AuthController#demo` |
| The demo practice's members, settings, and profiles cannot be changed | `ApplicationController#refuse_in_demo_practice!` |

## Backend (`api/`)

**Models**

| Model | Purpose |
|---|---|
| `Organization` | A practice. Owns users, patients, documents, requests, tasks. `demo` marks the shared synthetic practice. |
| `User` | Staff account with a role: `staff`, `clinician`, or `admin`. |
| `Patient`, `PatientCoverage` | The subject of a workflow and their insurance. Patients never sign in. |
| `Payer`, `InsurancePlan` | Reference data. |
| `ChartDocument` | Pasted or uploaded chart text. Uploads keep text only. |
| `PolicyTemplate`, `PolicyCriterion` | Criteria per item, per payer or generic. `hint` drives the rule pass. |
| `PriorAuthorization` | The request and its status machine. |
| `AuthorizationRequirement`, `AuthorizationEvidence` | One criterion applied to one request, and the excerpts behind it. |
| `Approval`, `WorkflowEvent` | Sign-offs and the append-only history. |
| `Task` | Follow-up work, usually generated from a requirement. |
| `PhiAccessLog`, `RefreshToken` | Audit log and API-client refresh tokens. |

**Services**

| Namespace | Services |
|---|---|
| `Ai::` | `Client` |
| `Chart::` | `Redactor`, `TextExtractor` |
| `Authorizations::` | `CreateService`, `StartExtractionService`, `EvidenceExtractionService`, `QuoteLocator`, `RequirementReviewService`, `EvidenceReviewService`, `AddEvidenceService`, `StatusSyncService`, `TransitionService`, `ApproveService`, `ManualTransitionService`, `PacketService` |
| `Tasks::` | `SyncService` |
| `Workspace::` | `TodayService`, `MetricsService` |
| `Demo::` | `Practice` (is the demo on, who signs in, which request opens first), `Story` (plays a seeded request through the real services at simulated times), `ResetService` |

`ExtractEvidenceJob` runs extraction off the request cycle.

**The demo practice.** `db/seeds/demo_requests.rb` plays four requests through
the workflow services with `Demo::Story`, so seeded history obeys the same rules
as live history; only the rule pass of extraction runs, so seeding never calls a
model. `rails demo:reset` clears the practice and seeds it again. It is seeded
everywhere but production, and in production only with `DEMO_PRACTICE=true`.

**Routes** (all under `/api/v1/`)

| Area | Routes |
|---|---|
| Auth | `auth/signup` (creates a practice), `login`, `demo` (one-click sign-in to the demo practice), `logout`, `csrf`, `refresh`, `me`, `profile` |
| Practice | `GET/PATCH organization`, `organization/members` (index, create, update) |
| Console | `GET today`, `GET metrics`, `tasks` (index, update) |
| Patients | `patients` (index, show, create, update), `patients/:id/coverages`, `patients/:id/chart_documents`, `chart_documents/:id` (show, destroy) |
| Reference | `payers`, `policy_templates` |
| Nora Auth | `prior_authorizations` (index, show, create, update) with `extract`, `approve`, `transition`, `packet`, `events`; `authorization_requirements/:id` (update, `evidence`); `authorization_evidence/:id` |

## Frontend (`base/`)

- **Routes:** `/`, `/login`, `/signup`, `/demo` (enters the demo practice), and under `/dashboard`: Today, `patients`, `patients/[id]`, `prior-authorizations`, `prior-authorizations/new`, `prior-authorizations/[id]`, `tasks`, `settings`, `settings/profile`.
- **API client (`lib/api/`):** `client` (cookie session, CSRF, 401 handling, `readJson`), `auth`, `workspace`, `prior-authorizations`, `hooks` (SWR), `schemas` (Zod contracts, validated in development).
- **Workflow display rules (`lib/prior-auth.ts`):** labels, tones, and the reasons an action is unavailable, mirrored from the server so the reason shows before a request is made.
- **Components:** `ui/` (shadcn primitives, restyled, plus `native-select`), `navigation/` (logo, auth shell, footer), `landing/` (hero shapes and the worked example on `/`), `dashboard/` (shell, demo banner, per-account SWR cache), `workspace/` (page header, `Panel` and `Card`, `Notice`, status pills, requirement panel, document viewer, task list).
- **Design tokens (`app/globals.css`):** a white page, warm off-white tiles (`bg-tile`), near-black ink, and five accents that carry meaning: blue (in progress), purple (waiting on approval), yellow (needs clarification), green (met, approved), orange (missing, failed). Each accent has a tint for backgrounds and a `-deep` shade that passes AA as text. Headings use DM Sans (`font-display`), body text Inter. Buttons and pills are fully rounded. Screens are built from `Panel` (a tile) holding `Card`s (white, hairline border).

## Evidence eval (`api/evals/evidence/`)

A labelled case set and a runner for one question: does evidence extraction
propose the right chart text for each criterion, and stay quiet when the chart
does not support one? Cases are synthetic charts labelled by a person;
`Authorizations::EvidenceExtractionService` is called through the real entry
point on a scratch database. `bin/rails eval:evidence:selfcheck` proves the
grader against known answers and rehearses model failures before any score is
trusted. The eval's own `README.md` covers the metrics and their limits.

## Auth

The browser uses an httpOnly session cookie plus a CSRF token from
`GET /auth/csrf`. Non-browser clients opt in with `X-Client-Type: api` and get a
30-minute JWT and a rotating 30-day refresh token with reuse detection. Accounts
lock for 15 minutes after 5 failed logins; Rack::Attack throttles auth, AI, and
general API traffic per IP.

## Known gaps

- **Production database is unresolved.** `config/database.yml` defines
  production as SQLite (solid_cache/queue/cable); deployment docs have said
  PostgreSQL. Decide before the first real deploy.
- **Deployment is not configured.** `config/deploy.yml` is the Kamal template.
- **No OpenAPI document.** Zod schemas are the contract today.
- **Scanned PDFs** have no text layer and are refused; OCR is not built.
- **Policy library is illustrative.** Seeded criteria are a common baseline, not
  any payer's published policy.
- **No payer submission.** Staff submit through the payer's portal or ePA
  network and record it in Nora.
