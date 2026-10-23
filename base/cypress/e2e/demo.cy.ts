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

  it('plays the walkthrough a step every few seconds, showing the time left, and holds when paused', () => {
    cy.visit('/demo?tour=1');
    const caption = () => cy.get('section[aria-label="Guided walkthrough"]');
    caption().should('contain', '1 of 9');
    caption().contains(/Next in \d+s/, { timeout: 15_000 });
    cy.screenshot('walkthrough-step-1', { capture: 'viewport' });
    caption().should('contain', '2 of 9', { timeout: 15_000 });

    caption().contains('button', 'Pause').click();
    caption().should('contain', 'Paused');
    cy.wait(7_000);
    caption().should('contain', '2 of 9');
    caption().find('[aria-label="End the walkthrough"]').click();
  });
});

