# Independent labels

The eval's labels were written by the person who wrote the code, so they are not independent. This folder gets labels from people who have done prior authorizations.

**Not run yet.** No one outside the project has labelled these cases. Everything here is ready for that.

## What a labeller gets

- `packet.html`: the 20 requests, numbered R01 to R20 so the case names don't hint at answers. For each one:
  - the chart as staff would see it: patient, coverages, every prescription, diagnoses (problem list and visit diagnoses), BMI from Vitals, and the visit notes;
  - the plan's questions in order, with their choices and "Only if" conditions.

  It contains none of Nora's answers, none of its plain-language explanations, and none of the eval's labels. Print it or send it as a file.
- `answer-sheet.csv`: one row per question, 231 in all. For each, the labeller writes:
  - a choice code, several codes separated by `;`, or a number;
  - `ASK` if they would ask the prescriber's office;
  - `N/A` if the question doesn't apply.

  Expect about two hours for all 20. Labellers work alone.

Rebuild both with `bin/rails eval:request_form:packet` after changing `cases.yml`, a question set, or the demo charts.

## Scoring

Save each filled sheet as `labels/<name>.csv`, then run:

```bash
bin/rails eval:request_form:agreement
```

It writes `AGREEMENT.md` with:

- **Exact-answer kappa:** Cohen's kappa for each labeller against the eval's labels, counting every distinct answer as its own category.
- **Coarse kappa:** answered, ask, or not applicable. This is the scale the eval's "correct don't know" score is about.
- **Kappa between the labellers.**
- **Every disagreement**, with an empty resolution column.

Each disagreement gets one of three resolutions:

- **The label was wrong:** fix `cases.yml`, re-run `bin/rails eval:request_form`, and report the new scores.
- **Nora's rule was wrong:** change it, and add a case if none shows it.
- **Both stand:** say why in the resolution column, for example a question the chart answers only by inference that a careful person would still ask the office about.

Kappa with two labellers and 231 items is a rough number. Read the disagreements before the kappa.

## A disagreement already visible

R04 (`tom-older-prescription`) labels "is this a renewal?" as ask, because Saxenda was first written seven months before the request. Its visit note, from two months before the request, says "Requesting Saxenda". A labeller reading the note will likely answer "initiation". That is the kind of thing this step exists to settle.
