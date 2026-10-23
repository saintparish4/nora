/**
 * The request form: what staff type into CoverMyMeds, filled from the chart
 * over FHIR, with the plan's questions answered from sourced chart data or
 * handed to the prescriber's office. Nothing on it changes the request.
 */
describe('Request form for CoverMyMeds', () => {
  before(() => cy.resetDemo());
  beforeEach(() => cy.signIn('staff'));

  const openForm = (patient: string, title: string) => {
    cy.visit('/dashboard/prior-authorizations');
    cy.contains('a', patient).click();
    cy.contains('h1', title);
    cy.contains('a', 'Request form').click();
    cy.contains('h1', `Request form · ${patient}`);
  };
  const field = (key: string) => cy.get(`[data-field="${key}"]`);
  const question = (linkId: string) => cy.get(`[data-question="${linkId}"]`);

  it("fills every field and answers the FEP form's questions from the chart (Tom Okafor, Saxenda)", () => {
    openForm('Tom Okafor', 'Tom Okafor · Saxenda');

    field('rx_bin').should('contain', '999104').and('contain', 'Coverages');
    field('npi').should('contain', '1987654328');
    field('primary').should('contain', 'E66.812');

    cy.get('[data-tour="form-questions"]').should('contain', "The plan's own form, word for word");
    question('pens-90-days').should('have.attr', 'data-status', 'answered').and('contain', '15').and('contain', 'The prescription order');
    question('program').should('have.attr', 'data-status', 'answered').and('contain', 'verified by');
    question('initiation-bmi').should('contain', 'Vitals').and('contain', 'BMI 36.5');
    question('initiation-comorbidity').should('not.exist');
    cy.get('[data-tour="form-ask"]').should('contain', 'Nothing to ask');
    cy.get('[data-tour="form-notes"] li').should('have.length.at.least', 1);
  });

  it("says where to get what the chart lacks, and collects the questions for the prescriber's office (Jane Rivera, Wegovy)", () => {
    openForm('Jane Rivera', 'Jane Rivera · Wegovy');

    field('rx_bin').should('contain', 'Not in the chart').and('contain', 'call the pharmacy');
    cy.get('[data-tour="form-questions"]').should('contain', "Derived from the plan's criteria");
    question('bmi').should('have.attr', 'data-status', 'ask_prescriber').and('contain', 'In plain words');
    cy.get('[data-tour="form-ask"] pre').should('contain', 'Prior authorization for Jane Rivera, Wegovy, Cigna');

    cy.window().then((win) => cy.stub(win.navigator.clipboard, 'writeText').as('copy').resolves());
    field('member_id').find('button').click();
    cy.get('@copy').should('have.been.calledWith', 'U90114572');
  });

  describe('answers from people', () => {
    beforeEach(() => cy.resetDemo());

    it("records the prescriber's office's answer, which then decides what else applies (Jane Rivera)", () => {
      openForm('Jane Rivera', 'Jane Rivera · Wegovy');
      question('comorbidity').should('contain', 'Only if the plan asks it');

      question('bmi').within(() => {
        cy.contains('button', "Record the office's answer").click();
        cy.contains('label', 'Between 27 kg/m2 and 29.9 kg/m2').click();
        cy.get('input[aria-label="Note"]').type('Office replied by fax: 29.1 before Saxenda');
        cy.contains('button', 'Save answer').click();
      });

      question('bmi').should('have.attr', 'data-status', 'answered').and('contain', 'Entered by staff').and('contain', 'Entered by Jordan Blake')
        .and('contain', 'Office replied by fax');
      question('comorbidity').should('not.contain', 'Only if the plan asks it');
    });

    it("corrects Nora's answer, and can go back to it (Tom Okafor)", () => {
      openForm('Tom Okafor', 'Tom Okafor · Saxenda');
      question('pens-90-days').within(() => {
        cy.contains('button', 'Change answer').click();
        cy.get('input[aria-label="Answer"]').clear().type('18');
        cy.contains('button', 'Save answer').click();
      });
      question('pens-90-days').should('contain', 'Changed by staff').and('contain', 'Nora had “15”');

      question('pens-90-days').within(() => {
        cy.contains('button', 'Change answer').click();
        cy.contains('button', "Go back to Nora's answer").click();
      });
      question('pens-90-days').should('contain', 'From the chart').and('not.contain', 'Changed by staff');
    });
  });
});

