# Timed-task protocol: does the request form save time without adding errors?

A plan for testing Nora's request form with front-desk staff and medical assistants who have done GLP-1 prior authorizations on CoverMyMeds. It tests the two claims the rest of the work cannot: that filling a request from Nora's form is **faster** than filling it from the chart, and **no less accurate**. The times in [FRONT-DESK-WORKFLOW.md](FRONT-DESK-WORKFLOW.md) are keystroke-level estimates, and the [request-form eval](../api/evals/request_form/README.md) is labelled by the person who wrote the code. This protocol replaces both with measurements and with labels from people who do the work.

**Not run.** No participants are available, so this stays a ready protocol with working scoring (`bin/rails eval:request_form:timed`), not a result.

Everything uses the synthetic demo practice. No real patient, chart, CoverMyMeds account or Epic login is involved.

## Questions

1. **Time:** how long does one request take, from opening the chart to the last answer entered, with Nora's form and without it? Report the administrative fields and the clinical questions separately.
2. **Accuracy:** how many fields and answers are wrong or missing against the answer key, in each condition?
3. **"Don't know":** when the chart cannot answer a question, do participants recognise it, and do they flag it for the prescriber's office instead of guessing? Does Nora's plain-language explanation help?
4. **Labels:** do people who have done this work agree with the eval's labels?

## Participants

Three to five former coworkers who have started and submitted medication PAs on CoverMyMeds from Epic. That is too few for statistics, and it is not meant to give them. It is enough to see whether the difference is large, small or backwards, and to find what the form gets wrong.

Ask each person in plain words: it is a portfolio project, it takes about an hour, the data is invented, they can stop at any time, and the notes will name no one. They are not asked to judge Nora. They are asked to do the task the way they did it at work.

## Materials

- **Four requests**, from the eval's cases:
  - Tom Okafor, Saxenda, FEP Blue Standard (`tom-fep-saxenda`)
  - Marcus Bell, Zepbound, FEP (`marcus-fep-zepbound`)
  - Jane Rivera, Wegovy, Cigna (`jane-cigna-wegovy`)
  - Elena Petrov, Wegovy, UnitedHealthcare (`elena-uhc-wegovy`)

  Two have the FEP form's own questions and two have derived questions. Each has at least one question the chart cannot answer.
- **The chart, without Nora:** a packet for each patient laid out like the Epic screens Sharif named.
  - Demographics.
  - **Coverages**, with a picture of the insurance card. The card is the only place the BIN, PCN and Rx group appear, as in practice.
  - The prescription order.
  - The problem list.
  - **Vitals**.
  - **Encounters** with the visit notes from the seeded charts.

  Print it, or put it on screen as PDFs. It must hold exactly what the FHIR bundles and notes hold.
- **A stand-in for CoverMyMeds:** a form with CoverMyMeds' sections and the plan's questions in order, with the same fields in both conditions. A shared spreadsheet or a simple web form is enough. It records what was entered, and the timestamps if it can.
- **Nora's request form** for the same request, opened from `/demo`.
- **The answer key:** the eval's labels for the four cases, held by the facilitator only.
- A timer, and a screen recording if the participant agrees.

## Design

Every participant does all four requests, two in each condition:

- **Chart only:** the chart packet and the CoverMyMeds stand-in.
- **With Nora:** Nora's request form and the CoverMyMeds stand-in. The chart packet stays available, because the form tells them to check things in it.

Counterbalance with a Latin square, so each request appears in each condition and each position across participants:

| Participant | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| A | Tom, chart only | Marcus, with Nora | Jane, chart only | Elena, with Nora |
| B | Marcus, with Nora | Tom, chart only | Elena, with Nora | Jane, chart only |
| C | Jane, with Nora | Elena, chart only | Tom, with Nora | Marcus, chart only |
| D | Elena, chart only | Jane, with Nora | Marcus, chart only | Tom, with Nora |

Start with a five-minute practice request (Priya Nair) in each condition, so the first timed request is not also the first look at the form.

## Procedure (about 60 minutes)

1. **Introduction, 5 min.** What the session is for, consent, and the practice request in both conditions.
2. **Four requests, 10 min each at most.** For each:
   - Say: "Fill this request the way you would at work. If something can't be answered from the chart, write ASK and move on."
   - Start the timer when they open the chart or the form.
   - Mark the time when they finish the administrative sections and move to the questions.
   - Stop the timer when the last answer is entered.
   - At 10 minutes, stop and record the request as unfinished. Do not help.
   - Do not explain any question. Note any the participant reads twice or asks about; those are the "worded weirdly" ones.
3. **After each request, one minute:**
   - "How sure are you that everything you entered is right?" (1 to 5)
   - "Was there a question you weren't sure what it was asking?"
4. **Labelling, 10 min.** Give the participant one request they did not fill: the chart packet and the plan's questions, with no Nora. Ask them to write the answer they would give to each question, or ASK. These become independent labels for the eval.
5. **Debrief, 5 min.**
   - "What would you not trust on Nora's form?"
   - "What did it get wrong, or make slower?"
   - "Was the plain-language explanation right?"

## What to record

For each participant and request: the condition; the time for the administrative sections and for the questions; whether it was finished; every field and answer as entered; the confidence score; and the questions they hesitated over.

## Scoring

Score against the answer key with the eval's rules:

- **Fields:** exact match after normalising case and spacing. An empty field is correct only when the key is empty.
- **Questions:**
  - correct;
  - wrong;
  - correctly "ASK";
  - a guess where the key is ASK, which is the costly error;
  - ASK where the chart had the answer, which is the safe miss.

The tooling is in `api/evals/request_form/`. `timed/` holds the session and entry templates, and `bin/rails eval:request_form:timed` writes each person's results. `labeling/` holds the blind packet and answer sheet, and `bin/rails eval:request_form:agreement` gives Cohen's kappa and lists every disagreement.

## Analysis

Descriptive only.

- **Time:** for each participant, the median time with Nora and without, and the difference. Report all the differences, not just the average.
- **Accuracy:** the total wrong answers and guesses in each condition.
- **Agreement:** compare the participants' labels with the eval's labels, question by question. Every disagreement is either a label to fix in `cases.yml` or a rule to change in Nora. Write down which, and why.

The questions that matter: did any participant get faster but less accurate with Nora? Did anyone copy a wrong answer from the form without checking? One instance of either is worth more than the medians.

## What it still won't show

- **Time inside the real CoverMyMeds and Epic.** Both are stand-ins, so time spent finding the patient in Epic and moving through CoverMyMeds' screens is not measured. The keystroke-level estimates stay estimates for those steps.
- **The questions UnitedHealthcare, Aetna and Cigna actually send.** Those plans' questions come through CoverMyMeds' login. Participants can say whether the derived questions look like what they remember, but that is memory.
- **Whether approvals go up.** That needs real submissions.
- **Learning and fatigue.** Four requests in an hour is not a shift's worth.

## Before the first session

- Run the whole session with Sharif first and time it. Cut a request if it runs over an hour.
- Check that the chart packets hold exactly what the FHIR bundles and notes hold, and nothing else.
- Fix the answer key wherever the pilot shows a label is wrong, and re-run `bin/rails eval:request_form`.
