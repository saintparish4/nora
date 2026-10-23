/**
 * Tom Okafor's Saxenda request is seeded with every requirement verified, so
 * it is waiting on a clinician's approval.
 */
describe('Approving and submitting a packet', () => {
  beforeEach(() => cy.resetDemo());

  const openRequest = () => {
    cy.visit('/dashboard/prior-authorizations');
    cy.contains('a', 'Tom Okafor').click();
    cy.contains('h1', 'Tom Okafor · Saxenda');
  };

  it('keeps approval with a clinician', () => {
    cy.signIn('staff');
    openRequest();
    cy.get('[data-tour="approval"]').within(() => {
      cy.contains('button', 'Approve packet').should('be.disabled');
      cy.contains('Only a clinician or an admin can approve.');
    });
  });

  it('lets the clinician approve, then staff submit it to the payer', () => {
    cy.signIn('clinician');
    openRequest();
    cy.get('[data-tour="approval"]').contains('button', 'Approve packet').click();
    cy.get('[data-tour="approval"]').contains('Approved by Avery Chen');

    cy.intercept('GET', '**/prior_authorizations/*/packet*').as('packet');
    cy.get('[data-tour="approval"]').contains('button', 'Download packet (PDF)').click();
    cy.wait('@packet').its('response.headers.content-type').should('contain', 'application/pdf');

    cy.signIn('staff');
    openRequest();
    cy.contains('button', 'Mark submitted').click();
    cy.get('#payer_reference').type('E2E-PA-1001');
    cy.get('#prep_minutes').type('12');
    cy.contains('button', 'Confirm: Mark submitted').click();

    cy.contains('[data-sonner-toast]', 'Status updated');
    cy.get('h1').parent().contains('Submitted');
    cy.get('[data-tour="timeline"]').contains('Status: Submitted');
  });
});
