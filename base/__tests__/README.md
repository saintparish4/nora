# Settings Page Tests

This document describes the test suite for the Settings page component (`app/(protected)/dashboard/settings/page.tsx`).

## Test Overview

The test suite covers the core functionality of the Settings page, including:

1. **Component Rendering** - Verifies the page renders correctly
2. **User Preferences Display** - Ensures current user preferences are shown
3. **Successful Save** - Tests the happy path when saving preferences
4. **Error Handling** - Tests error scenarios when API calls fail

## Test Structure

### Mock Setup

The tests use Jest mocks to isolate the component from external dependencies:

```typescript
// Mock API functions
const mockUpdateEmailPreferences = jest.fn()
const mockGetCurrentUser = jest.fn()

jest.mock('@/lib/api', () => ({
  updateEmailPreferences: mockUpdateEmailPreferences,
  getCurrentUser: mockGetCurrentUser,
}))
```

### Test Cases

#### 1. `renders settings page`
- **Purpose**: Basic smoke test to ensure the component renders without crashing
- **What it tests**: Component mounts successfully and displays the main heading
- **Mock setup**: Uses default user data from `beforeEach`

#### 2. `displays current preferences`
- **Purpose**: Verifies that user preferences are correctly displayed
- **What it tests**: Checkboxes show the correct state based on user data
- **Mock setup**: Uses default user data with all preferences enabled

#### 3. `updates preferences on save`
- **Purpose**: Tests the successful save flow
- **What it tests**: 
  - User can click save button
  - API is called with correct parameters
  - Success message is displayed
- **Mock setup**: Uses default successful API response

#### 4. `shows error message on API failure`
- **Purpose**: Tests error handling when API calls fail
- **What it tests**:
  - Error is properly caught and displayed
  - User sees appropriate error message
- **Mock setup**: Overrides global fetch mock to return error response

## Key Testing Patterns

### Mock Management
- **beforeEach**: Sets up default mocks for all tests
- **Individual tests**: Override specific mocks when needed
- **Global fetch mock**: Used for error testing since API functions use fetch internally

### Async Testing
- Uses `act()` to wrap async operations
- Uses `waitFor()` to wait for DOM updates
- Properly handles component lifecycle events

### Error Testing Strategy
The error test was challenging because:
1. The API function uses `fetch` internally
2. Global fetch mock was always returning success
3. Solution: Override global fetch mock for error scenarios

```typescript
// Mock fetch to return an error response
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: 'API Error' })
  })
) as jest.MockedFunction<typeof fetch>
```

## Coverage

Current test coverage for the Settings page:
- **Statements**: 76.92%
- **Branches**: 46.66%
- **Functions**: 50%
- **Lines**: 76.92%

## Running Tests

```bash
# Run all settings tests
npm test -- __tests__/settings.test.tsx

# Run with coverage
npm test -- __tests__/settings.test.tsx --coverage
```

## Dependencies

- `@testing-library/react` - Component rendering and interaction
- `@testing-library/jest-dom` - Custom matchers (auto-imported)
- `jest` - Test framework and mocking
- `@jest/globals` - Jest globals for TypeScript

## Notes

- Tests use `AuthProvider` wrapper to provide authentication context
- Mock functions are properly typed with `as never` to avoid TypeScript issues
- Error testing required understanding of the fetch mock hierarchy
- All tests are isolated and don't depend on external services
