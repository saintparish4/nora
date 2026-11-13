"""The admission table: the one shape every source is mapped into.

Real data (MIMIC-IV, eICU), the Synthea baseline, and our own generator all
arrive as this table, one row per index admission (PROTOCOL.md section 3).
Scoring only ever sees this shape, so a score compares like with like, and
the later steps of the plan (FHIR bundles, notes, claims) are rendered from
the same columns.

Invariants:
- A column a source cannot supply is present and entirely NaN. It is never
  dropped and never filled with a guess: the scorer counts the gap.
- `conform` is the only way a table enters the pipeline. It raises on any
  value outside the schema, so a mapping bug stops here and not in a score.
- A blood test result outside BOUNDS is the one thing a source is allowed
  to get wrong: real charts hold typing errors and simulators hold runaway
  values. `blank_implausible_labs` turns those into missing values and
  counts them, the same way for every source (PROTOCOL.md section 4).
"""

from __future__ import annotations

import pandas as pd

IDS = ["source", "patient_id", "admission_id"]
NUMERIC = [
    "age",
    "los_days",
    "prior_admissions_365d",
    "creatinine",
    "bun",
    "sodium",
    "potassium",
    "hemoglobin",
]
BINARY = [
    "male",
    "emergency",
    "discharged_home",
    "diabetes",
    "ckd",
    "copd",
    "hypertension",
    "afib",
]
DX_GROUPS = ["ischemic", "heart_failure", "arrhythmia", "other"]
CATEGORICAL = {"dx_group": DX_GROUPS}
FEATURES = NUMERIC + BINARY + list(CATEGORICAL)
LABS = ["creatinine", "bun", "sodium", "potassium", "hemoglobin"]
OUTCOMES = ["died_in_hospital", "readmit_30d"]
COLUMNS = IDS + FEATURES + OUTCOMES

# Plausibility bounds, not clinical reference ranges: a value outside these
# is a unit or mapping error, which is what `conform` exists to catch.
BOUNDS = {
    "age": (18, 120),
    "los_days": (0, 3650),
    "prior_admissions_365d": (0, 365),
    "creatinine": (0.1, 30),
    "bun": (1, 300),
    "sodium": (90, 200),
    "potassium": (1, 12),
    "hemoglobin": (1, 25),
}


def blank_implausible_labs(df: pd.DataFrame) -> pd.DataFrame:
    """Set lab values outside BOUNDS to missing.

    The number blanked per test is left in `.attrs["implausible_labs"]`, so
    whoever reports on the table can say how many there were.
    """
    out = df.copy()
    counts = {}
    for column in LABS:
        low, high = BOUNDS[column]
        bad = (out[column] < low) | (out[column] > high)
        out.loc[bad, column] = float("nan")
        counts[column] = int(bad.sum())
    out.attrs["implausible_labs"] = counts
    return out


def conform(df: pd.DataFrame) -> pd.DataFrame:
    """Return `df` with exactly the schema's columns, order and dtypes.

    Raises ValueError naming the first problem found.
    """
    missing = [c for c in COLUMNS if c not in df.columns]
    extra = [c for c in df.columns if c not in COLUMNS]
    if missing or extra:
        raise ValueError(f"columns do not match the schema: missing {missing}, extra {extra}")

    out = df[COLUMNS].copy()
    for col in IDS:
        out[col] = out[col].astype(str)
    for col in NUMERIC + BINARY + OUTCOMES:
        out[col] = pd.to_numeric(out[col], errors="raise").astype("float64")

    if out["admission_id"].duplicated().any():
        raise ValueError("admission_id is not unique")
    for col in BINARY + OUTCOMES:
        bad = out[col].dropna()
        if not bad.isin([0.0, 1.0]).all():
            raise ValueError(f"{col} must be 0, 1 or missing")
    for col, (low, high) in BOUNDS.items():
        seen = out[col].dropna()
        if ((seen < low) | (seen > high)).any():
            raise ValueError(f"{col} outside [{low}, {high}]: min {seen.min()}, max {seen.max()}")
    unknown = set(out["dx_group"].dropna()) - set(DX_GROUPS)
    if unknown or out["dx_group"].isna().any():
        raise ValueError(f"dx_group must be one of {DX_GROUPS}, got {sorted(unknown)} or missing")
    died = out["died_in_hospital"] == 1
    if out.loc[died, "readmit_30d"].notna().any():
        raise ValueError("readmit_30d must be missing when the patient died in hospital")
    return out.reset_index(drop=True)


def task_frame(df: pd.DataFrame, outcome: str) -> pd.DataFrame:
    """Rows eligible for a prediction task: those whose outcome is known."""
    if outcome not in OUTCOMES:
        raise ValueError(f"unknown outcome {outcome!r}")
    return df[df[outcome].notna()].reset_index(drop=True)
