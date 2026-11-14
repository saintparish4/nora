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
| Closeness to real data | Per-column distance 0.021 and 0.016 on two open datasets, against 0.356 and 0.395 for Synthea |
| Planted defects | 300 defects with an answer key; the HL7 validator alone finds 69 |
| Reproducibility | CI rebuilds every committed number from open data |
| Usefulness for training a model | Not assessable on open data: the held-out sets hold 0 and 5 outcomes |
| Privacy | Not met. No leak is detectable, but the open data is too small for the test to pass anything |
| Blind test by a clinician | Packet built; not yet rated |

The rules those results are judged by are in
[nora/PROTOCOL.md](nora/PROTOCOL.md), committed before any result existed.

## History

Until November 2026 this repository held a different Nora: a
prior-authorization workspace for clinic staff (Rails and Next.js). That
project was retired and its code removed in one commit. It is all still
in the history; `git checkout ef07f9a` is the last commit that has it.

## License

Code: [MIT](LICENSE). Generated data: Open Database License, see the
`NOTICE.md` beside each table under [nora/generated/](nora/generated/).
