"""Synthea's CSV export -> the admission table.

Synthea is the baseline every generator of ours has to beat (PROTOCOL.md
section 10). It simulates whole lives from published disease models and has
never seen MIMIC-IV, so it is free to share and cannot leak a real patient.
This module maps its hospital stays into the admission table by the same
rules `mimic` applies to real data, so the scorer compares like with like.

Three places where Synthea's shape differs from a hospital's records, and
what this module does about each:

- One hospital stay is often several encounters in a row (admission, a
  transfer to intensive care, a ward). Inpatient encounters of one patient
  that start within 24 hours of the previous one ending are joined into one
  stay. Without this every transfer would count as a readmission.
- A stay has no billing diagnosis, only a SNOMED "reason" on each encounter.
  The stay is in the cohort when the reason of its first encounter is one of
  the heart diseases in HEART, each mapped to the ICD-10 category that puts
  it inside the protocol's definition.
- Nothing says where the patient went afterwards or whether a later
  admission was planned. `discharged_home` is therefore left missing, and
  every later inpatient stay counts as a readmission.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from nora import schema

# SNOMED reason -> diagnosis group. The comment is the ICD-10 category that
# places the reason inside "diseases of heart" (I00-I09, I11, I13, I20-I51).
HEART = {
    "88805009": "heart_failure",  # Chronic congestive heart failure, I50
    "401314000": "ischemic",  # Acute non-ST elevation myocardial infarction, I21
    "401303003": "ischemic",  # Acute ST elevation myocardial infarction, I21
    "22298006": "ischemic",  # Myocardial infarction, I21
    "4557003": "ischemic",  # Preinfarction syndrome (unstable angina), I20
    "49436004": "arrhythmia",  # Atrial fibrillation, I48
    "60573004": "other",  # Aortic valve stenosis, I35
    "60234000": "other",  # Aortic valve regurgitation, I35
}

COMORBIDITIES = {
    "diabetes": {"44054006", "427089005"},
    "ckd": {"431855005", "431856006", "433144002", "431857002", "46177005"},
    "copd": {"185086009", "87433001"},
    "hypertension": {"59621000"},
    "afib": {"49436004"},
}

# Synthea reports the same test under a blood code and a serum code.
LABS = {
    "2160-0": "creatinine",
    "38483-4": "creatinine",
    "3094-0": "bun",
    "6299-2": "bun",
    "2951-2": "sodium",
    "2947-0": "sodium",
    "2823-3": "potassium",
    "6298-4": "potassium",
    "718-7": "hemoglobin",
}

DAY = pd.Timedelta(days=1)


def load(root: Path | str, source: str = "synthea") -> pd.DataFrame:
    """Build the admission table from a Synthea `csv` output directory."""
    root = Path(root)
    patients = pd.read_csv(root / "patients.csv", parse_dates=["BIRTHDATE", "DEATHDATE"])
    encounters = pd.read_csv(root / "encounters.csv", dtype={"REASONCODE": str})
    for column in ("START", "STOP"):
        encounters[column] = pd.to_datetime(encounters[column], utc=True).dt.tz_localize(None)

    stays = _stays(encounters[encounters["ENCOUNTERCLASS"] == "inpatient"])
    cohort = stays[stays["REASONCODE"].isin(HEART)].merge(
        patients[["Id", "BIRTHDATE", "DEATHDATE", "GENDER"]], left_on="PATIENT", right_on="Id"
    )
    # Age in completed years: one less than the year gap until the birthday.
    start, born = cohort["START"], cohort["BIRTHDATE"]
    before_birthday = (start.dt.month * 100 + start.dt.day) < (born.dt.month * 100 + born.dt.day)
    cohort["age"] = start.dt.year - born.dt.year - before_birthday.astype(int)
    cohort = cohort[cohort["age"] >= 18].reset_index(drop=True)

    died = cohort["DEATHDATE"].between(cohort["START"].dt.normalize(), cohort["STOP"] + DAY)
    out = pd.DataFrame(
        {
            "source": source,
            "patient_id": cohort["PATIENT"],
            "admission_id": cohort["STAY"],
            "age": cohort["age"],
            "los_days": (cohort["STOP"] - cohort["START"]) / DAY,
            "prior_admissions_365d": _nearby(cohort, stays, before=365),
            "male": (cohort["GENDER"] == "M").astype(float),
            "emergency": _came_through_emergency(cohort, encounters),
            "discharged_home": np.nan,
            "dx_group": cohort["REASONCODE"].map(HEART),
            "died_in_hospital": died.astype(float),
            "readmit_30d": (_nearby(cohort, stays, after=30) > 0).astype(float),
        }
    )
    out.loc[out["died_in_hospital"] == 1, "readmit_30d"] = np.nan
    out = out.join(_comorbidities(root / "conditions.csv", cohort))
    out = out.join(_last_labs(root / "observations.csv", stays, cohort))
    return schema.conform(schema.blank_implausible_labs(out))


def _stays(inpatient: pd.DataFrame) -> pd.DataFrame:
    """Join each patient's back-to-back inpatient encounters into stays."""
    enc = inpatient.sort_values(["PATIENT", "START", "STOP"]).reset_index(drop=True)
    latest_stop = enc.groupby("PATIENT")["STOP"].cummax()
    previous_stop = latest_stop.groupby(enc["PATIENT"]).shift()
    new_stay = previous_stop.isna() | (enc["START"] - previous_stop > DAY)
    enc["STAY"] = enc["Id"].where(new_stay).ffill()
    stays = enc.groupby("STAY", sort=False).agg(
        PATIENT=("PATIENT", "first"),
        REASONCODE=("REASONCODE", "first"),
        START=("START", "min"),
        STOP=("STOP", "max"),
        ENCOUNTERS=("Id", list),
    )
    return stays.reset_index()


