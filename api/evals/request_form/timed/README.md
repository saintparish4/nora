# Timed task

Results of `docs/TIMED-TASK-PROTOCOL.md`. **Not run yet.**

## Before a session

- `sessions.template.csv` lists the protocol's Latin square: participants A to D, the four requests, and the condition for each. Copy it to `sessions.csv`. During the session, fill in:
  - the two times in seconds: administrative sections, then questions;
  - `finished` (y/n);
  - confidence (1 to 5);
  - any questions they hesitated over.
- `entries/template-R01.csv` (and R09, R11, R13, and R16 for practice) is the CoverMyMeds stand-in's content: every field and every question. Save what each participant entered as `entries/<participant>-<request>.csv`. Questions use the same vocabulary as the labelling sheet: a code, `ASK`, or `N/A`.

## Scoring

```bash
bin/rails eval:request_form:timed
```

It writes `RESULTS.md`. For each person it reports:

- their median time per condition, and the seconds saved;
- their errors per condition, and the difference;
- how often they guessed where the office should have been asked.

Below that is every request, one row each. Errors are wrong fields, wrong answers, guesses where the key is ASK, and questions answered that don't apply or skipped that do. Asking the office when the chart had the answer is counted separately as a safe miss.

`TEMPLATES=1 bin/rails eval:request_form:timed` rewrites the blank templates.
