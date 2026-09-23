# NORA - Medical AI Booking Platform

## What NORA solves

**Problem:** Patients struggle to find the right specialist for their symptoms, face fragmented scheduling (calls, multiple portals), and often book the wrong type of visit.

**Solution:** NORA uses AI to analyze symptoms, recommend the right provider, and get from "I have these symptoms" to a confirmed appointment in under 2 minutes in one flow.

NORA is an AI-powered healthcare booking platform that intelligently matches patients with the right providers and eliminates scheduling friction.

## Features

| Feature | Description |
|---------|-------------|
| **Quick Booking** | Go from symptoms to booked appointment in under 2 minutes with our streamlined booking flow |
| **AI-Powered Matching** | Intelligent symptom analysis that recommends the most appropriate medical specialists |
| **Smart Scheduling** | Real-time availability and instant appointment booking |
| **Secure Authentication** | JWT-based user authentication and authorization |
| **Automated Notifications** | Email reminders and confirmations for appointments |
| **Provider Management** | Comprehensive provider profiles with specialties and availability |

## Quick start (under 5 commands)

From clone to app running locally:

```bash
git clone <repository-url> && cd nora
make setup
```

```bash
cp api/.env.example api/.env
cp base/.env.local.example base/.env.local
```

Fill in the required variables (see [Environment variables](#environment-variables)).

```bash
make dev
```

- Backend: http://localhost:3001  
- Frontend: http://localhost:3000  

## Tech stack

| Layer    | Technology          | Version   |
| -------- | ------------------- | --------- |
| Backend  | Ruby                | 3.4.8     |
| Backend  | Rails (API)         | 8.0.3     |
| Frontend | Next.js             | 16.1.6    |
| Frontend | React               | 19.2.1    |
| Frontend | TypeScript          | 5.x       |
| Frontend | Tailwind CSS        | 4.1.17    |
| Database | SQLite / PostgreSQL | —         |
| AI       | OpenAI              | gpt-4o-mini |
| Other    | JWT, Resend, Redis  | optional in dev |

SQLite in development; PostgreSQL-ready for production.

## Getting Started

### Prerequisites

- Ruby 3.4.x (backend)
- Node.js 22.13+ and pnpm 12 (frontend — pnpm 12 refuses to run on older Node)
- PostgreSQL optional for local dev; required for production

See the [Tech stack](#tech-stack) table above for exact versions.

### Setup (detailed)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nora
   ```

2. **Backend setup**:
   ```bash
   cd api
   bundle install
   rails db:create db:migrate db:seed
   ```

3. **Frontend setup**:
   ```bash
   cd base
   pnpm install
   ```

4. **Environment variables** — see [Environment variables](#environment-variables).

5. **Run development servers**:
   ```bash
   make dev
   # Or separately:
   # cd api && rails server        # Backend on http://localhost:3001
   # cd base && pnpm run dev       # Frontend on http://localhost:3000
   ```

### Environment variables

Backend and frontend each use their own env file, both templated in the repo:

```bash
cp api/.env.example api/.env
cp base/.env.local.example base/.env.local
```

**Backend (`api/.env`):**

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY_BASE` | **Yes** | Secret for signing/verifying JWTs (and Rails session cookie). Use a long random string in dev; e.g. `openssl rand -hex 64`. |
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for symptom analysis (gpt-4o-mini). |
| `RESEND_API_KEY` | **Yes** (production) | Resend API key for email; optional in dev (mailer can log only). |
| `RESEND_FROM_EMAIL` | No | Sender address; defaults to Resend onboarding address. |
| `REDIS_URL` | No (dev) | Defaults to `redis://localhost:6379/0`; required in production if using Redis cache/queue. |
| `SENTRY_DSN` | No | Sentry DSN for backend error tracking; optional in dev. |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for uploading source maps in CI/build. |
| `FRONTEND_URL` | No (dev) | Base URL used to build links in outgoing email. Defaults to `http://localhost:3000`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | No | Read by `config/initializers/google_calendar.rb`. Inert today — the `calendar_connections` table exists but no OAuth flow is implemented. |

**Frontend (`base/.env.local`):**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend API base URL (e.g. `http://localhost:3001` for local). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Only needed for the locations/map feature. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for frontend error tracking; optional in dev. |
| `SENTRY_DSN` | No | Same DSN, read by the server and edge runtimes. |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for uploading source maps in CI/build. |
| `NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS` | No | Set to `true` to reveal the unbuilt dashboard sections (labs, billing, documents, medications, messages). Off by default — see [Preview sections](#preview-sections). |

### Development commands

See [Makefile](Makefile) for common commands:

- `make dev` — Start both backend and frontend
- `make test` — Run all tests
- `make setup` — Initial project setup (install + db create/migrate/seed)
- `make db-reset` — Reset database

## Branch protection and CI

One GitHub Actions workflow runs on push and pull requests to `main` and `develop`:

| Workflow | File | Jobs |
|----------|------|------|
| **Run Tests** | [.github/workflows/test.yml](.github/workflows/test.yml) | `Rails Tests` — RuboCop, Brakeman, RSpec. `Next.js Tests` — ESLint, Next.js build, Jest. |

Require both jobs (`Rails Tests`, `Next.js Tests`) as status checks in branch protection.

## Preview sections

Five dashboard areas — **labs, billing, documents, medications, messages** — are
designed but not built: they render realistic clinical content from hardcoded
arrays with no table, model, or endpoint behind any of it.

Showing invented lab values or account balances to a real patient is a
credibility problem, not just tech debt, so those routes return 404 unless you
opt in:

```bash
# base/.env.local
NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS=true
```

With the flag on, each page carries a banner stating that the content is sample
data. The flag goes away when the pages either get real endpoints or get
deleted — see `base/lib/preview-sections.ts`.

## Architecture

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The project follows a monorepo structure:

- `api/` — Rails API backend (all routes under `/api/v1/`)
- `base/` — Next.js frontend with organized components and API clients

## Tech tradeoffs

| Decision | Rationale | Future plans |
|----------|-----------|--------------|
| **Web-first approach** | Built as a web application to accelerate development and enable rapid iteration | Native Android and iOS apps planned for future releases |
| **API versioning** | All routes under `/api/v1/` for consistency and future-proofing | Easy to add `/api/v2/` when needed |
| **Monorepo structure** | Keeps frontend and backend in sync, simplifies deployment | Consider splitting if teams grow significantly |