def _nearby(
    cohort: pd.DataFrame, stays: pd.DataFrame, before: int = 0, after: int = 0
) -> np.ndarray:
    """How many other stays of the patient ended in the `before` days before
    each cohort stay began, or began in the `after` days after it ended."""
    pairs = cohort[["STAY", "PATIENT", "START", "STOP"]].merge(
        stays[["PATIENT", "START", "STOP"]], on="PATIENT", suffixes=("", "_other")
    )
    if before:
        gap = pairs["START"] - pairs["STOP_other"]
        near = (gap > pd.Timedelta(0)) & (gap <= before * DAY)
    else:
        gap = pairs["START_other"] - pairs["STOP"]
        near = (gap > pd.Timedelta(0)) & (gap <= after * DAY)
    counts = pairs[near].groupby("STAY").size()
    return cohort["STAY"].map(counts).fillna(0).to_numpy(dtype=float)


def _came_through_emergency(cohort: pd.DataFrame, encounters: pd.DataFrame) -> np.ndarray:
    """1 when an emergency department visit ended in the day before the stay."""
    emergency = encounters.loc[encounters["ENCOUNTERCLASS"] == "emergency", ["PATIENT", "STOP"]]
    pairs = cohort[["STAY", "PATIENT", "START"]].merge(emergency, on="PATIENT")
    gap = pairs["START"] - pairs["STOP"]
    through = pairs[(gap >= -DAY) & (gap <= DAY)]["STAY"].unique()
    return cohort["STAY"].isin(through).to_numpy(dtype=float)


def _comorbidities(path: Path, cohort: pd.DataFrame) -> pd.DataFrame:
    conditions = pd.read_csv(path, dtype={"CODE": str}, parse_dates=["START", "STOP"])
    pairs = cohort[["STAY", "PATIENT", "START"]].merge(
        conditions[["PATIENT", "START", "STOP", "CODE"]], on="PATIENT", suffixes=("", "_condition")
    )
    began = pairs["START_condition"] <= pairs["START"]
    ongoing = pairs["STOP"].isna() | (pairs["STOP"] >= pairs["START"].dt.normalize())
    active = pairs[began & ongoing]
    return pd.DataFrame(
        {
            name: cohort["STAY"].isin(active.loc[active["CODE"].isin(snomed), "STAY"]).astype(float)
            for name, snomed in COMORBIDITIES.items()
        }
    )


def _last_labs(path: Path, stays: pd.DataFrame, cohort: pd.DataFrame) -> pd.DataFrame:
    """The last numeric result of each test recorded during the stay."""
    of_stay = stays[stays["STAY"].isin(cohort["STAY"])].explode("ENCOUNTERS")
    stay_of = dict(zip(of_stay["ENCOUNTERS"], of_stay["STAY"], strict=True))
    kept = []
    columns = ["DATE", "ENCOUNTER", "CODE", "VALUE"]
    for chunk in pd.read_csv(path, usecols=columns, dtype=str, chunksize=2_000_000):
        kept.append(chunk[chunk["CODE"].isin(LABS) & chunk["ENCOUNTER"].isin(stay_of)])
    labs = pd.concat(kept)
    labs = labs.assign(
        STAY=labs["ENCOUNTER"].map(stay_of),
        name=labs["CODE"].map(LABS),
        value=pd.to_numeric(labs["VALUE"], errors="coerce"),
    ).dropna(subset="value")
    last = labs.sort_values("DATE").groupby(["STAY", "name"])["value"].last().unstack("name")
    names = list(dict.fromkeys(LABS.values()))
    return last.reindex(columns=names).reindex(cohort["STAY"].to_numpy()).reset_index(drop=True)
