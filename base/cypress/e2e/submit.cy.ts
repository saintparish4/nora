/**
 * Staff own the request from start to finish: Tom Okafor's Saxenda request is
 * seeded with every requirement verified, waiting only for the staff
 * member's final check. Jane Rivera's has open gaps, one already asked of the
 * prescriber's office.
 */
describe('Final check and submission by staff', () => {
  beforeEach(() => {
    cy.resetDemo();
    cy.signIn('staff');
  });

  const openRequest = (patient: string, title: string) => {
    cy.visit('/dashboard/prior-authorizations');
    cy.contains('a', patient).click();
    cy.contains('h1', title);
  };
  const panel = () => cy.get('[data-tour="submit"]');

  it('waits for the staff member to confirm the final check, and says whose name it goes under', () => {
    openRequest('Tom Okafor', 'Tom Okafor · Saxenda');
    panel().within(() => {
      cy.contains("This goes to the plan under Avery Chen's name.");
      cy.contains('button', 'Submit to the plan').should('be.disabled');
      cy.get('input[type="checkbox"]').check();
      cy.contains('button', 'Submit to the plan').should('be.enabled');
    });
  });

  it('submits under the prescriber’s name, records who checked it, and has a packet', () => {
    openRequest('Tom Okafor', 'Tom Okafor · Saxenda');
    panel().within(() => {
      cy.get('input[type="checkbox"]').check();
      cy.get('#payer_reference').type('E2E-PA-1001');
      cy.get('#prep_minutes').type('12');
      cy.contains('button', 'Submit to the plan').click();
    });

    cy.contains('[data-sonner-toast]', 'Submitted');
    panel().contains('Checked and submitted by Jordan Blake on behalf of Avery Chen');
    cy.get('h1').parent().contains('Submitted');
    cy.get('[data-tour="timeline"]').contains('Final check done');

    cy.intercept('GET', '**/prior_authorizations/*/packet*').as('packet');
    panel().contains('button', 'Download packet (PDF)').click();
    cy.wait('@packet').its('response.headers.content-type').should('contain', 'application/pdf');
  });

  it("keeps a gap with staff, and lets them ask the prescriber's office without anything waiting on it", () => {
    openRequest('Jane Rivera', 'Jane Rivera · Wegovy');
    panel().contains('requirements still need to be met or marked not applicable');

    cy.get('[data-tour="tasks"]').within(() => {
      cy.contains("Asked the prescriber's office").should('have.length', 1);
      cy.contains('li', 'Not used together with another GLP-1').contains('button', "Ask the prescriber's office").click();
    });
    cy.contains('[data-sonner-toast]', "asked the prescriber's office");
    cy.get('[data-tour="tasks"]').contains('li', 'Not used together with another GLP-1').contains("Asked the prescriber's office");
    cy.get('[data-tour="tasks"]').contains('li', 'Not used together with another GLP-1').contains('button', 'Done');
  });
});
