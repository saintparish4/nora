# NORA Architecture Documentation

## Overview

NORA is a monorepo containing a Rails API backend (`api/`) and a Next.js frontend (`base/`). This document outlines the project structure, conventions, and guidelines for developers.

## Backend Structure (`api/`)

- **Controllers** (`app/controllers/api/v1/`): `auth`, `appointments`, `providers`, `quick_booking`, `slots`, `symptom_chat`, `symptoms`
- **Services** (`app/services/`): `Appointments::SlotGeneratorService`, `Providers::ProviderMatchingService`, `Providers::MatchAndSlotService`, `Triage::SymptomAnalyzerService`, `Triage::ConversationSufficiencyService`
- **Routes** (all under `/api/v1/`): auth (signup, login, logout, me, update_preferences), providers (index, show, available_slots), appointments (index, show, create, cancel), quick-booking (analyze, book), `/analyze-symptoms`, symptom-chat (send_message)
- **Models**: User, Provider, Appointment, Availability, Conversation, ConversationMessage, UserPreference, PhiAccessLog
- **Jobs**: Active Job base; Sidekiq + sidekiq-scheduler in use for background work
- **Mailers**: AppointmentMailer (booking confirmation, cancellation notice)

## Frontend Structure (`base/`)

- **App routes**: `(auth)` login, signup; `(protected)` dashboard (and sub-routes: appointments, billing, documents, labs, medications, messages, providers, settings, symptoms), appointments, booking, get-care, providers, quick-booking, settings, logout; public: `/`, `/locations`, `/specialists`, `/technology`
- **API client** (`lib/api/`): `client`, `auth`, `appointments`, `providers`, `quick-booking`, `symptom-chat`, `symptoms`
- **Types** (`types/`): `auth`, `appointments`, `providers`, `quick-booking`, `symptom-chat`, `symptoms`
- **Components**: `ui/` (shadcn primitives), `landing/`, `navigation/`, `dashboard/`, `chat/`

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

- **Backend**: Run `cd api && bundle exec rspec`
- **Frontend**: Run `cd base && pnpm test` (Jest)

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
| RSpec over Minitest | Personal preference and richer DSL for request/service specs. |
| shadcn/ui for frontend | Accessible, customizable components without a heavy framework lock-in. |
| API client split by domain in `lib/api/` | Mirrors backend; each module stays focused and easier to maintain. |
| Types in dedicated `types/` dir | Central place for API contracts and shared DTOs. |
| Render for API deployment | Managed platform; no container/infra to maintain; simple Git-based deploys and built-in PostgreSQL. |

## What We’d Change If Rebuilding / Production Readiness

- **Auth**: Move away from JWT in localStorage toward httpOnly cookies (or short-lived access + refresh tokens) and CSRF protection; add rate limiting and lockout for auth endpoints.
- **Observability**: Sentry error tracking (backend + frontend) and lograge structured JSON logging are in place. Next step: metrics (latency, errors, queue depth) and distributed tracing.
- **API**: Centralized `rescue_from` error handling gives consistent error payloads. Zod schemas in `base/lib/api/schemas.ts` provide runtime contract validation. Remaining gap: OpenAPI/Swagger docs.
- **Frontend**: Global 401 interceptor centralizes auth expiry handling. Next.js error boundaries (`error.tsx`) are in place at root and dashboard levels. SWR hooks standardize data fetching.
- **Infra**: Use PostgreSQL in all environments (no SQLite in dev) to avoid environment drift; define backup, restore, and migration rollback; consider feature flags and phased rollouts for risky changes.
- **Testing**: Broaden coverage on critical paths (auth, booking, payments if added); add a small set of smoke or contract tests for the API used by the frontend.

## Planned Features (Tables Exist, Not Yet Wired Up)

| Table | Purpose | Status |
|-------|---------|--------|
| `calendar_connections` | OAuth tokens for syncing provider availability from Google Calendar. The `blocked_slots` table is populated manually today; calendar sync will auto-create blocked slots from external events. | Schema only — no model, service, or OAuth flow yet. |
| `risk_assessments` | Persisted triage risk assessments linked to conversations and users. Enables longitudinal risk tracking and escalation workflows. | Schema only — no model or service yet. |
| `follow_up_recommendations` | Post-appointment follow-up reminders (e.g. "schedule a check-up in 2 weeks"). Generated by providers or automated rules, delivered via email/notification. | Schema only — no model or delivery logic yet. |

## Known Technical Debt

- **Auth storage**: JWT in localStorage is a known security tradeoff; no refresh flow or token rotation yet. Moving to httpOnly cookies is a tracked future improvement.
- **SQLite in development**: Differs from production PostgreSQL; can cause subtle bugs (e.g. SQL or locking behavior). Consider PostgreSQL in dev for full environment parity.
- **No formal API contract**: No OpenAPI/Swagger; Zod schemas in `base/lib/api/schemas.ts` provide runtime validation but no generated docs.
- **Tests**: Gaps on edge cases and some integration paths; coverage is not yet at a consistent baseline for critical flows.

*Items resolved since initial draft: centralized `rescue_from` error handling, global 401 interceptor, Sentry error tracking (backend + frontend), structured JSON request logging (lograge), Next.js error boundaries, and ApplicationJob retry/discard policies.*

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

## Deployment

- **Backend**: Deployed on Render (managed Ruby/Rails hosting)
- **Frontend**: Deployed via Vercel or similar platform
- **Database**: PostgreSQL in production (Render Postgres or external)

## Getting Started

See `README.md` for setup instructions and `Makefile` for common development commands.

## Questions?

For questions about architecture decisions or conventions, refer to this document or ask me!
