# Nora

A synthetic patient record generator for adult heart disease admissions,
scored against real data. For each synthetic admission it writes a FHIR
bundle (US Core 6.1.0), a discharge note that states the same facts, and
an answer key that says where in the note each fact is, so that software
that reads charts can be tested where the right answer is known.

The project lives in [nora/](nora/). Start with
[nora/README.md](nora/README.md): it says what has been shown, what has
not, and how to reproduce every number.

| | |
|---|---|
| FHIR validity | HL7 validator on 1,000 generated bundles: 0 errors, 0 warnings |
| Closeness to real data | Per-column distance 0.021, against 0.356 for Synthea |
| Usefulness for training a model | Not assessable on open data: the open test set is 8 admissions |
| Privacy | Not met at 42 training admissions; passes from about 1,000 on a known process |

The rules those results are judged by are in
[nora/PROTOCOL.md](nora/PROTOCOL.md), committed before any result existed.

## History

Until November 2026 this repository held a different Nora: a
prior-authorization workspace for clinic staff (Rails and Next.js). That
project was retired and its code removed in one commit. It is all still
in the history; `git checkout ef07f9a` is the last commit that has it.

## License

Code: [MIT](LICENSE). Generated data: Open Database License, see
[nora/generated/copula-v1/NOTICE.md](nora/generated/copula-v1/NOTICE.md).
