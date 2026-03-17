# Nora — API

Rails API backend for the Nora AI healthcare booking platform.

## Tech Stack

- Ruby 3.4.x
- Rails 8.0 (API mode)
- SQLite (development) / PostgreSQL (production)
- JWT authentication
- Sidekiq for background jobs
- Sentry for error tracking
- Lograge for structured JSON request logging

## Setup

```bash
bundle install
rails db:create db:migrate db:seed
rails server
```

Copy `.env.example` to `.env` and fill in the required values before running.

## Environment Variables

See `.env.example` for the full list. Required variables:

```
SECRET_KEY_BASE=   # openssl rand -hex 64
OPENAI_API_KEY=    # for AI symptom analysis (gpt-4o-mini)
```

Optional in development, required in production:

```
RESEND_API_KEY=    # transactional email
SENTRY_DSN=        # error tracking
REDIS_URL=         # background jobs / caching
```

## API Endpoints

All routes are versioned under `/api/v1/`.

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/signup` | User registration |
| `POST /api/v1/auth/login` | User authentication |
| `POST /api/v1/auth/logout` | Invalidate session |
| `GET /api/v1/auth/me` | Current user profile |
| `GET /api/v1/providers` | List all providers |
| `GET /api/v1/providers/:id` | Provider detail |
| `GET /api/v1/providers/:id/available_slots` | Available appointment slots |
| `POST /api/v1/appointments` | Book appointment |
| `GET /api/v1/appointments` | List user's appointments |
| `DELETE /api/v1/appointments/:id` | Cancel appointment |
| `POST /api/v1/quick-booking/analyze` | AI symptom analysis + provider match |
| `POST /api/v1/quick-booking/book` | Book from quick-booking flow |

## Architecture Highlights

- `Triage::SymptomAnalyzerService` — OpenAI-powered symptom analysis
- `Providers::ProviderMatchingService` — Matches symptoms to providers
- `Appointments::SlotGeneratorService` — Generates slots from provider availability
- `PhiAccessLoggable` concern — Logs access to PHI per HIPAA best practices
- `ApplicationController#rescue_from` — Centralised error responses (404, 400, 500)

## Email Notifications

Uses Resend for transactional email via `AppointmentMailer`:

- Booking confirmations
- Cancellation notices
- 24-hour appointment reminders

## Portfolio Project

This is a demonstration project. All healthcare provider data is fictional for demo purposes.
