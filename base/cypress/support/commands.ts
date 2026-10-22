/** The seeded demo practice (api/db/seeds/synthetic_charts.rb). */
export const ACCOUNTS = {
  admin: { email: 'demo@nora.com', name: 'Demo Admin' },
  clinician: { email: 'clinician@nora.com', name: 'Avery Chen' },
  staff: { email: 'ma@nora.com', name: 'Jordan Blake' },
} as const;

export const PASSWORD = 'password123';

export type Role = keyof typeof ACCOUNTS;

declare global {
  namespace Cypress {
    interface Chainable {
      /** Sign in through the API and keep the session cookie for the spec. */
      signIn(role: Role): Chainable<void>;
      /** Clear the demo practice and seed its four requests again. */
      resetDemo(): Chainable<null>;
    }
  }
}

const api = (path: string) => `${Cypress.expose('apiUrl')}${path}`;

Cypress.Commands.add('signIn', (role: Role) => {
  cy.session(
    role,
    () => {
      cy.request({ url: api('/api/v1/auth/csrf') }).then(({ body }) => {
        cy.request({
          method: 'POST',
          url: api('/api/v1/auth/login'),
          headers: { 'X-CSRF-Token': body.csrf_token },
          body: { email: ACCOUNTS[role].email, password: PASSWORD },
        });
      });
    },
    {
      validate() {
        cy.request({ url: api('/api/v1/auth/me') }).its('status').should('eq', 200);
      },
    }
  );
});

Cypress.Commands.add('resetDemo', () => cy.task('resetDemo', null, { timeout: 120_000 }));
