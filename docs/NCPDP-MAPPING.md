# The plans' questions as NCPDP ePA question sets, and what survives the trip to FHIR

Pharmacy-benefit prior authorization for drugs like Wegovy, Zepbound and Saxenda travels as NCPDP SCRIPT electronic prior authorization (ePA). That is how CoverMyMeds and the PBMs exchange it.

The plan's questions arrive in a **QuestionSet** inside the **PAInitiationResponse**. The prescriber's side sends the answers back in a **PARequest**.

Da Vinci's FHIR guides (CRD, DTR, PAS) cover medical-benefit items and leave pharmacy-benefit drugs to NCPDP, and no published mapping between the two exists (checked 2026-10-23). This document is Nora's own mapping. Every claim about NCPDP structure comes from ONC's eRx Testing Tool messages, not from the NCPDP standard, which is licensed to members.

## What was built

- **`Ncpdp::QuestionSetWriter`** writes a question set as a 2023011 `QuestionSet`, wrapped in the `Open` status that carries it, with a synthetic case ID and deadline.
- **`Ncpdp::QuestionnaireMapper`** maps any `QuestionSet`, 2017071 or 2023011, to a FHIR R4 Questionnaire. It is tested on ONC's messages and on Nora's own sets.
- **`Ncpdp::Paths`** walks a Questionnaire the way a person filling it in would. It derives NCPDP's next-question graph, and checks the round trip.
- **`bin/rails questionnaires:ncpdp`** writes everything to `api/db/questionnaires/ncpdp/`:
  - `plan/`: each plan's set;
  - `member/`: the set a payer would send for one member;
  - `mapped/`: everything mapped back to FHIR;
  - the generated tables below.
- **Sources** for the structure are in `api/db/questionnaires/ncpdp/onc-samples/`: ONC's test messages, from `https://erx.healthit.gov/erx/api/cb/testplans/16510` (2023011, retrieved 2026-10-23).

## The two models

| | NCPDP SCRIPT ePA QuestionSet | FHIR Questionnaire (as Nora uses it) |
|---|---|---|
| Branching | **Forward.** Each `Choice` may name its `NextQuestionID`; otherwise the question's `DefaultNextQuestionID` applies; `END` ends the set. The lowest `SequenceNumber` starts it. | **Backward.** Each item's `enableWhen` says which earlier answers turn it on, combined with `enableBehavior` all or any. |
| Who knows the member | The payer. It builds the set for this member and this request, so a question that only applies to Blue Focus members can simply not be sent. | Nobody in particular. One Questionnaire per plan, with its branches, filled in by whoever has the chart. |
| Answers | Sent back in PARequest inside a copy of the set: `Answer/SubmitterProvidedAnswer/ChoiceID`, free text, `SubmitterProvidedNumericAnswer`, or an attachment. In 2017071 it is `PrescriberProvided…`. | A QuestionnaireResponse. DTR adds who or what supplied each answer (information origin). |

## Element by element

