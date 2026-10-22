import { execSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig } from 'cypress';

const apiDir = path.resolve(__dirname, '../api');

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1440,
    viewportHeight: 900,
    // The extraction job runs after the request is created; give it room.
    defaultCommandTimeout: 10_000,
    video: false,
    // No retries: a test that passes on its second try is a finding, not a pass.
    retries: 0,
    expose: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    },
    setupNodeEvents(on) {
      on('task', {
        /**
         * Clear the demo practice and play its four requests again, so a spec
         * that changes a request starts from the seeded state. Runs against
         * the e2e database (E2E=true), never development data.
         */
        resetDemo() {
          execSync('bundle exec rails demo:reset', {
            cwd: apiDir,
            env: { ...process.env, E2E: 'true', RAILS_ENV: 'development', SKIP_TEST_DATABASE: 'true' },
            stdio: 'pipe',
          });
          return null;
        },
      });
    },
  },
});
