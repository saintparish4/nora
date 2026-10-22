/** Priya Nair is the one seeded patient without a request. */
describe('Starting a prior authorization', () => {
  beforeEach(() => {
    cy.resetDemo();
    cy.signIn('staff');
  });

  it('creates the request and reads the chart against its criteria', () => {
    cy.visit('/dashboard');
    cy.contains('a', 'New prior authorization').click();
    cy.contains('h1', 'New prior authorization');

    cy.get('#patient-search').type('Priya');
    cy.contains('button', 'Priya Nair').click();

    cy.contains('Find evidence in the chart right away');
    cy.get('#item').select('Wegovy');
    cy.contains("Cigna's published criteria.").contains('a', 'Read the policy').should('have.attr', 'href').and('include', 'cigna.com');
    cy.contains('Create prior authorization').click();

    cy.location('pathname').should('match', /^\/dashboard\/prior-authorizations\/\d+$/);
    cy.contains('h1', 'Priya Nair · Wegovy');
    cy.contains('a', 'Read the policy, effective').should('have.attr', 'target', '_blank');
    cy.contains('[role="status"]', 'Evidence found', { timeout: 30_000 });
    cy.get('[data-tour="requirements"] li').should('have.length.at.least', 1);
    cy.get('[data-tour="timeline"]').contains('Extraction finished');
  });
});
