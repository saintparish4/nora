# NORA Architecture Documentation

## Overview

NORA is a monorepo containing a Rails API backend (`api/`) and a Next.js frontend (`base/`). This document outlines the project structure, conventions, and guidelines for developers.

## Backend Structure (`api/`)

- **Controllers** (`app/controllers/api/v1/`): `auth`, `appointments`, `care_preferences`, `conversations`, `providers`, `quick_booking`, `slots`, `symptom_chat`, `symptoms`
- **Services** (`app/services/`): `Appointments::SlotGeneratorService`, `Providers::ProviderMatchingService`, `Providers::MatchAndSlotService`, `Triage::RedFlagScreenerService`, `Triage::SymptomAnalyzerService`, `Triage::ConversationSufficiencyService`, `Triage::RiskAssessmentService`
- **Routes** (all under `/api/v1/`): auth (signup, login, logout, me, update_preferences, profile), care-preferences (show, update), providers (index, show, available_slots), appointments (index, show, create, cancel), conversations (index, show), quick-booking (analyze, book), `/analyze-symptoms`, symptom-chat (send_message)
- **Models**: User, Provider, ProviderCondition, Appointment, Availability, BlockedSlot, Conversation, ConversationMessage, RiskAssessment, UserPreference, PhiAccessLog
- **Jobs**: Active Job base; Sidekiq + sidekiq-scheduler in use for background work
- **Mailers**: AppointmentMailer (booking confirmation, cancellation notice, 24h reminder)

## Frontend Structure (`base/`)

- **App routes**
  - `(auth)`: `/login`, `/signup`
  - `(protected)`: `/dashboard`, `/dashboard/get-care`, `/dashboard/symptoms`, `/dashboard/symptoms/history`, `/dashboard/providers`, `/dashboard/providers/[id]`, `/dashboard/providers/specialties`, `/dashboard/appointments`, `/dashboard/appointments/history`, `/dashboard/settings`, `/dashboard/settings/profile`, `/dashboard/settings/preferences`, `/logout`
  - `(protected)`, **preview only** — sample data, 404 unless `NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS=true`: `/dashboard/labs`, `/dashboard/labs/all`, `/dashboard/billing`, `/dashboard/billing/payments`, `/dashboard/documents`, `/dashboard/documents/records`, `/dashboard/documents/forms`, `/dashboard/medications`, `/dashboard/medications/refills`, `/dashboard/messages`
  - public: `/`, `/locations`, `/specialists`, `/technology`
  - `next.config.ts` redirects the old top-level `/appointments`, `/providers`, `/settings`, `/get-care`, and `/quick-booking` paths into `/dashboard/*`
- **API client** (`lib/api/`): `client`, `auth`, `appointments`, `conversations`, `preferences`, `providers`, `quick-booking`, `symptom-chat`, `symptoms`, plus `hooks` (SWR) and `prefetch`
- **Types** (`types/`): `auth`, `appointments`, `conversations`, `preferences`, `providers`, `quick-booking`, `symptom-chat`, `symptoms` — most are re-exports of the Zod schemas in `lib/api/schemas.ts`
- **Components**: `ui/` (shadcn primitives), `navigation/`, `dashboard/`, `chat/`

## Development Workflow

### Adding a New Feature

1. **Backend**:
   - Create controller under `app/controllers/api/v1/`
   - Add service under appropriate domain in `app/services/`
   - Add routes to `config/routes.rb` under `/api/v1/`
   - Write RSpec tests in `spec/`

2. **Frontend**:
   - Add types to `types/` directory
   - Add API functions to `lib/api/` module
   - Create components in appropriate subdirectory
   - Add pages in `app/` directory

### Testing

- **Backend**: `cd api && bundle exec rspec` (SimpleCov writes `api/coverage/index.html`)
- **Frontend**: `cd base && pnpm test` (Jest). Pass flags directly — `pnpm test --ci`,
  not `pnpm test -- --ci`, which pnpm 10+ forwards to Jest as a path pattern.
- **CI**: one workflow, `.github/workflows/test.yml`, with a `Rails Tests` job and
  a `Next.js Tests` job.

