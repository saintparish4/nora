describe('Today', () => {
  before(() => cy.resetDemo());
  beforeEach(() => cy.signIn('staff'));

  it('counts the seeded requests by stage', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Today');
    cy.contains('Demo Family Medicine');

    const expected: Record<string, string> = {
      'Gathering evidence': '1',
      'Need clarification': '1',
      'Ready for approval': '1',
      'Ready to submit': '0',
      'With payer': '0',
    };
    for (const [label, count] of Object.entries(expected)) {
      cy.contains('[data-tour="counts"] a', label).find('p').first().should('have.text', count);
    }
  });

  it('opens the list filtered to a stage from its tile', () => {
    cy.visit('/dashboard');
    cy.contains('[data-tour="counts"] a', 'Need clarification').click();

    cy.location('search').should('eq', '?status=needs_clarification');
    cy.contains('h1', 'Prior authorizations');
    cy.contains('Jane Rivera');
    cy.contains('Marcus Bell').should('not.exist');
  });

  it('moves between every screen from the navigation', () => {
    cy.visit('/dashboard');
    const screens: Array<[string, string, string]> = [
      ['Prior auths', '/dashboard/prior-authorizations', 'Prior authorizations'],
      ['Patients', '/dashboard/patients', 'Patients'],
      ['Tasks', '/dashboard/tasks', 'Tasks'],
      ['Settings', '/dashboard/settings', 'Settings'],
      ['Today', '/dashboard', 'Today'],
    ];
    for (const [link, path, heading] of screens) {
      cy.get('nav[aria-label="Dashboard navigation"]').contains('a', link).click();
      cy.location('pathname').should('eq', path);
      cy.contains('h1', heading);
    }
  });
});
