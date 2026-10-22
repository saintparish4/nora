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

## If you swap

Replacing the seeded library is the owner's decision, because:

- It changes production: the seeds run in every environment, so the demo's
  requests, requirements and walkthrough change. The demo's
  "needs clarification" request depends on the illustrative second-trial
  criterion, which UnitedHealthcare does not have.
- It stops the eval: `state.json` pins the criteria digest, and every case
  must be relabelled against the new criteria (by the reviewers in
  PROTOCOL.md part 5, not by the author of the rules).
- It needs rule hints for the new criteria (age, the closed Cigna comorbidity
  list, baseline BMI, behavioral modification, preferred product), and new
  cases for each.

Order that keeps both working: write the new cases against `criteria.yml`
first; then swap the library, the hints and the demo story together in one
change; then re-pin the digest.
