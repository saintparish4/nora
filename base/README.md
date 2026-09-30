# Nora console

Next.js app for practice staff: the Today console, patients and chart
documents, and the prior authorization workspace.

## Setup

```bash
pnpm install
cp .env.local.example .env.local
pnpm run dev
```

`NEXT_PUBLIC_API_URL` must point at the Rails API (default
`http://localhost:3001`).

## Checks

```bash
pnpm run lint
pnpm test          # add --ci in CI; never pnpm test -- --ci
pnpm run build
```

See `../docs/ARCHITECTURE.md` for routes and the API client layout.
