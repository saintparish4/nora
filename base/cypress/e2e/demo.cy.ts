describe('One-click demo', () => {
  before(() => cy.resetDemo());

  it('signs a visitor in as the medical assistant and opens the featured request', () => {
    cy.visit('/demo');
    cy.location('pathname', { timeout: 20_000 }).should('match', /^\/dashboard\/prior-authorizations\/\d+$/);
    cy.contains('h1', 'Jane Rivera · Wegovy');
    cy.contains('Needs clarification');
    cy.contains('nav', 'Today');
  });

  it('still opens Today for the clinician, who sees what is ready to submit', () => {
    cy.visit('/demo?as=clinician');
    cy.location('pathname', { timeout: 20_000 }).should('eq', '/dashboard');
    cy.contains('h1', 'Today');
    cy.get('[data-tour="attention"]').should('contain', 'Tom Okafor · Saxenda');
  });
});