### Code Style

- **Backend**: Follow Ruby style guide, use RuboCop
- **Frontend**: Use ESLint and Prettier, follow Next.js conventions

## Key Technology Choices

### Backend

- **Rails 8**: Modern Ruby framework with API mode
- **RSpec**: Testing framework (not Minitest)
- **Sidekiq**: Background job processing
- **PostgreSQL**: Production database (SQLite for development)
- **OpenAI GPT**: AI-powered symptom analysis

### Frontend

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **JWT**: Authentication tokens stored in localStorage

## Why We Chose This Approach

- **Monorepo**: Keeps API and frontend in sync, simplifies cross-cutting changes (e.g. new endpoints + types + UI), and avoids version drift between client and server. One clone, one place for docs and tooling.
- **Rails API + Next.js**: Rails gives a fast path for API, background jobs, and DB modeling; Next.js gives a modern React stack with SSR/SSG and a clear App Router structure. Separating backend and frontend allows independent scaling and deployment.
- **Domain-oriented services**: Putting business logic in `app/services/` by domain (triage, appointments, calendar, etc.) keeps controllers thin, makes behavior testable without HTTP, and makes it obvious where to add or change features.
- **Versioned API (`/api/v1/`)**: Allows future breaking changes without breaking existing clients; we can add v2 when needed.
- **JWT in localStorage**: Simple to implement and sufficient for current scope; we accept the tradeoff that we’ll need a different strategy (e.g. httpOnly cookies, refresh tokens) for stronger security if we add sensitive or long-lived sessions.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| All API under `/api/v1/` | Single version prefix; easy to route, document, and evolve. |
| Services by domain (e.g. `Triage::`, `Appointments::`) | Clear ownership, easier testing, and alignment with product areas. |
| Deterministic red-flag rules in front of the LLM | `Triage::RedFlagScreenerService` matches a fixed list of emergency presentations (cardiac, stroke, airway, anaphylaxis, hemorrhage, self-harm, altered consciousness, poisoning) before any model call. When a rule fires the model is not consulted at all. A probabilistic component must not be the only thing between a patient and an emergency room, and rules keep working when OpenAI is down. |
| Triage fails **safe**, never open | Every degraded path — API error, unparseable JSON, urgency outside the contract — escalates to `urgent` and sets `assessment_failed: true`. It previously defaulted to `routine`, so one timeout silently turned a possible emergency into "schedule within 1-2 weeks". Degraded results are also never cached, so a single outage cannot serve a stale non-answer for 7 days. |
| No bookable slots for an emergency | Both the chat and quick-booking flows return an empty provider list when urgency is `emergency`. Offering an appointment next to "call 911" invites the wrong choice. |
| RSpec over Minitest | Personal preference and richer DSL for request/service specs. |
| shadcn/ui for frontend | Accessible, customizable components without a heavy framework lock-in. |
| API client split by domain in `lib/api/` | Mirrors backend; each module stays focused and easier to maintain. |
| Types in dedicated `types/` dir | Central place for API contracts and shared DTOs. |
| Render for API deployment | Managed platform; no container/infra to maintain; simple Git-based deploys and built-in PostgreSQL. |

## What We’d Change If Rebuilding / Production Readiness

- **Auth**: Move away from JWT in localStorage toward httpOnly cookies (or short-lived access + refresh tokens) and CSRF protection; add rate limiting and lockout for auth endpoints.
- **Observability**: Sentry error tracking (backend + frontend) and lograge structured JSON logging are in place. Next step: metrics (latency, errors, queue depth) and distributed tracing.
- **API**: Centralized `rescue_from` error handling gives consistent error payloads. Zod schemas in `base/lib/api/schemas.ts` provide runtime contract validation. Remaining gap: OpenAPI/Swagger docs.
- **Frontend**: Global 401 interceptor centralizes auth expiry handling, scoped so login/signup and the on-mount session probe opt out — a 401 there means "wrong password" or "stale token", not "your session just died". Next.js error boundaries (`error.tsx`) are in place at root and dashboard levels. SWR hooks standardize data fetching.
- **Infra**: Use PostgreSQL in all environments (no SQLite in dev) to avoid environment drift; define backup, restore, and migration rollback; consider feature flags and phased rollouts for risky changes.
- **Testing**: Broaden coverage on critical paths (auth, booking, payments if added); add a small set of smoke or contract tests for the API used by the frontend.

