"""A seeded run on the open demos reproduces the committed numbers.

This is the reproducibility item of PROTOCOL.md section 13, and it is what
CI runs. Every test here needs the open data on disk and is skipped without
it. Digests must match exactly. Scores are compared to nine decimal places
rather than byte for byte, since a different processor may round the last
bit differently.
"""

import json
import math
import os
from pathlib import Path

import pytest

from nora import eicu, generate, mimic, schema, score, split
from nora.cli import read_table

ROOT = Path(__file__).parents[1]
LOCK, PROTOCOL = ROOT / "protocol/lock.json", ROOT / "PROTOCOL.md"
SOURCES = {  # dataset: (environment variable, loader, outcome utility is scored on)
    "mimic-iv-demo-2.2": ("NORA_MIMIC_DEMO", mimic.load, "readmit_30d"),
    "eicu-demo-2.0.1": ("NORA_EICU_DEMO", eicu.load, "died_in_hospital"),
}


def close(a, b) -> bool:
    """Equal, allowing for the last bits of a float and for NaN."""
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(close(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return len(a) == len(b) and all(close(x, y) for x, y in zip(a, b, strict=True))
    if isinstance(a, float) and isinstance(b, float):
        return (math.isnan(a) and math.isnan(b)) or math.isclose(a, b, rel_tol=0, abs_tol=1e-9)
    return a == b


@pytest.fixture(scope="module", params=list(SOURCES))
def dataset(request):
    variable, load, outcome = SOURCES[request.param]
    if variable not in os.environ:
        pytest.skip(f"set {variable}")
    table = load(Path(os.environ[variable]), request.param)
    return request.param, table, outcome


def test_the_real_table_and_the_protocol_still_match_the_lock(dataset):
    name, table, _ = dataset
    split.verify(table, name, LOCK, PROTOCOL)


def test_the_generator_draws_the_committed_table(dataset):
    name, table, _ = dataset
    train, _ = split.split(table)
    drawn = generate.sample(generate.fit(train), 1000, 20261113, "copula-v2")
    committed = read_table(ROOT / "generated" / name / "copula-v2/admissions.csv")
    assert split.digest(drawn) == split.digest(committed)


@pytest.mark.parametrize("system", ["copula-v2", "synthea"])
def test_scoring_again_gives_the_committed_scorecard(dataset, system):
    name, table, outcome = dataset
    train, test = split.split(table)
    folder = "baselines/synthea" if system == "synthea" else f"generated/{name}/{system}"
    synthetic = read_table(ROOT / folder / "admissions.csv")
    committed = json.loads((ROOT / "results" / name / f"{system}.json").read_text())
    card = json.loads(json.dumps(score.scorecard(train, test, synthetic, outcome)))
    for part in ["utility", "fidelity", "privacy", "floor"]:
        assert close(card[part], committed[part]), part
    assert committed["synthetic_sha256"] == split.digest(synthetic)
    assert set(schema.COLUMNS) == set(synthetic.columns)
