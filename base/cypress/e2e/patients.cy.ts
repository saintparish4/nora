describe('Patients', () => {
  before(() => cy.resetDemo());
  beforeEach(() => cy.signIn('staff'));

  it('finds a patient by MRN and opens their chart', () => {
    cy.visit('/dashboard/patients');
    cy.get('input[placeholder="Search by name or MRN"]').type('DEMO-1002');
    cy.contains('a', 'Bell, Marcus').should('be.visible');
    cy.contains('a', 'Rivera, Jane').should('not.exist');

    cy.contains('a', 'Bell, Marcus').click();
    cy.contains('h1', 'Marcus Bell');
    cy.contains('MRN DEMO-1002');
    cy.contains('Aetna');
    cy.contains('Zepbound');
  });

  it('shows a chart document in full', () => {
    cy.visit('/dashboard/patients');
    cy.contains('a', 'Bell, Marcus').click();
    cy.contains('Annual visit').parents('li').first().contains('button', 'View').click();

    cy.get('[role="dialog"]').within(() => {
      cy.contains('Annual visit');
      cy.contains('He has worked with a nutrition coach');
    });
  });
});
