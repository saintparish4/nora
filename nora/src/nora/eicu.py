"""eICU-CRD tables -> the admission table.

The second site (PROTOCOL.md section 11): 208 US hospitals, against
MIMIC-IV's one. eICU records intensive care stays, so every admission here
included time in an intensive care unit, and it stores no dates: times are
minutes from the unit admission. What that allows and what it rules out:

- An admission is a hospital stay (`patienthealthsystemstayid`), which can
  hold several unit stays. Fields of the stay are read from its first unit
  stay; diagnoses and labs come from all of them.
- The primary diagnosis is the earliest one marked "Primary" during the
  hospital stay. A stay whose earliest Primary diagnosis carries no ICD
  code cannot be placed in or out of the cohort, and is left out.
- With no dates, the order of a patient's hospital stays is unknown.
  `readmit_30d` and `prior_admissions_365d` are therefore entirely missing,
  never guessed, and utility on this site is scored on `died_in_hospital`.
- Ages over 89 are masked as "> 89" and are recorded as 90.
- `emergency` is 1 when the hospital admission came through the emergency
  department; `discharged_home` is 1 for a discharge to "Home". Both are
  missing when eICU leaves the field blank.

The same code reads the open demo and the full credentialed release.
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

from nora import codes, schema

LABS = {"creatinine": "creatinine", "BUN": "bun", "sodium": "sodium", "potassium": "potassium"}
LABS["Hgb"] = "hemoglobin"
MINUTES_PER_DAY = 1440
NINTH_REVISION = re.compile(r"^(\d+|E[89]\d\d|V\d\d)(\.\d+)?$")


def icd(text: object) -> list[tuple[str, int]]:
    """The codes in an eICU `icd9code` cell, such as "428.0, I50.9".

    Each comes back the way `codes` expects it: no decimal point, with its
    ICD revision. ICD-9 codes are all digits, or E800 to E999, or V and two
    digits; anything else is ICD-10 (where E11.9 is diabetes).
    """
    if not isinstance(text, str):
        return []
    found = []
    for part in text.split(","):
        code = part.strip().upper()
        if code:
            nine = NINTH_REVISION.match(code) is not None
            found.append((code.replace(".", ""), 9 if nine else 10))
    return found


def _flag(column: pd.Series, yes: str) -> pd.Series:
    """1 where the field equals `yes`, 0 for another value, missing if blank."""
    return (column == yes).astype(float).where(column.notna())


def load(root: Path | str, source: str) -> pd.DataFrame:
    """Build the admission table from a directory of eICU-CRD CSV files."""
    root = Path(root)
    units = pd.read_csv(root / "patient.csv.gz", dtype={"age": str})
    units = units.sort_values(["patienthealthsystemstayid", "unitvisitnumber", "patientunitstayid"])
    stay_of = units.set_index("patientunitstayid")["patienthealthsystemstayid"]
    # Minutes from hospital admission to each unit admission, to put every
    # unit stay of one hospital stay on one clock.
    since_admission = -units.set_index("patientunitstayid")["hospitaladmitoffset"]

    dx = pd.read_csv(root / "diagnosis.csv.gz")
    dx["stay"] = dx["patientunitstayid"].map(stay_of)
    dx["minute"] = dx["diagnosisoffset"] + dx["patientunitstayid"].map(since_admission)
    primary = dx[dx["diagnosispriority"] == "Primary"].sort_values(
        ["stay", "minute", "diagnosisid"]
    )
    primary = primary.drop_duplicates("stay").set_index("stay")["icd9code"].map(icd)
    primary = primary[primary.map(lambda found: bool(found) and codes.is_heart_disease(*found[-1]))]

    first = units.drop_duplicates("patienthealthsystemstayid").set_index(
        "patienthealthsystemstayid"
    )
    cohort = first.loc[first.index.intersection(primary.index)].copy()
    cohort["age"] = pd.to_numeric(cohort["age"].replace("> 89", "90"), errors="coerce")
    los = (cohort["hospitaldischargeoffset"] - cohort["hospitaladmitoffset"]) / MINUTES_PER_DAY
    cohort = cohort[(cohort["age"] >= 18) & (los > 0)]
    los, stays = los[cohort.index], cohort.index

    out = pd.DataFrame(
        {
            "source": source,
            "patient_id": cohort["uniquepid"].astype(str),
            "admission_id": stays.astype(str),
            "age": cohort["age"],
            "los_days": los,
            "prior_admissions_365d": np.nan,
            "male": _flag(cohort["gender"], "Male").where(
                cohort["gender"].isin(["Male", "Female"])
            ),
            "emergency": _flag(cohort["hospitaladmitsource"], "Emergency Department"),
            "discharged_home": _flag(cohort["hospitaldischargelocation"], "Home"),
            # The last code in a cell is the ICD-10 one when both are given.
            "dx_group": [codes.dx_group(*primary[stay][-1]) for stay in stays],
            "died_in_hospital": _flag(cohort["hospitaldischargestatus"], "Expired"),
            "readmit_30d": np.nan,
        }
    )
    listed = dx[dx["stay"].isin(stays)].groupby("stay")["icd9code"].agg(list)
    listed = listed.reindex(stays).map(lambda cells: [c for cell in cells for c in icd(cell)])
    for name in codes.COMORBIDITIES:
        out[name] = [
            float(any(codes.has_comorbidity(name, code, version) for code, version in found))
            for found in listed
        ]
    out = out.join(_last_labs(root / "lab.csv.gz", stay_of, since_admission, cohort))
    return schema.conform(schema.blank_implausible_labs(out))


def _last_labs(path: Path, stay_of: pd.Series, since_admission: pd.Series, cohort: pd.DataFrame):
    """The last numeric result of each test between admission and discharge."""
    columns = ["patientunitstayid", "labname", "labresult", "labresultoffset"]
    kept = []
    for chunk in pd.read_csv(path, usecols=columns, chunksize=2_000_000):
        chunk = chunk[chunk["labname"].isin(LABS) & chunk["labresult"].notna()]
        kept.append(chunk[chunk["patientunitstayid"].map(stay_of).isin(cohort.index)])
    labs = pd.concat(kept)
    labs["stay"] = labs["patientunitstayid"].map(stay_of)
    labs["minute"] = labs["labresultoffset"] + labs["patientunitstayid"].map(since_admission)
    length = (cohort["hospitaldischargeoffset"] - cohort["hospitaladmitoffset"]).reindex(
        labs["stay"]
    )
    labs = labs[(labs["minute"] >= 0) & (labs["minute"].to_numpy() <= length.to_numpy())]
    labs = labs.assign(name=labs["labname"].map(LABS)).sort_values("minute")
    last = labs.groupby(["stay", "name"])["labresult"].last().unstack("name")
    return last.reindex(columns=schema.LABS).reindex(cohort.index)
