# Nora — Frontend

Patient-facing web app for the Nora AI healthcare platform.

**Live Demo:** https://mai-omega.vercel.app/

## Overview

Modern web application for AI-assisted medical appointments with healthcare providers.

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- SWR for data fetching
- Zod for runtime API validation
- Sentry for error tracking

## Key Features

- Patient authentication and profiles
- Provider discovery and filtering
- Calendar-based appointment booking
- Appointment management (view, cancel)
- AI-powered symptom analysis
- Responsive design

## User Flow

1. Sign up / Log in
2. Browse available providers
3. View provider details and availability
4. Book appointment in available time slot
5. Manage appointments (view upcoming/past, cancel)

## Setup

```bash
pnpm install
pnpm run dev
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SENTRY_DSN=          # optional, for error tracking
```

## Portfolio Project

This is a demonstration project. All healthcare provider data is fictional for demo purposes.
