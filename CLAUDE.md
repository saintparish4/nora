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
.github/            - Workflows (test.yml: full-stack tests) + dependabot.yml
```

## Technology Stack

- **Backend:** Ruby 3.4.x, Rails 8 (API mode), SQLite (dev) / PostgreSQL (prod), RSpec, RuboCop, Sidekiq, JWT, Resend, OpenAI
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, pnpm, Jest, ESLint
- **Build / run:** Make (optional), Bundler, pnpm
- **CI:** GitHub Actions — a single workflow, `.github/workflows/test.yml`, with a `Rails Tests` job (RuboCop, Brakeman, RSpec) and a `Next.js Tests` job (ESLint, build, Jest)

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
- **Environment:** Copy `api/.env.example` → `api/.env` and `base/.env.local.example` → `base/.env.local`. Both templates are committed (the `.gitignore` files negate them explicitly); keep them in step with the README tables when adding a variable.

## Common Gotchas

- **Package manager:** Frontend uses **pnpm**, not npm. CI and local commands use `pnpm install`, `pnpm run dev`, `pnpm test`, etc.
- **Ruby version:** Pinned to 3.4.8 in `api/.ruby-version`, `api/Gemfile`, and `api/Dockerfile` — change all three together. CI reads `.ruby-version` via `bundler-cache`.
- **Node version:** Frontend needs Node >= 22.13; pnpm 12 hard-errors on anything older. `base/pnpm-workspace.yaml` lists the packages allowed to run install scripts — a new native dependency will fail `pnpm install` until it is added there.
- **`pnpm run <script> -- --flag`:** pnpm 10+ forwards the `--` to the script, so `pnpm test -- --ci` reaches Jest as a path pattern and matches zero tests. Pass flags directly: `pnpm test --ci`.
- **Database:** `config/database.yml` picks its adapter from `DATABASE_URL` — unset means SQLite
  (zero-setup local dev), a `postgres://` URL means PostgreSQL. CI runs the suite both ways; the
  `Rails Tests (PostgreSQL)` job is the one that speaks to locking, transaction semantics, and
  concurrent booking. Locally: `docker compose up -d postgres && make test-backend-postgres`.
- **Production database is unresolved.** `README.md` and `docs/ARCHITECTURE.md` say production is
  PostgreSQL; `config/database.yml` defines production as a four-database SQLite
  solid_cache/solid_queue/solid_cable layout. One of them is wrong. Check the running deploy before
  trusting either, and do not "fix" the config to match the docs without looking.
- **Auth:** JWT in localStorage is a known tradeoff; no refresh flow or httpOnly cookies yet. See `docs/ARCHITECTURE.md` for future auth improvements.
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
