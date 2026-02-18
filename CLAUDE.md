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
  /components/      - UI, navigation, dashboard, chat
  /lib/             - API client, auth context
  /types/           - TypeScript types and API contracts
/docs/              - Architecture and project documentation
.github/            - Workflows (test.yml: full-stack tests)
api/.github/       - API-specific CI (brakeman, rubocop, rails test)
```

## Technology Stack

- **Backend:** Ruby 3.4.x, Rails 8 (API mode), SQLite (dev) / PostgreSQL (prod), RSpec, RuboCop, Sidekiq, JWT, Resend, OpenAI
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, pnpm, Jest, ESLint
- **Build / run:** Make (optional), Bundler, pnpm
- **CI:** GitHub Actions — root `.github/workflows/test.yml` (Rails + Next.js); `api/.github/workflows/ci.yml` (Rails lint, Brakeman, tests)

## Local Development

See `README.md` for full setup. Quick start:

```bash
# One-time setup
make setup
# Create api/.env and base/.env.local with required variables (see README)

# Start both servers
make dev
```

- **Backend:** http://localhost:3001  
- **Frontend:** http://localhost:3000  

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

**Backend:** RSpec in `api/spec/` (requests, models, services, controllers).  
**Frontend:** Jest in `base/` (e.g. `__tests__/`). Use `pnpm test:watch` for watch mode, `pnpm test:coverage` for coverage.

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
make dev-stop      # Kill processes on 3000 and 3001
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
- **API:** All routes under `/api/v1/`; add controllers in `api/app/controllers/api/v1/`, services in `api/app/services/` by domain (e.g. `Triage::`, `Appointments::`).
- **Frontend:** Types in `base/types/`, API client in `base/lib/api/`; keep components under `base/components/` and pages under `base/app/`.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert  

**Scopes (examples):** api, base, auth, booking, providers, appointments, docs, deps  

**Examples:**

- `feat(booking): add quick-booking analyze step`
- `fix(api): correct slot generation for DST`
- `docs(readme): document OPENAI_API_KEY requirement`
- `chore(deps): bump Next.js to 16.1.6`

**Breaking changes:** Add `!` after type/scope or use `BREAKING CHANGE:` in the footer.

## Feature and Change Guidelines

- **New API feature:** Add controller under `api/app/controllers/api/v1/`, domain logic in `api/app/services/`, routes in `config/routes.rb`, and RSpec in `api/spec/`.
- **New frontend feature:** Add types in `base/types/`, API functions in `base/lib/api/`, components and pages under `base/app/`; add tests where appropriate.
- **PHI / security:** Use existing patterns (e.g. `PhiAccessLog`, `PhiAccessLoggable`); log access to sensitive data and avoid logging PHI in plain text.
- **Environment:** Required env vars are documented in `README.md` (e.g. `OPENAI_API_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_API_URL`). Use `api/.env` and `base/.env.local`; no `.env.example` committed — copy from README or team docs.

## Common Gotchas

- **Package manager:** Frontend uses **pnpm**, not npm. CI and local commands use `pnpm install`, `pnpm run dev`, `pnpm test`, etc.
- **Ruby version:** Backend expects Ruby 3.4.x (see `api/.ruby-version`). Root workflow uses 3.2; consider aligning CI with .ruby-version for consistency.
- **Database:** Development uses SQLite; production uses PostgreSQL. Behavior can differ (e.g. locking, SQL). Prefer PostgreSQL in dev for parity when possible.
- **Auth:** JWT in localStorage is a known tradeoff; no refresh flow or httpOnly cookies yet. See `docs/ARCHITECTURE.md` for future auth improvements.
- **Two CI setups:** `.github/workflows/test.yml` runs full-stack tests (Rails + Next.js) on push/PR to main/develop. `api/.github/workflows/ci.yml` runs Brakeman, Rubocop, and Rails tests (from api context). Ensure both pass when changing API or tooling.

## Key Documentation

- `README.md` — Overview, setup, env vars, tech stack, architecture link
- `docs/ARCHITECTURE.md` — Backend/frontend structure, services, routes, design decisions, technical debt
- `Makefile` — All make targets and one-line descriptions
- `api/README.md`, `base/README.md` — App-specific notes if present
