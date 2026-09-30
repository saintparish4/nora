# Frontend tests

Jest with jsdom. `global.fetch` is mocked in `jest.setup.ts`; each suite queues
the responses it expects.

| Suite | Covers |
|---|---|
| `lib/prior-auth.test.ts` | Approval and "mark met" blockers, packet availability, evidence ordering, highlight splitting, timeline labels |
| `lib/api/prior-authorizations.test.ts` | Request shapes for review, evidence, and extraction calls; API error messages surfaced; multipart upload without a JSON content type; the response contract |
| `lib/api/auth.test.ts` | Signup (with practice name), login, logout, session probe, profile update |
| `lib/api/client.test.ts` | Cookie credentials, CSRF token fetch and retry, global 401 handling |
| `lib/auth/context.test.tsx` | Auth provider state and redirects |
| `components/auth-protected.test.tsx` | Protected route redirect with return URL |

`fixtures/` holds shared test data shaped like real API responses. Jest ignores
it as a test path.

Run with `pnpm test` (add `--ci` in CI; do not use `pnpm test -- --ci`).
