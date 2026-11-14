"""What is committed under `generated/` must be what the code produces now."""

import json
from pathlib import Path

import pytest
from test_chart import row

from nora import fhir, records
from nora.cli import read_table

ROOT = Path(__file__).parents[1]
TABLE = ROOT / "generated/mimic-iv-demo-2.2/copula-v2/admissions.csv"
SAMPLE = TABLE.parent / "sample"


def test_the_committed_sample_is_what_the_committed_table_renders_to():
    table = read_table(TABLE)
    names = sorted(p.name for p in SAMPLE.iterdir())
    assert len(names) == 75
    for _, admission in table.head(25).iterrows():
        bundle, text, key = records.build(admission)
        stem = SAMPLE / admission["admission_id"]
        assert json.loads(stem.with_suffix(".json").read_text()) == bundle
        assert stem.with_suffix(".txt").read_text() == text
        assert json.loads(stem.with_suffix(".key.json").read_text()) == key


def test_a_bundle_that_disagrees_with_its_row_is_refused(monkeypatch):
    real = fhir.read
    monkeypatch.setattr(fhir, "read", lambda b, s: [real(b, s)[0] | {"age": 71.0}])
    with pytest.raises(ValueError, match="age is 70.0 but reads back as 71.0"):
        records.build(row())


def test_write_makes_three_files_per_admission(tmp_path):
    import pandas as pd

    assert records.write(pd.DataFrame([row(), row(admission_id="a2")]), tmp_path) == 2
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        "a1.json",
        "a1.key.json",
        "a1.txt",
        "a2.json",
        "a2.key.json",
        "a2.txt",
    ]
