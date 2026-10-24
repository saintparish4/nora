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
ready_for_review (ready to submit) ──► staff final check (digest pinned), submitted under the prescriber's name
        │
        ▼
submitted ──► packet PDF · payer_pending ──► approved_by_payer | denied ──► appealed ──► closed
```

Staff own the request from start to finish; no clinician signs off
(`docs/FRONT-DESK-WORKFLOW.md`). Missing or unclear requirements open a task
for the staff member who owns the request. "Ask the prescriber's office" is an
action on that task that records the ask; nothing waits on it. The task closes
when the requirement is resolved.

## Rules the code enforces

| Rule | Where |
|---|---|
| Every status change goes through one service and writes an event with its actor | `Authorizations::TransitionService`; `PriorAuthorization` rejects a status write without it |
| Allowed transitions are a fixed table | `PriorAuthorization::TRANSITIONS` |
| A requirement is met only with evidence a person verified | `AuthorizationRequirement#met_requires_verified_evidence` |
| Not applicable needs a written reason | `AuthorizationRequirement#not_applicable_requires_note` |
| Evidence must be the exact document text at its offsets | `AuthorizationEvidence#excerpt_matches_document` |
| Chart documents cannot be edited once saved, so citations never move | `ChartDocument#body_unchanged` |
| Submission goes through the staff member's final check, which pins a SHA-256 digest of the requirements and evidence and records who submitted and on whose behalf | `Authorizations::SubmitService`, `PriorAuthorization#content_digest` |
| Nothing can be submitted until every requirement is met or not applicable | `Authorizations::SubmitService` |
| Submission cannot be set by hand | `PriorAuthorization::MANUAL_TARGETS`, `Authorizations::ManualTransitionService` |
| Model failures fail closed: rule evidence stays, other requirements become unclear, nothing is cached | `Authorizations::EvidenceExtractionService` |
| Model quotes not found in the chart are discarded and counted | `EvidenceExtractionService#apply_response`, `QuoteLocator` |
| Patient name, MRN, DOB, and member ID are replaced before text reaches the model | `Chart::Redactor` |
| Prompts are never logged; production refuses to call the model until `AI_PHI_BAA_CONFIRMED=true`, except for the demo practice | `Ai::Client` |
| The demo practice's patients and chart text cannot be added to in production, so that exception only ever covers synthetic text | `ApplicationController#keep_demo_chart_synthetic!` |
| A keyword is not evidence: a rule hit is dropped when its sentence denies it, belongs to a relative, or lacks what the criterion asks for (a recent date, an outcome, a second drug) | `Authorizations::RulePass` |
| A payer question is only answered "supported" when a quote that is really in the chart supports it | `Authorizations::QuestionHelpService` |
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
| `Approval`, `WorkflowEvent` | The final check before submission (an `Approval` row), and the append-only history. |
| `Task` | Follow-up work, usually generated from a requirement. |
| `PhiAccessLog`, `RefreshToken` | Audit log and API-client refresh tokens. |

**Services**

| Namespace | Services |
|---|---|
| `Ai::` | `Client` |
| `Chart::` | `Redactor`, `TextExtractor` |
| `Authorizations::` | `CreateService`, `StartExtractionService`, `EvidenceExtractionService`, `QuoteLocator`, `RulePass`, `RedactedChart`, `QuestionHelpService`, `RequirementReviewService`, `EvidenceReviewService`, `AddEvidenceService`, `StatusSyncService`, `TransitionService`, `SubmitService`, `ManualTransitionService`, `PacketService`; `Tasks::` `SyncService`, `AskPrescriberService` |
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
| Nora Auth | `prior_authorizations` (index, show, create, update) with `extract`, `question_help`, `submit`, `transition`, `packet`, `events`; `tasks` (index, update, `ask_prescriber`); `authorization_requirements/:id` (update, `evidence`); `authorization_evidence/:id` |

## Frontend (`base/`)

