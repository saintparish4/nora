import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Ensure Testing Library matchers are available
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Shared test data, not tests.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/fixtures/'],
  // Mirror tsconfig path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
