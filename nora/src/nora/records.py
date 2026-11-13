"""An admission as the three files a reader of charts is tested with.

For one table row: the FHIR bundle, the discharge note, and the note's
answer key. `build` refuses to return a record whose bundle does not read
back as exactly the row it came from, so a structured record that
disagrees with its source cannot be written to disk.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from nora import chart, fhir, note, schema


def build(row: pd.Series | dict) -> tuple[dict, str, dict]:
    """Return (bundle, note text, answer key) for one admission table row."""
    row = dict(row)
    drawn = chart.build(row)
    text, key = note.write(drawn)
    bundle = fhir.render(drawn, text)
    back = fhir.read(bundle, row["source"])
    if len(back) != 1:
        raise ValueError(f"{row['admission_id']}: bundle reads back as {len(back)} admissions")
    for column in schema.COLUMNS:
        was, now = row[column], back[0][column]
        same = (pd.isna(was) and pd.isna(now)) or was == now
        # A record holds times to the second, so a stay may differ by under one.
        if not same and not (column == "los_days" and abs(was - now) <= 1 / 86400):
            raise ValueError(f"{row['admission_id']}: {column} is {was} but reads back as {now}")
    return bundle, text, key


def write(table: pd.DataFrame, out: Path) -> int:
    """Write `<admission_id>.json`, `.txt` and `.key.json` for every row."""
    out.mkdir(parents=True, exist_ok=True)
    for _, row in table.iterrows():
        bundle, text, key = build(row)
        stem = out / row["admission_id"]
        stem.with_suffix(".json").write_text(json.dumps(bundle, indent=2) + "\n")
        stem.with_suffix(".txt").write_text(text)
        stem.with_suffix(".key.json").write_text(json.dumps(key, indent=2) + "\n")
    return len(table)
