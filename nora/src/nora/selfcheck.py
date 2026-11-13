"""Stand-in systems that prove the scorer can tell good from bad.

PROTOCOL.md section 9. Each stand-in is a "generator" whose right verdict
is known before it is scored. If the scorer gives any of them the wrong
verdict, no number it produces for a real generator means anything, so the
`nora selfcheck` command and the test suite both run this.

- holdout: a fresh sample of the same process. Must pass everything.
- copy: the training data itself. Useful and faithful, and a total privacy
  failure: the reason privacy is scored at all.
- marginals: every column shuffled on its own. Each column looks perfect
  and the relationships are gone: the reason utility and the discriminator
  are scored and per-column distance is not enough.
- noise: random values in range. Must fail utility and fidelity.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from nora import fixture, schema, score, split

ROWS = 4000


def systems(train: pd.DataFrame) -> dict[str, pd.DataFrame]:
    rng = np.random.default_rng(score.SEED)
    n = len(train)

    shuffled = train.copy()
    for column in schema.FEATURES + schema.OUTCOMES:
        shuffled[column] = rng.permutation(train[column].to_numpy())
    # Shuffling can pair a death with a readmission label; the schema forbids it.
    shuffled.loc[shuffled["died_in_hospital"] == 1, "readmit_30d"] = np.nan

    noise = train.copy()
    for column, (low, high) in schema.BOUNDS.items():
        noise[column] = rng.uniform(low, high, n)
    for column in schema.BINARY:
        noise[column] = rng.integers(0, 2, n).astype(float)
    noise["dx_group"] = rng.choice(schema.DX_GROUPS, n)
    noise["died_in_hospital"] = 0.0
    noise["readmit_30d"] = rng.integers(0, 2, n).astype(float)

    return {
        "holdout": fixture.sample(n, seed=2),
        "copy": train.copy(),
        "marginals": shuffled,
        "noise": noise,
    }


def run() -> dict[str, dict]:
    train, test = split.split(fixture.sample(ROWS, seed=1))
    return {name: score.scorecard(train, test, table) for name, table in systems(train).items()}


def failures(cards: dict[str, dict]) -> list[str]:
    """Every way the scorer's verdicts differ from the known right ones."""
    expected = [
        ("holdout", "utility", True),
        ("holdout", "privacy", True),
        ("copy", "utility", True),
        ("copy", "privacy", False),
        ("marginals", "utility", False),
        ("noise", "utility", False),
    ]
    problems = [
        f"{name}: {part} should {'pass' if want else 'fail'}"
        for name, part, want in expected
        if cards[name][part]["passes"] != want
    ]
    fid = {name: card["fidelity"] for name, card in cards.items()}
    checks = [
        (0.45 <= fid["holdout"]["discriminator_auroc"] <= 0.55, "holdout: discriminator not ~0.5"),
        (fid["copy"]["marginal"] == 0, "copy: marginal distance not 0"),
        (fid["marginals"]["marginal"] < 0.02, "marginals: columns should still match"),
        (fid["marginals"]["discriminator_auroc"] > 0.6, "marginals: discriminator missed it"),
        (
            fid["marginals"]["correlation"] > 2 * fid["holdout"]["correlation"],
            "marginals: correlation gap missed it",
        ),
        (fid["noise"]["marginal"] > 0.3, "noise: marginal distance too small"),
        (cards["copy"]["privacy"]["train_rows_copied"] == 1, "copy: copies not counted"),
        (cards["copy"]["privacy"]["attack_auroc"] > 0.95, "copy: attack should succeed"),
    ]
    return problems + [message for ok, message in checks if not ok]
