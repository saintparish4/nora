/**
 * Staff reviewing what Nora proposed for a request it has just read: Marcus
 * Bell's Zepbound request, seeded with rule evidence nobody has verified.
 */
describe('Reviewing evidence on a request', () => {
  beforeEach(() => {
    cy.resetDemo();
    cy.signIn('staff');
    cy.visit('/dashboard/prior-authorizations');
    cy.contains('a', 'Marcus Bell').click();
    cy.contains('h1', 'Marcus Bell · Zepbound');
  });

  const requirement = (position: number) => cy.get('[data-tour="requirements"] li').eq(position - 1);
  const panel = () => cy.get('[data-tour="requirement"]');
  // Verified and rejected excerpts sort to the bottom, so find one by its text.
  const excerpt = (text: string) => panel().contains('[data-tour="evidence"]', text);

  it('shows an excerpt highlighted in its document', () => {
    excerpt('Vitals: Weight 196 lb').contains('button', 'View in document').click();

    cy.get('[role="dialog"]').within(() => {
      cy.contains('Annual visit');
      cy.get('mark').should('contain', 'Vitals: Weight 196 lb');
    });
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('will not mark a requirement met until an excerpt is verified', () => {
    requirement(1).click();
    panel().contains('button', 'Mark met').should('be.disabled');
    panel().contains('Verify at least one piece of evidence first.');

    excerpt('Vitals: Weight 196 lb').contains('button', /^Verify$/).click();
    excerpt('Vitals: Weight 196 lb').contains('Verified by Jordan Blake');

    panel().contains('button', 'Mark met').should('be.enabled').click();
    requirement(1).contains('Met');
    cy.get('[data-tour="timeline"]').contains('Requirement marked met');
  });

  it('strikes out a rejected excerpt and leaves it out of the count', () => {
    requirement(4).click();
    panel().contains('h3', 'Evidence (2)');

    excerpt('Continue lifestyle program.').contains('button', 'Reject').click();

    excerpt('Continue lifestyle program.').contains('Rejected');
    excerpt('Continue lifestyle program.').find('blockquote').should('have.class', 'line-through');
    panel().contains('h3', 'Evidence (1)');
  });

  it('accepts a quote only if the chart says it word for word', () => {
    requirement(6).click();
    panel().contains('button', 'Cite chart text yourself').click();
    // Options read "Medication list (Jul 30, 2026)"; pick by title alone.
    panel().find('select').last().find('option').contains('Medication list').then(($option) => {
      panel().find('select').last().select($option.val() as string);
    });

    panel().find('textarea').last().type('Not taking any GLP-1.');
    panel().contains('button', 'Add evidence').click();
    cy.get('[data-sonner-toast]').should('exist');
    panel().contains('Nothing found in the chart for this criterion.');

    panel().find('textarea').last().clear().type('Active: lisinopril 20 mg daily, metformin 1000 mg twice daily, atorvastatin 20 mg daily.');
    panel().contains('button', 'Add evidence').click();
    cy.contains('[data-sonner-toast]', 'Evidence added');
    panel().find('[data-tour="evidence"]').should('have.length', 1).and('contain', 'Added by staff');
  });

  it('asks the clinician to document a missing requirement', () => {
    requirement(6).click();
    panel().find('textarea').first().type('No statement either way about other GLP-1 use.');
    panel().contains('button', /^Missing$/).click();

    requirement(6).contains('Missing');
    cy.get('[data-tour="timeline"]').contains('Requirement marked missing');
    cy.get('[data-tour="tasks"]').find('li').should('have.length.at.least', 1);
  });
});