- **Routes:** `/`, `/login`, `/signup`, `/demo` (enters the demo practice: it draws the workspace frame and a skeleton of the destination with a terminal-style log on top, waits for `lib/api/health.ts` to have the API answering `GET /up` because the free Render instance can take a minute to wake, signs in, starts the destination's reads with `lib/api/preload.ts`, and navigates at once so the skeleton underneath becomes the page; the landing page probes on load, fetches the CSRF token and the request page's code, so the API is often awake already), and under `/dashboard`: Today, `patients`, `patients/[id]`, `prior-authorizations`, `prior-authorizations/new`, `prior-authorizations/[id]`, `tasks`, `settings`, `settings/profile`.
- **API client (`lib/api/`):** `client` (cookie session, CSRF, 401 handling, `readJson`), `auth`, `workspace`, `prior-authorizations`, `hooks` (SWR; exported key helpers so `preload` names requests the way the hooks do), `preload` (start a screen's reads before it mounts), `health` (wake the API), `schemas` (Zod contracts, validated in development).
- **Loading states:** only the request route has a `loading.tsx`, shaped like the request page (`components/workspace/screen-skeletons.tsx`). There is deliberately no root or dashboard-wide one: a navigation without a boundary keeps the current screen until the next can draw, while the old root boundary put a blank full-screen loader between `/demo` and the workspace.
- **Workflow display rules (`lib/prior-auth.ts`):** labels, tones, and the reasons an action is unavailable, mirrored from the server so the reason shows before a request is made.
- **Components:** `ui/` (shadcn primitives, restyled, plus `native-select`), `navigation/` (logo, auth shell, footer), `landing/` (hero shapes and the worked example on `/`), `dashboard/` (shell, demo banner, per-account SWR cache), `demo/` (the guided walkthrough, whose steps are in `lib/demo-tour.ts`, and the wake log on `/demo`), `workspace/` (page header, `Panel` and `Card`, `Notice`, status pills, requirement panel, document viewer, task list).
- **Design tokens (`app/globals.css`):** a white page, warm off-white tiles (`bg-tile`), near-black ink, and five accents that carry meaning: blue (in progress), purple (ready to submit), yellow (needs clarification), green (met, approved), orange (missing, failed). Each accent has a tint for backgrounds and a `-deep` shade that passes AA as text. Headings use DM Sans (`font-display`), body text Inter. Buttons and pills are fully rounded. Screens are built from `Panel` (a tile) holding `Card`s (white, hairline border).

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

- **Production keeps nothing between boots.** The Render deploy runs the
  SQLite layout in `config/database.yml` on the instance's own disk, with no
  `DATABASE_URL` and no persistent disk (checked 2026-10-24: after several
  deploys and demo resets the demo's requests are still ids 1-4, where a
  persistent database keeps counting up). Every deploy or wake starts empty
  and reseeds the demo practice. That suits a shared synthetic demo; a real
  practice needs PostgreSQL (`DATABASE_URL`, already tested in CI) or a
  persistent disk first.
- **Deployment is not configured.** `config/deploy.yml` is the Kamal template.
- **`api/Dockerfile` cannot start.** `bin/*` are mode 644 in git, so the image's
  entrypoint fails with `exec: "/rails/bin/docker-entrypoint": permission
  denied`. The live API on Render must therefore run from Render's own build
  and start commands, not this image, so the entrypoint's `demo:reset` on boot
  probably does not run there (check Render's settings to confirm). Under Render's
  free limits (0.1 CPU) the server alone takes about 42 s to answer `/up`
  (4.3 s at full CPU: about half gems and Rails, half the app's own load);
  `db:prepare` on an empty disk adds 17 s and `demo:reset` 15 s.
- **No OpenAPI document.** Zod schemas are the contract today.
- **Scanned PDFs** have no text layer and are refused; OCR is not built.
- **Policy library covers four payers.** Criteria come from the published
  policies of UnitedHealthcare, Aetna, Cigna and the BCBS Federal Employee
  Program as retrieved on 2026-10-22 (`api/evals/evidence/policies/`). Nothing
  watches those policies for changes, other Blue plans and Cigna's BMI-32/35
  variants fall back to a common baseline, and no criterion checks whether the
  member's plan covers weight-loss drugs at all.
- **No payer submission.** Staff submit through the payer's portal or ePA
  network and record it in Nora.