## Planned Features (Tables Exist, Not Yet Wired Up)

| Table | Purpose | Status |
|-------|---------|--------|
| `calendar_connections` | OAuth tokens for syncing provider availability from Google Calendar. The `blocked_slots` table is populated manually today; calendar sync will auto-create blocked slots from external events. | Schema only — no model, service, or OAuth flow yet. |
| `risk_assessments` | Persisted triage risk assessments linked to conversations and users. Enables longitudinal risk tracking and escalation workflows. | **Live.** `RiskAssessment` + `Triage::RiskAssessmentService`, written on every completed chat analysis for a signed-in patient and surfaced under `/dashboard/symptoms/history`. `confidence`, `self_care_options`, and `escalation_triggers` stay empty until the analyzer prompt produces them. |
| `follow_up_recommendations` | Post-appointment follow-up reminders (e.g. "schedule a check-up in 2 weeks"). Generated by providers or automated rules, delivered via email/notification. | Schema only — no model or delivery logic yet. |

## Known Technical Debt

- **Auth storage**: JWT in localStorage is a known security tradeoff; no refresh flow or token rotation yet. Moving to httpOnly cookies is a tracked future improvement, and the decision is coupled to deployment: the API (Render) and frontend (Vercel) are on different origins, so a cookie-only session needs `SameSite=None; Secure` or a shared custom domain. Server-side expiry *is* enforced — `JsonWebToken.encode` sets a 24h `exp` and `decode` rejects expired tokens. Per-account lockout (5 failed logins, 15 minutes) complements the per-IP Rack::Attack throttle.
- **SQLite in development**: Differs from production PostgreSQL; can cause subtle bugs (e.g. SQL or locking behavior). Consider PostgreSQL in dev for full environment parity.
- **No formal API contract**: No OpenAPI/Swagger; Zod schemas in `base/lib/api/schemas.ts` provide runtime validation but no generated docs.
- **Tests**: Gaps on edge cases and some integration paths; coverage is not yet at a consistent baseline for critical flows.

*Items resolved since initial draft: centralized `rescue_from` error handling, global 401 interceptor, Sentry error tracking (backend + frontend), structured JSON request logging (lograge), Next.js error boundaries, ApplicationJob retry/discard policies, per-account login lockout, and `risk_assessments` wired end to end.*

## Environment Variables

Copy `api/.env.example` → `api/.env` and `base/.env.local.example` → `base/.env.local` to get started. See `README.md` for the full table with descriptions.

### Backend (`api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY_BASE` | **Yes** | Signs/verifies JWTs and the Rails session cookie. |
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for symptom analysis (gpt-4o-mini). |
| `RESEND_API_KEY` | Yes (prod) | Resend API key for transactional email. |
| `RESEND_FROM_EMAIL` | No | Sender address; defaults to Resend onboarding address. |
| `REDIS_URL` | No (dev) | Defaults to `redis://localhost:6379/0`; required in production. |
| `SENTRY_DSN` | No | Sentry DSN for backend error tracking. |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for source map uploads in CI. |

### Frontend (`base/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend API base URL (e.g. `http://localhost:3001` for local). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Only needed for the /locations map feature. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for frontend error tracking. |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for source map uploads in CI. |
| `NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS` | No | `true` reveals the unbuilt sample-data sections listed above. Off by default. |

## Deployment

- **Backend**: Deployed on Render (managed Ruby/Rails hosting)
- **Frontend**: Deployed via Vercel or similar platform
- **Database**: PostgreSQL in production (Render Postgres or external)

## Getting Started

See `README.md` for setup instructions and `Makefile` for common development commands.

## Questions?

For questions about architecture decisions or conventions, refer to this document or ask me!
