import { ACCOUNTS, PASSWORD } from '../support/commands';

describe('Signing in', () => {
  it('sends a signed-out visitor to sign in, then back to the page they asked for', () => {
    cy.visit('/dashboard/tasks');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('contain', 'returnUrl=%2Fdashboard%2Ftasks');

    cy.get('#email').type(ACCOUNTS.staff.email);
    cy.get('#password').type(PASSWORD, { log: false });
    cy.contains('button', 'Sign in').click();

    cy.location('pathname').should('eq', '/dashboard/tasks');
    cy.contains('h1', 'Tasks');
  });

  it('shows why a sign-in failed and stays on the form', () => {
    cy.visit('/login');
    // An unknown address, so no seeded account moves toward its lockout.
    cy.get('#email').type('nobody@nora.com');
    cy.get('#password').type('not-the-password');
    cy.contains('button', 'Sign in').click();

    cy.contains('Invalid email or password');
    cy.location('pathname').should('eq', '/login');
  });

  it('logs out and keeps the console closed afterwards', () => {
    cy.signIn('staff');
    cy.visit('/dashboard');
    cy.contains('h1', 'Today');

    cy.contains('button', 'Log out').click();
    cy.location('pathname').should('eq', '/login');

    cy.visit('/dashboard/prior-authorizations');
    cy.location('pathname').should('eq', '/login');
  });
});
