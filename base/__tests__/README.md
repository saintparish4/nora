# Frontend Test Suite

Test suite for the Nora frontend application covering API clients, authentication, and protected routing.

## Test Suites

### `settings.test.tsx` — Utility Functions
Smoke tests for shared utilities (`cn` class-name merging).

### `lib/api/client.test.ts` — API Client (8 tests)
Tests the core `authFetch` helper and token management:
- **Token management**: `getToken`, `setToken`, `removeToken` lifecycle
- **authFetch headers**: Content-Type always set, Authorization included only when token exists
- **URL handling**: relative paths prepended with API_URL, absolute URLs passed through

### `lib/api/auth.test.ts` — Auth API Functions (11 tests)
Tests all authentication API functions against mocked fetch:
- **signup**: stores token on success, throws on 422
- **login**: stores token on success, throws on invalid credentials
- **logout**: removes token, skips API call when no token present
- **getCurrentUser**: returns user on valid token, clears token on 401, returns null with no token, handles network errors
- **updateEmailPreferences**: returns success message, throws on failure

### `lib/auth/context.test.tsx` — AuthContext (5 tests)
Tests the React auth context provider using a test consumer component:
- Starts in loading state, resolves to no user
- Loads existing user on mount via `getCurrentUser`
- `login` sets user state and redirects to `/dashboard`
- `signup` sets user state and redirects to `/dashboard`
- `logout` clears user and redirects to `/login`
- Throws when `useAuth` is called outside `AuthProvider`

### `components/auth-protected.test.tsx` — AuthProtected Guard (3 tests)
Tests the route protection wrapper:
- Shows loading state while auth is resolving
- Renders children when user is authenticated
- Redirects to `/login` when not authenticated

## Running Tests

```bash
# Run all tests
pnpm test

# Run a specific suite
pnpm test -- __tests__/lib/api/auth.test.ts

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## Testing Patterns

### Mock Response Helper
jsdom does not provide a `Response` constructor, so API tests use a lightweight mock:

```typescript
function mockResponse(body: object, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}
```

### Auth Mocking in Component Tests
Component tests mock `@/lib/api` or `@/lib/auth/context` at the module level and control return values per test via `jest.fn()`.

### Global Setup (`jest.setup.ts`)
- Mocks `global.fetch` for all tests
- Mocks `next/navigation` (useRouter, usePathname, etc.)
- Sets `IS_REACT_ACT_ENVIRONMENT = true` for React concurrent mode

## Dependencies

- `jest` / `@jest/globals` — Test framework
- `@testing-library/react` — Component rendering and queries
- `@testing-library/user-event` — User interaction simulation
- `@testing-library/jest-dom` — Custom DOM matchers
