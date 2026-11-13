"""The train/test split, and the lock that stops it moving.

PROTOCOL.md section 5: patients, not admissions, are assigned to the test
set, by a hash of the patient id. A hash needs no stored list and no random
state, so the rule written down today gives the same split on the full
MIMIC-IV the day access arrives, and one patient's admissions can never sit
on both sides.

`protocol/lock.json` then records a digest of each dataset's table and of
its test admissions. Once a dataset is locked nothing here will overwrite
its entry: changing the cohort, a feature or the split after results exist
has to show up as a hand edit to a committed file.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pandas as pd

SALT = "nora-protocol-v1"
TEST_PERCENT = 20


def in_test(patient_id: str) -> bool:
    digest = hashlib.sha256(f"{SALT}:{patient_id}".encode()).hexdigest()
    return int(digest[:8], 16) % 100 < TEST_PERCENT


def split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return (train, test). Every admission of a patient lands on one side."""
    test = df["patient_id"].map(in_test)
    return df[~test].reset_index(drop=True), df[test].reset_index(drop=True)


def digest(df: pd.DataFrame) -> str:
    """A sha256 of the table that ignores row order and float noise."""
    ordered = df.sort_values("admission_id")
    text = ordered.to_csv(index=False, float_format="%.6g", lineterminator="\n")
    return hashlib.sha256(text.encode()).hexdigest()


def fingerprint(df: pd.DataFrame, protocol: Path) -> dict:
    _, test = split(df)
    return {
        "protocol_sha256": hashlib.sha256(protocol.read_bytes()).hexdigest(),
        "rows": len(df),
        "table_sha256": digest(df),
        "test_rows": len(test),
        "test_sha256": digest(test),
    }


def lock(df: pd.DataFrame, name: str, lock_path: Path, protocol: Path) -> dict:
    """Record `name` in the lock file. Refuses if it is already there."""
    locks = json.loads(lock_path.read_text()) if lock_path.exists() else {}
    if name in locks:
        raise ValueError(f"{name} is already locked in {lock_path}; a lock is never rewritten")
    locks[name] = fingerprint(df, protocol)
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.write_text(json.dumps(locks, indent=2, sort_keys=True) + "\n")
    return locks[name]


def verify(df: pd.DataFrame, name: str, lock_path: Path, protocol: Path) -> None:
    """Raise ValueError unless `df` and the protocol are what was locked."""
    locks = json.loads(lock_path.read_text()) if lock_path.exists() else {}
    if name not in locks:
        raise ValueError(f"{name} is not locked in {lock_path}; run `nora cohort` first")
    now = fingerprint(df, protocol)
    changed = sorted(key for key, value in locks[name].items() if now[key] != value)
    if changed:
        raise ValueError(f"{name} no longer matches its lock: {', '.join(changed)} changed")
