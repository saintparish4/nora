/*
@description: What Nora reads from a patient's chart to answer a plan's prior
  authorization questions, over US Core data (Patient, Coverage,
  MedicationRequest, Condition, the BMI Observation), plus the evidence a
  person verified, which Nora writes as Observations coded by criterion.
  Every answer is an expression here or in a question set's library. An
  expression that returns null means Nora cannot source the answer, and the
  question goes to the prescriber's office.
*/
library NoraCommon version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

codesystem "LOINC": 'http://loinc.org'

code "BMI": '39156-5' from "LOINC" display 'Body mass index (BMI) [Ratio]'

// The day the request was opened. Ages and "within 4 months" count from it.
parameter AsOf Date

context Patient

// --- Patient ---------------------------------------------------------------

define "Age":
  AgeInYearsAt(AsOf)

define "Age Group":
  if "Age" is null then null
  else if "Age" >= 18 then '18-plus'
  else if "Age" >= 12 then '12-17'
  else null

define function "Age At Least"(minAge Integer):
  if "Age" is null then null
  else if "Age" >= minAge then 'yes'
  else 'no'

// --- Coverage --------------------------------------------------------------

define "Active Coverage":
  First([Coverage] C where C.status.value = 'active')

define "Plan Class":
  First(("Active Coverage".class) K where exists ((K.type.coding) T where T.code.value = 'plan'))

// The plan's name and code together: either may name the FEP option.
define "Plan Words":
  Lower(Combine({ "Plan Class".name.value, "Plan Class".value.value }, ' '))

define "FEP Option":
  if "Plan Words" is null then null
  else if PositionOf('focus', "Plan Words") >= 0 then 'focus'
  else if PositionOf('standard', "Plan Words") >= 0 or PositionOf('basic', "Plan Words") >= 0 then 'standard-basic'
  else null

// --- Prescriptions ---------------------------------------------------------

define function "Order Text"(rx FHIR.MedicationRequest):
  (rx.medication as FHIR.CodeableConcept).text.value

define function "Prescribes"(rx FHIR.MedicationRequest, codes List<System.String>, name System.String):
  exists (((rx.medication as FHIR.CodeableConcept).coding) C where C.code.value in codes)
    or PositionOf(Lower(name), Lower("Order Text"(rx))) >= 0

define function "Orders For"(codes List<System.String>, name System.String):
  [MedicationRequest] M where "Prescribes"(M, codes, name)

define function "Active Order"(codes List<System.String>, name System.String):
  First(("Orders For"(codes, name)) M where M.status.value = 'active')

define function "Dosage Form"(rx FHIR.MedicationRequest):
  if "Order Text"(rx) is null then null
  else if PositionOf('tablet', Lower("Order Text"(rx))) >= 0 then 'tablet'
  else if PositionOf('inject', Lower("Order Text"(rx))) >= 0 or PositionOf(' pen', Lower("Order Text"(rx))) >= 0 then 'injection'
  else null

// Brand when the order carries one of the brand's RxNorm products or its
// name; generic when it names only the ingredient.
define function "Brand Or Generic"(rx FHIR.MedicationRequest, codes List<System.String>, name System.String, ingredient System.String):
  if rx is null then null
  else if exists (((rx.medication as FHIR.CodeableConcept).coding) C where C.code.value in codes)
    or PositionOf(Lower(name), Lower("Order Text"(rx))) >= 0 then 'brand'
  else if PositionOf(Lower(ingredient), Lower("Order Text"(rx))) >= 0 then 'generic'
  else null

define function "Scaled Quantity"(rx FHIR.MedicationRequest, perDays Integer):
  rx.dispenseRequest.quantity.value.value * perDays / rx.dispenseRequest.expectedSupplyDuration.value.value

define function "Over Limit"(rx FHIR.MedicationRequest, limit Integer, perDays Integer):
  if "Scaled Quantity"(rx, perDays) is null then null
  else if "Scaled Quantity"(rx, perDays) > limit then 'yes'
  else 'no'

define function "Pens For"(rx FHIR.MedicationRequest, perDays Integer):
  Ceiling("Scaled Quantity"(rx, perDays))

define function "First Written"(codes List<System.String>, name System.String):
  Min(("Orders For"(codes, name)) M return M.authoredOn.value)

define function "First Order"(codes List<System.String>, name System.String):
  First(("Orders For"(codes, name)) M where M.authoredOn.value = "First Written"(codes, name))

// Initiation when every order for the drug in the chart is under four months
// old. An older one might be a renewal: whether it was taken continuously is
// not in structured data, so that is null.
define function "Continuation"(codes List<System.String>, name System.String):
  if "First Written"(codes, name) is null then null
  else if date from "First Written"(codes, name) > AsOf - 4 months then 'initiation'
  else null

