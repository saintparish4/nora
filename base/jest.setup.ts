// Jest DOM matchers are automatically available in modern Jest setups
// No need to import @testing-library/jest-dom as it's deprecated

// Enable React concurrent act() environment for testing
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Add fetch polyfill for test environment
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'Success' }),
  } as Response)
)

// Mock Next.js navigation module globally
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

