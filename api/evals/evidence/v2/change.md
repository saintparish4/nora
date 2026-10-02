Apply each criterion's own conditions, not only its keywords.

Hypothesis: the remaining false proposals satisfy the keyword but not the criterion: an old BMI,
a BMI of 27 to 29.9 with no comorbidity, a program under six months or with no activity, a drug
with no outcome, one trial offered for a two-trial criterion, the requested drug under its
generic name.
Change: new hint keys (`within_months`, `bmi_min_with_comorbidity`, `min_months`,
`also_requires`, `drugs`, `requires_outcome`, `min_distinct`) and the logic behind them.
Result: clean reaches 34 of 34; found lost one requirement in the test slice. Kept.
