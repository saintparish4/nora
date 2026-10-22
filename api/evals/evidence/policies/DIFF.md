# Where the current library differs from published policy

The current library (`db/seeds/policy_library.rb`) gives every payer the same
six criteria, plus a seventh "illustrative" one for UnitedHealthcare Wegovy.
Below, each current criterion is compared with what the four payers publish
(`criteria.yml`, `SOURCES.md`).

## Criterion by criterion

| # | Current library | UnitedHealthcare | Aetna | Cigna | BCBS FEP |
|---|---|---|---|---|---|
| 1 | BMI ≥ 30, or ≥ 27 with a comorbidity, **documented within the last 6 months** | Same thresholds, **no time window** | Same thresholds, measured at **baseline: before any weight-loss drug**, and documentation required | Same thresholds, **at baseline, before any GLP-1 or GLP-1/GIP drug** | Same thresholds; no window |
| 2 | **A diagnosis of obesity or overweight is documented** | Not a criterion | Not a criterion | Not a criterion | Not a criterion |
| 3 | If BMI 27–29.9: a comorbidity (HTN, T2D, dyslipidemia, OSA, CVD) | Part of the BMI criterion; examples: dyslipidemia, HTN, T2D, sleep apnea | Part of the BMI criterion; examples: HTN, T2D, dyslipidemia | Part of the BMI criterion; a **closed list of 11**, adding knee osteoarthritis, asthma, COPD, MASLD/NAFLD, PCOS, CAD | Part of the BMI criterion; **established cardiovascular disease** is its own route, plus examples T2D, dyslipidemia, HTN |
| 4 | Reduced-calorie diet **and** increased physical activity for **at least 6 months** before the request | **Used as an adjunct** to lifestyle modification; no past program, no duration | A **comprehensive program** with **behavioral modification** and **continuing follow-up**, at least 6 months before drug therapy | **Behavioral modification and dietary restriction for at least 3 months** (no activity requirement); and used with them going forward | Participated in a comprehensive program (e.g. Teladoc); **no duration** |
| 5 | A trial of **one** other weight-management drug, with outcome or reason stopped | Not a criterion | Not a criterion | Not a criterion (brand Saxenda: tried **generic liraglutide** first, on Employer Plans) | Saxenda/Wegovy: not a criterion. **Zepbound: inadequate response, intolerance, or contraindication to two oral drugs** |
| 6 | Will not be used with another GLP-1 | **Removed**: the change log reads "Removed criteria that coverage would not be provided if used in combination with other weight loss agents" | Only in the label's limitations of use, not a criterion | **Conditions Not Covered**: concomitant GLP-1 **or GLP-1/GIP** agonists | No dual therapy with another GLP-1, **nor with another prior-authorization weight-loss drug** |
| 7 | UHC Wegovy only: a **second** prior trial | **Not in UnitedHealthcare's policy** | n/a | n/a | n/a |

## In the policies, missing from the library

- **Age**: 18 or older at Aetna, Cigna and FEP (Zepbound); 12 or older or
  older than 16 at UnitedHealthcare depending on the drug.
- **Plan benefit**: UnitedHealthcare's program applies only to plans that
  elected to cover weight-loss drugs; Cigna and the others defer to the benefit
  plan, and many plans exclude these drugs. No criterion can answer this from a
  chart; it is a coverage check.
- **Preferred product**: Cigna (generic liraglutide before brand Saxenda), FEP
  (Zepbound: the preferred product first, list not published in the policy).
- **Documentation**: Aetna and FEP Zepbound say documentation is required. The
  chart excerpts Nora quotes are that documentation, so this supports the
  product rather than adding a criterion.
- **Future use with lifestyle changes** (UnitedHealthcare, Cigna): about the
  plan of care, not the history.

## What it means for the eval

Of the 163 labelled requirements in the 31 cases, judged against each case's
own payer:

| Under the payer's published policy | Requirements |
|---|---|
| The criterion exists and is the same | 26 (16%) |
| It exists but is worded or bounded differently | 58 (36%) |
| It is folded into another criterion | 5 (3%) |
| **It does not exist** | **74 (45%)** |

The 74 are mostly the diagnosis criterion (31), the prior trial (27), and the
GLP-1 statement at UnitedHealthcare and Aetna (13). So almost half of what the
eval scores is whether Nora handles requirements these payers do not impose.
The failure types those cases exercise (negation, hypothetical, timing) still
occur in real criteria, which is why the numbers are not worthless. But they
are not numbers about these payers.

Some current labels would flip. `bmi_only_in_old_note` (Aetna) is labelled
unsupported because its only BMI is 16 months old; under Aetna's baseline rule
that old BMI may be exactly the one the payer wants.

## The swap (2026-10-22)

The owner chose to swap. What was done:

- `db/seeds/policy_library.rb` now seeds **version 2**: these criteria, one
  template per payer and drug, each with its source URL and effective date
  (Aetna prints none). Version 1 rows are never deleted, so requests opened
  under them keep their criteria; new requests resolve to version 2.
- Criteria were split where a reviewer needs separate evidence: the BMI
  criterion's comorbidity branch stays a conditional criterion of its own.
  New kinds: `age`, `indication`, `plan_of_care`, `preferred_product`.
- BCBS: the Federal Employee Program is its own payer ("Blue Cross Blue Shield
  Federal Employee Program", plan "FEP Blue Standard"). "Blue Cross Blue
  Shield / Blue Choice PPO" stays, and gets the common baseline, as does any
  payer without a published policy on file.
- The demo puts its four requests on four payers. The featured request (Jane
  Rivera) moved to Cigna, where her chart has two real gaps: a baseline BMI
  from before her 2025 Saxenda course, and a statement that she takes no other
  GLP-1. Tom Okafor moved to FEP; his note now also says he takes no other
  weight-loss medication, which FEP asks for.
- The eval keeps running on version 1, frozen in `../library_v1.rb`, because
  that is what its 31 cases were labelled against. New cases written against
  version 2 (PROTOCOL.md part 5) are what will measure Nora on these criteria.

Production: the library and the demo change when the seeds run there
(`bin/rails demo:reset`, which reloads every seed).
