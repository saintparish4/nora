# How the cases are labelled

Every criterion of every case gets one label, decided by a person reading the
chart. Nobody ran the extraction service to find out the answer. The request
date is the case's `as_of` date; "the last six months" counts back from it.

| Label | Meaning | Scored |
|---|---|---|
| `supported` | A careful reviewer could mark the requirement met from the chart alone. `support` lists every passage that documents it. | `found` |
| `unsupported` | The chart does not document it. `traps` lists passages that look relevant and are not enough. | `clean` |
| `not_applicable` | The criterion does not apply to this patient. | no |
| `ambiguous` | Two careful reviewers could disagree. Parked until the owner decides. | no |

## The rule for each criterion

1. **BMI.** Supported when a note dated within six months of the request states
   a BMI of 30 or more, or a BMI of 27 to 29.9 and the chart also documents one
   of the listed comorbidities. A BMI range or its Z68 code counts as a stated
   BMI. Height and weight without a BMI do not count. A BMI from an older note
   does not count.
2. **Diagnosis.** Supported when obesity or overweight is recorded as the
   patient's own diagnosis, in words or as an ICD-10 code (E66.x). No time
   limit. A relative's diagnosis, a negation ("not obese"), or a complaint of
   weight gain does not count.
3. **Comorbidity (conditional).** Applies only when the most recent BMI within
   six months is 27 to 29.9; otherwise `not_applicable`. Supported when a listed
   comorbidity is the patient's own current diagnosis. Family history, ruled-out
   conditions, and negations do not count.
4. **Lifestyle program.** Supported when the chart documents both a
   reduced-calorie diet and physical activity, and shows they have run for at
   least six months before the request (a start date, or a stated duration).
   Diet alone, activity alone, less than six months, or advice that has not
   been acted on does not count.
5. **Prior medication trial.** Supported when the chart names a
   weight-management medication other than the one requested, shows the patient
   took it, and gives the outcome or the reason it was stopped. A prescription
   or fill with no outcome, a drug that was discussed or declined, and the
   requested drug itself do not count.
6. **No concurrent GLP-1.** Supported when the chart states that the patient is
   not taking, or will not take, another GLP-1 receptor agonist alongside the
   requested drug. Unsupported when nothing is said, or when a current GLP-1 is
   listed with no statement that it will stop.
7. **Second trial (UnitedHealthcare Wegovy policy).** Supported when two
   different other medications each meet rule 5. One qualifying trial is not
   two.

## How an excerpt is graded

A proposed excerpt counts as supporting when it overlaps any `support` passage
by at least one character. That is lenient on purpose: the service proposes
whole sentences, and a sentence that contains the supporting text is useful to
a reviewer. On an `unsupported` requirement every proposed excerpt is a false
proposal, whether or not it overlaps a listed trap; traps only explain why the
chart tempts one.

## Open questions for the owner

- **A medication list with no GLP-1 on it, and no statement.** Is that enough
  for criterion 6? Two cases wait on this (`weight_goal_no_workup`,
  `med_list_without_statement`); they are labelled `ambiguous` and not scored.
- **Height and weight without a BMI.** Rule 1 says it does not count. If a
  payer would accept it, `weight_without_bmi` flips to supported.
- **One trial offered for the second-trial criterion.** Rule 7 treats it as a
  false proposal, because a reviewer could mark the requirement met on it. If
  showing the first trial there is helpful rather than risky, the two
  second-trial cases need a different label.
