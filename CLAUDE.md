# Nora Development Guide

Nora is a synthetic patient record generator for adult heart disease
admissions, scored against real data. `nora/README.md` reports what has
been shown; `nora/PROTOCOL.md` is the contract every number is judged by.

## Project Structure

```
/nora/               - The project (Python 3.12, uv)
  PROTOCOL.md        - Scoring protocol; its sha256 is pinned in protocol/lock.json
  /protocol/         - lock.json: digests of the protocol, the table, the test rows
  /src/nora/         - One module per job (see nora/README.md "How it is built")
  /tests/            - pytest, one file per module
  /baselines/        - Synthea's mapped table (committed)
  /generated/        - Our generator's table and 25 sample records (committed, ODbL)
  /results/          - Scorecards and validator results (committed)
  /data/             - Real data, tools, full renders (git-ignored, never committed)
```

## Commands

Run everything from `nora/`.

```bash
uv sync
uv run ruff format . && uv run ruff check .
NORA_MIMIC_DEMO=data/raw/mimic-iv-clinical-database-demo-2.2 uv run pytest -q
uv run nora --help
```

Without `NORA_MIMIC_DEMO` two tests that read the open demo are skipped.
The suite takes about a minute; the self-check and the generator-by-size
run are most of it.

## Rules that are easy to break

- **The protocol is locked.** Editing `PROTOCOL.md` changes its hash and
  `nora score` and `nora generate` then refuse to run. A change goes in its
  section 15 with a reason, and the lock entry is updated by hand in the
  same commit. Section numbers are cited from code; never renumber.
- **Nothing is fit to, tuned on, or selected by the test set.** Fit to
  `data/<name>/train.csv` only. Tune on the invented process in
  `fixture.py`, never on real held-out rows.
- **The split's salt never changes** (`split.SALT`).
- **Real data never enters git.** `data/` is ignored. The full MIMIC-IV and
  eICU are under an agreement that forbids sharing them, and nothing may
  be fit to the full MIMIC-IV: it may only ever score.
- **Committed output must match the code.** `tests/test_records.py` fails
  when `generated/copula-v1/sample` is stale. After changing `generate`,
  `chart`, `fhir` or `note`, rerun `nora generate`, `nora render`,
  `nora score` and `nora validate`, and commit the new output in its own
  commit.
- **Every bundle must read back as its row.** `records.build` enforces it.
  A new fact in the table needs both a renderer in `fhir.render` and a
  reader in `fhir.read`.
- **Report numbers as they came.** A result that cannot be assessed is
  reported as not assessable, never as a pass. An infrastructure failure
  is an error, not a score.
- **The validator is pinned** by version and sha256 in `validate.py`. It
  needs Java 17+ and network access to HL7's terminology server.
- **Synthea is not byte-reproducible from its seed**, so its mapped table
  is committed and scored rather than regenerated.

## Coding Standards

- Python 3.12, type hints, `from __future__ import annotations`.
- ruff for format and lint (line length 100). Line endings LF.
- Each module opens with a docstring that says what it is for and which
  protocol section it implements. Keep modules small; each imports only
  from the ones before it in `nora/README.md`'s table.
- Tests are named as sentences that state the rule they check.

## Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): subject`, with a body that says why. Scope is usually `nora`.
One decision per commit; tests with the code they prove; generated output
and results in their own commit, apart from the code.
