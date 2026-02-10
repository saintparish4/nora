# NORA - Medical AI Booking Platform

## Summary

NORA is an AI-powered healthcare booking platform that intelligently matches patients with the right providers and eliminates scheduling friction. The platform leverages advanced AI to analyze symptoms, recommend appropriate specialists, and streamline the entire appointment booking process—getting patients from symptoms to confirmed appointments in under 2 minutes.

## Features 

| Feature | Description |
|---------|-------------|
| **Quick Booking** | Go from symptoms to booked appointment in under 2 minutes with our streamlined booking flow |
| **AI-Powered Matching** | Intelligent symptom analysis that recommends the most appropriate medical specialists |
| **Smart Scheduling** | Real-time availability and instant appointment booking |
| **Secure Authentication** | JWT-based user authentication and authorization |
| **Automated Notifications** | Email reminders and confirmations for appointments |
| **Provider Management** | Comprehensive provider profiles with specialties and availability |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS |
| **Backend** | Ruby on Rails 8 API |
| **Database** | SQLite (development), PostgreSQL-ready (production) |
| **AI Integration** | OpenAI GPT for symptom analysis and provider matching |

## Getting Started

### Prerequisites

- Ruby 3.2+ (for backend)
- Node.js 18+ and npm/pnpm (for frontend)
- PostgreSQL (optional, for production)

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nora
   ```

2. **Backend Setup**:
   ```bash
   cd api
   bundle install
   rails db:create db:migrate db:seed
   ```

3. **Frontend Setup**:
   ```bash
   cd base
   npm install  # or pnpm install
   ```

4. **Environment Variables**:
   - Backend: Create `api/.env` with `OPENAI_API_KEY`, `RESEND_FROM_EMAIL`, etc.
   - Frontend: Create `base/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001`

5. **Run Development Servers**:
   ```bash
   # From project root
   make dev  # Runs both backend and frontend concurrently
   
   # Or separately:
   cd api && rails server        # Backend on http://localhost:3001
   cd base && npm run dev        # Frontend on http://localhost:3000
   ```

### Development Commands

See `Makefile` for common commands:
- `make dev` - Start both backend and frontend
- `make test` - Run all tests
- `make setup` - Initial project setup

## Architecture

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The project follows a monorepo structure:
- `api/` - Rails API backend (all routes under `/api/v1/`)
- `base/` - Next.js frontend with organized components and API clients

## Tech Tradeoffs

| Decision | Rationale | Future Plans |
|----------|-----------|--------------|
| **Web-First Approach** | Built as a web application to accelerate development and enable rapid iteration | Native Android and iOS apps planned for future releases |
| **API Versioning** | All routes under `/api/v1/` for consistency and future-proofing | Easy to add `/api/v2/` when needed |
| **Monorepo Structure** | Keeps frontend and backend in sync, simplifies deployment | Consider splitting if teams grow significantly |