// The practice's own orders are the record of what it prescribed.
define function "Prior Prescription"(codes List<System.String>, name System.String):
  if exists "Orders For"(codes, name) then 'yes' else 'no'

// --- Problem list ----------------------------------------------------------

define "Problem List":
  [Condition] C where exists ((C.category.coding) X where X.code.value = 'problem-list-item')

define function "ICD10"(condition FHIR.Condition):
  First((condition.code.coding) X where X.system.value = 'http://hl7.org/fhir/sid/icd-10-cm').code.value

define function "Has Prefix"(code System.String, prefixes List<System.String>):
  exists (prefixes P where StartsWith(code, P))

define "Weight Diagnosis":
  First("Problem List" C where StartsWith("ICD10"(C), 'E66'))

define "Diagnosis Choice":
  if "Weight Diagnosis" is null then null
  else if StartsWith("ICD10"("Weight Diagnosis"), 'E66.3') then 'elevated-bmi'
  else 'obesity'

// ICD-10-CM prefixes for the FEP form's comorbidity and cardiovascular list.
define "Comorbidity Prefixes":
  {
    Tuple { choice: 'type-2-diabetes-mellitus', prefixes: { 'E11' } },
    Tuple { choice: 'dyslipidemia', prefixes: { 'E78' } },
    Tuple { choice: 'hypertension', prefixes: { 'I10', 'I11', 'I12', 'I13', 'I15', 'I16' } },
    Tuple { choice: 'congenital-heart-disease', prefixes: { 'Q20', 'Q21', 'Q22', 'Q23', 'Q24', 'Q25', 'Q26' } },
    Tuple { choice: 'cerebrovascular-disease', prefixes: { 'I6' } },
    Tuple { choice: 'peripheral-artery-disease-pad', prefixes: { 'I70.2', 'I73.9' } },
    Tuple { choice: 'coronary-heart-disease', prefixes: { 'I25' } },
    Tuple { choice: 'acute-coronary-syndrome-acs', prefixes: { 'I24' } },
    Tuple { choice: 'myocardial-infarction-mi', prefixes: { 'I21', 'I22', 'I25.2' } },
    Tuple { choice: 'unstable-angina', prefixes: { 'I20.0' } },
    Tuple { choice: 'coronary-or-other-arterial-revascularization', prefixes: { 'Z95.5', 'Z95.82', 'Z98.61' } },
    Tuple { choice: 'prior-percutaneous-coronary-intervention-coronary-bypass-surgery', prefixes: { 'Z95.1', 'Z95.5', 'Z98.61' } }
  }

define "Comorbidity Choices":
  "Comorbidity Prefixes" T
    where exists ("Problem List" C where "Has Prefix"("ICD10"(C), T.prefixes))
    return T.choice

define "Comorbidity Conditions":
  "Problem List" C
    where exists ("Comorbidity Prefixes" T where "Has Prefix"("ICD10"(C), T.prefixes))

// --- Vitals ----------------------------------------------------------------

define "BMI Observations":
  [Observation: "BMI"] O where O.status.value in { 'final', 'amended', 'corrected' }

define "Latest BMI Date":
  Max("BMI Observations" O return (O.effective as FHIR.dateTime).value)

define "Latest BMI":
  First("BMI Observations" O where (O.effective as FHIR.dateTime).value = "Latest BMI Date")

define "Latest BMI Value":
  ("Latest BMI".value as FHIR.Quantity).value.value

define function "BMI Range"(bmi System.Decimal):
  if bmi is null then null
  else if bmi < 27 then 'under-27'
  else if bmi < 30 then '27-29.9'
  else '30-plus'

// --- Evidence a person verified ---------------------------------------------

// Nora writes each verified quote as an Observation coded with the criterion
// it supports, its text in valueString. Not a US Core profile: this is Nora's
// own record that a person checked the quote against the chart.
define function "Evidence For"(position Integer):
  [Observation] O
    where O.status.value = 'final'
      and exists ((O.code.coding) X
        where X.system.value = 'https://nora.example/fhir/CodeSystem/requirement'
          and X.code.value = 'criterion-' + ToString(position))

define function "Met"(position Integer, answer System.String):
  if exists "Evidence For"(position) then answer else null

// The BMI a verified quote states, e.g. "BMI 30.46 kg/m2 on 06/05/2024".
define function "Quoted BMI"(position Integer):
  First(("Evidence For"(position)) O
    let quote: (O.value as FHIR.string).value,
      number: ToDecimal(ReplaceMatches(quote, '^[\\s\\S]*?[Bb][Mm][Ii][^0-9]{0,20}([0-9]{2}(\\.[0-9]+)?)[\\s\\S]*$', '$1'))
    where number is not null
    return number)
