# Nora

**Healthcare, followed through.** Nora helps outpatient practices finish the
administrative work that starts once a clinician decides what a patient needs.

The first capability is **Nora Auth**: prior authorization evidence and packet
preparation. A medical assistant adds a patient's chart notes, picks the
medication and payer, and Nora:

1. checks the chart against the payer's criteria,
2. quotes the exact chart text that documents each criterion, or says what is missing,
3. opens follow-up tasks for the ordering clinician when documentation is missing,
4. requires staff to verify every quote and a clinician to approve the packet,
5. renders the approved packet as a PDF and tracks the request to a payer decision.

Nora never decides medical necessity and never marks a requirement met on its
own. People verify evidence and approve; Nora prepares and keeps the record.

## Quick start

```bash
make setup                                   # install, create, migrate, seed
cp api/.env.example api/.env                 # set SECRET_KEY_BASE
cp base/.env.local.example base/.env.local
make dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

Sign in with a synthetic demo account (password `password123`):

| Email | Role |
|---|---|
| `demo@nora.com` | Admin |
| `clinician@nora.com` | Clinician (can approve) |
| `ma@nora.com` | Staff |

The seeds create a demo practice with five synthetic patients, a GLP-1 policy
library, and four requests at different stages: one decided by the payer, one
waiting for the clinician, one blocked on missing documentation, and one just
read. The fifth patient has no request, so there is one left to start. Every
name and note is invented.

http://localhost:3000/demo signs you in to that practice without a password, as
the medical assistant (`/demo?as=clinician` for the clinician, who can approve).
`cd api && bin/rails demo:reset` puts the practice back the way the seeds left it.

The demo practice is off in production. Set `DEMO_PRACTICE=true` on the API to
seed it there and enable `/demo`; the container then rebuilds it on every boot,
because the practice is shared by everyone who opens it.

Without `OPENAI_API_KEY`, evidence extraction runs the rule pass only and says
so on screen. That is enough to try the whole flow.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Ruby 4.0.7, Rails 8.1 (API mode), SQLite in development, PostgreSQL via `DATABASE_URL` |
| Background jobs | Active Job (async in development, solid_queue in production) |
| AI | OpenAI through a single adapter, `Ai::Client` (default `gpt-4o-mini`) |
| PDF | prawn (packets), pdf-reader (uploaded chart PDFs) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, SWR, Zod |
| Other | Resend, Sentry, Lograge, Rack::Attack, Redis cache |

### Prerequisites

- Ruby 4.0.x
- Node.js 22.13+ and pnpm 12 (pnpm 12 refuses to run on older Node)
- Docker, only to run the PostgreSQL test suite locally

## Environment variables

**Backend (`api/.env`):**

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY_BASE` | **Yes** | Signs the session cookie and JWTs. `openssl rand -hex 64`. |
| `OPENAI_API_KEY` | No | Enables the model pass of evidence extraction. Without it, only rules run. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. |
| `DEMO_PRACTICE` | No | `true` seeds the synthetic demo practice in production and enables one-click sign-in at `/demo`. Always on outside production. |
| `AI_PHI_BAA_CONFIRMED` | Production | Must be `true` before production sends chart text to the model. Set it only once a BAA with zero data retention covers the key. |
| `RESEND_API_KEY` | Production | Transactional email. |
| `RESEND_FROM_EMAIL` | No | Sender address. |
| `FRONTEND_URL` | No | Base URL for links in email. |
| `REDIS_URL` | Production | Rails cache store. Defaults to `redis://localhost:6379/0` in development. |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | No | Error tracking. |
| `DATABASE_URL` | No | A `postgres://` URL switches the app to PostgreSQL. |

**Frontend (`base/.env.local`):**

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | API base URL, e.g. `http://localhost:3001`. |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | No | Error tracking. |

## Commands

```bash
make test                   # RSpec + Jest
make test-backend-postgres  # RSpec against PostgreSQL (docker compose up -d postgres)
make lint                   # RuboCop + ESLint (Brakeman runs in CI; see CLAUDE.md)
make db-reset               # drop, create, migrate, seed
```

## CI

One workflow, [.github/workflows/test.yml](.github/workflows/test.yml), runs on
pushes and pull requests to `main` and `develop`:

| Job | Runs |
|---|---|
| `Rails Tests` | RuboCop, Brakeman, RSpec on SQLite |
| `Rails Tests (PostgreSQL)` | RSpec and the seeds on PostgreSQL 16 |
| `Next.js Tests` | ESLint, production build, Jest |

## Data and compliance

Use synthetic data only until a practice has a signed business associate
agreement with you, and until the model provider's BAA covers your API key.
Chart text is stored as text only, redacted of direct identifiers before it is
sent to the model, and every read or write of patient data is recorded in
`phi_access_logs`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the
safety rules the code enforces.
