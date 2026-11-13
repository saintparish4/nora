"""One admission as a chart: the table row plus the details a record needs.

The admission table (PROTOCOL.md section 3) says a patient is 71, has heart
failure and went home after 4.2 days. A FHIR bundle and a discharge note
need more than that: a name, dates, a specific ICD-10-CM code, the earlier
admissions that `prior_admissions_365d` counts. `build` adds those details,
and both `fhir` and `note` render from the result, so the structured record
and the note cannot disagree.

Every added detail is a pure function of the row (a hash of the admission
id picks among options), so rendering needs no random state and the same
row always gives the same chart. Nothing here changes a fact the table
states: `fhir.read` turns a rendered bundle back into the identical row,
and the tests check that for every generated admission.

Codes follow ICD-10-CM's own combination rules, because conflicting codes
are a defect to be injected later on purpose, not one to ship by accident:
heart failure with hypertension is coded I11.0 first (I13.0 when chronic
kidney disease is also present), and hypertension with chronic kidney
disease is I12.9, not I10.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import pandas as pd

from nora import codes, schema

YEAR = 2025  # every index admission starts in this year; it has no 29 February
GIVEN = {
    1: [
        "Alden",
        "Bram",
        "Cyrus",
        "Dorian",
        "Emmett",
        "Felix",
        "Gideon",
        "Hollis",
        "Ivor",
        "Jasper",
    ],
    0: ["Adela", "Blythe", "Cora", "Delphine", "Edith", "Flora", "Greta", "Hester", "Iris", "June"],
}
FAMILY = ["Ashdown", "Birchall", "Corvane", "Dunmere", "Eastlake", "Fenwick", "Garrow", "Holloway"]
FAMILY += [
    "Ivesdale",
    "Kestrel",
    "Larkspur",
    "Merrow",
    "Northcote",
    "Oakhurst",
    "Pellham",
    "Quillon",
]

PRIMARY = {
    "heart_failure": [
        ("I50.9", "Heart failure"),
        ("I50.23", "Acute on chronic systolic heart failure"),
        ("I50.33", "Acute on chronic diastolic heart failure"),
    ],
    "ischemic": [
        ("I21.4", "Non-ST elevation myocardial infarction"),
        ("I25.10", "Coronary artery disease"),
        ("I20.0", "Unstable angina"),
    ],
    "arrhythmia": [
        ("I49.9", "Cardiac arrhythmia"),
        ("I44.2", "Complete atrioventricular block"),
        ("I49.5", "Sick sinus syndrome"),
    ],
    "other": [
        ("I35.0", "Aortic valve stenosis"),
        ("I42.0", "Dilated cardiomyopathy"),
        ("I26.99", "Pulmonary embolism"),
    ],
}
AFIB = [("I48.91", "Atrial fibrillation"), ("I48.0", "Paroxysmal atrial fibrillation")]
# A plain name for each comorbidity, used by the note when it is absent.
NAMES = {
    "diabetes": "diabetes",
    "ckd": "chronic kidney disease",
    "copd": "COPD",
    "hypertension": "hypertension",
    "afib": "atrial fibrillation",
}
LABS = {  # column: (LOINC code, LOINC name, label in a note, UCUM unit)
    "creatinine": ("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", "Creatinine", "mg/dL"),
    "bun": ("3094-0", "Urea nitrogen [Mass/volume] in Serum or Plasma", "BUN", "mg/dL"),
    "sodium": ("2951-2", "Sodium [Moles/volume] in Serum or Plasma", "Sodium", "mmol/L"),
    "potassium": ("2823-3", "Potassium [Moles/volume] in Serum or Plasma", "Potassium", "mmol/L"),
    "hemoglobin": ("718-7", "Hemoglobin [Mass/volume] in Blood", "Hemoglobin", "g/dL"),
}


@dataclass
class Diagnosis:
    code: str  # ICD-10-CM, with its decimal point
    text: str  # how a clinician would write it
    flag: str | None = None  # the comorbidity column this diagnosis accounts for


@dataclass
class Stay:
    id: str
    start: datetime
    end: datetime
    planned: bool | None  # None when the table does not say


@dataclass
class Chart:
    row: dict  # the admission table row this chart was built from
    patient_id: str
    given: str
    family: str
    birth_date: date
    index: Stay
    diagnoses: list[Diagnosis]  # the first one is the primary diagnosis
    prior: list[Stay]  # earlier admissions, oldest first
    readmission: Stay | None
    lab_time: datetime

    @property
    def absent(self) -> list[str]:
        """Comorbidity columns the table says the patient does not have."""
        return [c for c in codes.COMORBIDITIES if self.row[c] == 0]


def pick(key: str, purpose: str, n: int) -> int:
    """A stable number in 0..n-1 for this admission and this purpose."""
    return int(hashlib.sha256(f"{purpose}:{key}".encode()).hexdigest()[:8], 16) % n


def _diagnoses(row: dict, key: str) -> list[Diagnosis]:
    has = {c: row[c] == 1 for c in codes.COMORBIDITIES}
    group = row["dx_group"]
    options = AFIB if group == "arrhythmia" and has["afib"] else PRIMARY[group]
    primary = Diagnosis(*options[pick(key, "primary", len(options))])
    out, covered = [primary], set()
    if group == "arrhythmia" and has["afib"]:
        primary.flag = "afib"
        covered.add("afib")
    if group == "heart_failure" and has["hypertension"]:
        # ICD-10-CM codes the hypertensive heart disease first, then the failure.
        if has["ckd"]:
            head = Diagnosis(
                "I13.0", "Hypertensive heart and chronic kidney disease", "hypertension"
            )
        else:
            head = Diagnosis(
                "I11.0", "Hypertensive heart disease with heart failure", "hypertension"
            )
        out, covered = [head, primary], covered | {"hypertension"}
    elif has["hypertension"] and has["ckd"]:
        out.append(Diagnosis("I12.9", "Hypertensive chronic kidney disease", "hypertension"))
        covered.add("hypertension")
    plain = {
        "hypertension": ("I10", "Hypertension"),
        "ckd": ("N18.9", "Chronic kidney disease"),
        "diabetes": ("E11.22", "Type 2 diabetes mellitus with diabetic chronic kidney disease")
        if has["ckd"]
        else ("E11.9", "Type 2 diabetes mellitus"),
        "copd": ("J44.9", "Chronic obstructive pulmonary disease"),
        "afib": AFIB[0],
    }
    for column, (code, text) in plain.items():
        if has[column] and column not in covered:
            out.append(Diagnosis(code, text, column))
    return out


def build(row: pd.Series | dict) -> Chart:
    row = dict(row)
    for column in ["age", "los_days", "prior_admissions_365d", "male", "died_in_hospital"]:
        if pd.isna(row[column]):
            raise ValueError(f"cannot render admission {row['admission_id']}: {column} is missing")
    for column in codes.COMORBIDITIES:
        if pd.isna(row[column]):
            raise ValueError(f"cannot render admission {row['admission_id']}: {column} is missing")
    key = row["admission_id"]
    minute = timedelta(minutes=1)
    start = datetime(YEAR, 1, 1) + pick(key, "start", 365 * 1440) * minute
    end = start + timedelta(seconds=round(row["los_days"] * 86400))
    planned = None if pd.isna(row["emergency"]) else row["emergency"] == 0
    birthday = start.date().replace(year=start.year - int(row["age"]))
    birth_date = birthday - timedelta(days=pick(key, "birth", 365))

    count = int(row["prior_admissions_365d"])
    spacing = 365 / (count + 1)
    slack = max(1, int(spacing / 3))  # keeps every earlier stay clear of its neighbours
    prior = []
    for i in range(count):
        gap = (count - i) * spacing - pick(key, f"gap{i}", slack)
        stop = start - timedelta(days=gap, minutes=pick(key, f"gapminutes{i}", 1440))
        length = timedelta(days=1 + pick(key, f"priorlength{i}", min(5, slack)))
        prior.append(Stay(f"{key}-prior{i + 1}", stop - length, stop, planned=False))

    readmission = None
    if row["readmit_30d"] == 1:
        back = end + timedelta(
            days=1 + pick(key, "back", 28), minutes=pick(key, "backminutes", 1440)
        )
        length = timedelta(days=1 + pick(key, "backlength", 6), minutes=pick(key, "bm", 1440))
        readmission = Stay(f"{key}-readmission", back, back + length, planned=False)

    male = int(row["male"])
    return Chart(
        row=row,
        patient_id=row["patient_id"],
        given=GIVEN[male][pick(key, "given", len(GIVEN[male]))],
        family=FAMILY[pick(key, "family", len(FAMILY))],
        birth_date=birth_date,
        index=Stay(key, start, end, planned),
        diagnoses=_diagnoses(row, key),
        prior=prior,
        readmission=readmission,
        lab_time=end - min(timedelta(hours=6), (end - start) / 2),
    )


def lab_value(row: dict, column: str) -> float | int | None:
    """A lab result as it is written down: 138, not 138.0. None when missing."""
    value = row[column]
    if pd.isna(value):
        return None
    return int(value) if float(value).is_integer() else float(value)


assert set(LABS) == set(schema.LABS)
