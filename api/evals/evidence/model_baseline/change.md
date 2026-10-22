First model pass: the rule pass (v3) plus gpt-4o-mini (served gpt-4o-mini-2024-07-18), 31 cases
x 3 reps, run 2026-10-22. 93 calls, about 64k prompt and 46k completion tokens, about $0.04.
No errors, no truncation, every excerpt verbatim.

Test slice, against v3 (rules only), paired 95% intervals:

| metric | v3 | rules + model | difference |
|---|---|---|---|
| clean (9 cases) | 100.0 | 31.5 [7.4, 55.6] | -68.5 [-92.6, -44.4], 8 cases worse |
| found (14 cases) | 94.3 | 100.0 | +5.7 [0.0, 12.9], not resolved |
| precision (14 cases) | 97.0 | 86.0 [81.4, 91.0] | -11.1 [-16.7, -5.1], 8 cases worse |
| verbatim | 100.0 | 100.0 | 0 |

Reading the train slice (rep 0): the model adds 7 proposals to the rules' 75, and 6 of the 7 are on
requirements the chart does not support. They are the near-misses the cases were written as traps:
drugs discussed and declined, a diet advised but not followed, a BMI under the threshold, a BMI
from an outdated note, a reason for visit offered as a diagnosis.

So on these cases the model pass hands the reviewer more wrong quotes than it finds missing right
ones. The rule pass was already near this case set's ceiling, which leaves the model little room
to help and plenty to hurt; the same caveat as v3 applies, and real charts may differ. Not kept as
a default. Candidates, each its own round: tell the prompt what a trap looks like, only accept
model proposals where the rules found nothing, or try a stronger model.