| NCPDP (2023011) | FHIR Questionnaire | Survives? |
|---|---|---|
| `Open/PACaseID` | none: it identifies the case, not the form (in PAS it would be a Task or Claim identifier) | **No** |
| `Open/DeadlineForReply/DateTime` | none on Questionnaire (in PAS it would be a Task restriction period) | **No** |
| `Header/QuestionSetID` | `identifier` | Yes |
| `Header/QuestionSetTitle`, `QuestionSetDescription` | `title`, `description` | Yes |
| `Header/QuestionSetContactCommunicationNumber` | none (`contact` describes the form's publisher, not the case) | **No** |
| `Header/AttachmentRequired` | none standard: kept as a Nora extension | Partly |
| `Question/QuestionID`, `SequenceNumber` | `linkId`, item order | Yes |
| `Question/QuestionText` | `text` | Yes |
| `Question/CodedReference` (e.g. `HL7OID` 2.16.840.1.113883.10.20.22.4.19) | `item.code`, as a URI | **Partly**: the samples carry CDA template OIDs, which name a document section, not a clinical concept |
| `QuestionType/Select` (`SelectMultiple` false/true) | `type: choice`, `repeats` | Yes |
| `QuestionType/FreeText`, `Numeric`, `Date` (`IsDateTimeRequired`) | `text`, `decimal`, `date` or `dateTime` | Yes, except that **Numeric does not say integer**, so Nora's "how many pens" (an integer) comes back as a decimal |
| `Choice/ChoiceID`, `ChoiceText`, `SequenceNumber` | `answerOption.valueCoding` code, display, order | Yes |
| `Choice/AdditionalFreeTextIndicator` M or O | a nested text item, required when M, shown when that choice is picked | Yes |
| `Choice/NextQuestionID`, `DefaultNextQuestionID`, `END` | `enableWhen` on the target question: any of the answers that point to it (`=` for a choice, `exists` for a default) | **Yes, mapped back exactly** (0 differing walks for every member set below) |
| `NextQuestionCondition`, `RangeComparison`, `NoneChoiceID` (new in 2023011) | not in any sample message, so not mapped; the mapper reports them if present | **Unknown** |

## Going the other way: Nora's Questionnaires to NCPDP

This is the harder direction, and where things are lost.

**Facts Nora reads silently.** Nora's FEP Questionnaires have hidden items, which decide branching without being asked: age group, FEP option, dosage form. NCPDP has no hidden questions. Two ways to handle them:

- In the **plan-level set** they become ordinary questions ("Patient age group?"). The fax form asks the same thing by labelling sections "Blue Standard / Blue Basic Patient:" and "Age 12-17:".
- In a **member set**, the payer applies them before sending, as a PBM would. They disappear.

**Questions that depend on an earlier fact, not on the previous answer.** NCPDP's forward graph gives each answer one next question. On the FEP forms, what follows "Will this medication be used in combination with another PA weight-loss medication?" depends on the member's plan option, which was answered long before. What follows "initiation" depends on the age group. One `NextQuestionID` cannot express that, so the plan-level set walks some members past questions they should see, or into ones they should not. The table counts those cases.

In the plan-level sets written here, the writer sends each such answer to the earliest of its possible next questions. So:

- the Saxenda and Wegovy sets never ask an adult for BMI, comorbidities, or the renewal weight-loss questions;
- no FEP set asks a Blue Focus member the non-formulary questions;
- between half (Zepbound) and three quarters (Saxenda, Wegovy) of random walks through the FEP sets differ from the Questionnaire.

The conflicts vanish in the member sets, because the payer has already applied the facts. This is the real argument for how ePA works: **the payer, not the form, decides which questions a member gets.** NCPDP 2023011's `NextQuestionCondition` may express it; no public sample shows how, so it is not used here.

**Lost entirely, because NCPDP has no place for it:**

- The **plain-language explanation** of each question.
- The **CQL expression** that answers it (`sdc-questionnaire-initialExpression`).
- The **form's own numbering** (FEP's "b. i.", and Saxenda's two questions numbered 6).
- **Nora's answer codes** (`27-29.9`): they become `Q7C2`. The mapping is kept by position, so Nora could answer an ePA set it wrote, but not one a payer wrote.

## Results

<!-- generated:start -->
<!-- Generated by bin/rails questionnaires:ncpdp. -->

| Question set | Questions | Read silently by Nora | Plan-level set: answers whose next question depends on an earlier one | Plan-level set: questions no answer reaches | Plan-level set: walks that differ after the round trip (of 400) | Member sets: walks that differ |
|---|---|---|---|---|---|---|
| aetna-saxenda | 4 | none | none | none | 0 | n/a |
| aetna-wegovy | 4 | none | none | none | 0 | n/a |
| aetna-zepbound | 4 | none | none | none | 0 | n/a |
| cigna-saxenda | 7 | none | none | none | 0 | n/a |
| cigna-wegovy | 6 | none | none | none | 0 | n/a |
| cigna-zepbound | 6 | none | none | none | 0 | n/a |
| fep-saxenda | 18 | age-group, plan-option | pa-combination = no → focus-nonformulary or change-from-zepbound<br>continuation = continuation → continuation-loss or continuation-pediatric<br>continuation = initiation → initiation-bmi or initiation-pediatric-bmi<br>pa-combination = yes → focus-nonformulary or change-from-zepbound | focus-nonformulary, focus-switch-generic, initiation-bmi, initiation-comorbidity, continuation-loss, continuation-maintained | 294 | 0 (4 sets, 0 conflicts) |
| fep-wegovy | 19 | age-group, plan-option, dosage-form | pa-combination = no → focus-nonformulary or change-from-zepbound<br>continuation = continuation → continuation-loss or continuation-pediatric<br>continuation = initiation → initiation-bmi or initiation-pediatric-bmi<br>pa-combination = yes → focus-nonformulary or change-from-zepbound | focus-nonformulary, initiation-bmi, initiation-comorbidity, continuation-loss, continuation-maintained | 301 | 0 (8 sets, 0 conflicts) |
| fep-zepbound | 18 | age-group, plan-option | brand-generic = generic → focus-nonformulary or tried-saxenda-wegovy<br>brand-generic = brand → focus-nonformulary or tried-saxenda-wegovy | focus-nonformulary, focus-switch-generic | 194 | 0 (4 sets, 0 conflicts) |
| uhc-saxenda | 5 | none | none | none | 0 | n/a |
| uhc-wegovy | 5 | none | none | none | 0 | n/a |
| uhc-zepbound | 5 | none | none | none | 0 | n/a |

ONC's own test messages, mapped to FHIR the same way:

| Message | Form | Questions | Not mapped |
|---|---|---|---|
| PAInitiationResponse-0.xml | Tacrolimus PA Form | 6 | PACaseID A106; DeadlineForReply 2022-10-01T23:59:59; QuestionSetContactCommunicationNumber |
| PAInitiationResponse-15.xml | Lovenox PA Form | 6 | PACaseID A102; DeadlineForReply 2022-10-01T23:59:59; QuestionSetContactCommunicationNumber |
| PAInitiationResponse-19.xml | Crestor PA Form | 5 | PACaseID A104; DeadlineForReply 2022-10-01T23:59:59; QuestionSetContactCommunicationNumber |
| PAInitiationResponse-29.xml | Symbicort PA Form | 2 | PACaseID A103; DeadlineForReply 2022-10-01T23:59:59; QuestionSetContactCommunicationNumber |
<!-- generated:end -->

## What this cannot show

- **Real NCPDP traffic.** These are the shapes ONC's test tool uses, written and read by Nora. No payer has sent Nora a question set, and none of the XML has been checked against NCPDP's schema, which is licensed to members.
- **The question sets UnitedHealthcare (Optum Rx), Aetna (CVS Caremark) and Cigna (Express Scripts) actually send for these drugs.** They come through ePA, behind CoverMyMeds' login. Nora's sets for those plans are derived from their published criteria.
- **Whether a payer's set for an FEP member matches the member sets here.** Those apply Nora's reading of the fax forms.
- **Answering a payer's set.** Nora maps an incoming set to a Questionnaire, but its CQL answers questions it knows by ID. A real payer's set would need its questions matched to Nora's expressions, by code or by hand. The samples' only codes are CDA template OIDs, which is not enough.
