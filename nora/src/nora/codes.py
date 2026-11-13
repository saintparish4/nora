"""Which diagnosis codes count, and how they are grouped.

PROTOCOL.md section 2 defines the cohort as "diseases of heart" in the sense
the US National Center for Health Statistics uses for its leading-causes
tables: ICD-10 I00-I09, I11, I13, I20-I51. That list is NCHS's, not ours, so
the cohort is not a choice we can tune after seeing results. The ICD-9 range
(390-398, 402, 404, 410-429) is the same definition in the older revision.
MIMIC-IV carries both revisions, so every function here takes the version.

Codes arrive the way MIMIC-IV stores them: upper case, no decimal point
("I5023", "4280").

The comorbidity lists are deliberately short prefix lists, not the full
Elixhauser or Charlson definitions. Swapping those in is listed in the
guide's "left for later"; it changes values, not the table's shape.
"""

from __future__ import annotations

HEART_FAILURE_10 = ("I50", "I110", "I130", "I132")
HEART_FAILURE_9 = (
    "428",
    "40201",
    "40211",
    "40291",
    "40401",
    "40403",
    "40411",
    "40413",
    "40491",
    "40493",
)

COMORBIDITIES = {
    "diabetes": {10: ("E08", "E09", "E10", "E11", "E13"), 9: ("250",)},
    "ckd": {10: ("N18",), 9: ("585",)},
    "copd": {10: ("J43", "J44"), 9: ("491", "492", "496")},
    "hypertension": {
        10: ("I10", "I11", "I12", "I13", "I15", "I16"),
        9: ("401", "402", "403", "404", "405"),
    },
    "afib": {10: ("I48",), 9: ("4273",)},
}

# MIMIC-IV `d_labitems.itemid` for the blood test of each name.
MIMIC_LAB_ITEMS = {
    "creatinine": 50912,
    "bun": 51006,
    "sodium": 50983,
    "potassium": 50971,
    "hemoglobin": 51222,
}


def _chapter(code: str, version: int) -> int | None:
    """The numeric three-character category, or None when it is not one."""
    if version == 10:
        return int(code[1:3]) if code[:1] == "I" and code[1:3].isdigit() else None
    return int(code[:3]) if code[:3].isdigit() else None


def is_heart_disease(code: str, version: int) -> bool:
    n = _chapter(code, version)
    if n is None:
        return False
    if version == 10:
        return n <= 9 or n in (11, 13) or 20 <= n <= 51
    return 390 <= n <= 398 or n in (402, 404) or 410 <= n <= 429


def dx_group(code: str, version: int) -> str:
    """Group a heart disease code. Heart failure is checked first because
    hypertensive heart disease with failure (I11.0) is how ICD-10 codes most
    heart failure admissions, and it would otherwise fall into "other"."""
    if not is_heart_disease(code, version):
        raise ValueError(f"{code!r} (ICD-{version}) is not a heart disease code")
    n = _chapter(code, version)
    if version == 10:
        if code.startswith(HEART_FAILURE_10):
            return "heart_failure"
        if 20 <= n <= 25:
            return "ischemic"
        if 44 <= n <= 49:
            return "arrhythmia"
        return "other"
    if code.startswith(HEART_FAILURE_9):
        return "heart_failure"
    if 410 <= n <= 414:
        return "ischemic"
    if n in (426, 427):
        return "arrhythmia"
    return "other"


def has_comorbidity(name: str, code: str, version: int) -> bool:
    return code.startswith(COMORBIDITIES[name][version])
