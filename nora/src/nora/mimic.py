"""MIMIC-IV hospital tables -> the admission table.

Implements the cohort and the labels of PROTOCOL.md sections 2 to 4 for
MIMIC-IV's `hosp` module. The same code reads the open 100-patient demo and
the full credentialed release: only the directory differs.

Rules that are easy to get wrong, each fixed by the protocol:
- The cohort is chosen by the primary diagnosis (`seq_num == 1`) only.
  Comorbidities come from every diagnosis position.
- A readmission is the next admission of the same patient that starts
  within 30 days of discharge and is not planned. An index admission may
  itself be planned. In-hospital deaths have no readmission label.
- A lab feature is the last numeric result charted during the admission. A
  result outside the schema's plausibility bounds is blanked and counted.
- Admissions whose discharge is not after their admission are data errors
  and are dropped.

`labevents` is read in chunks because the full file is over a hundred
million rows; nothing else here is large.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from nora import codes, schema

PLANNED = {"ELECTIVE", "SURGICAL SAME DAY ADMISSION"}
EMERGENCY = {"EW EMER.", "DIRECT EMER.", "URGENT"}
HOME = {"HOME", "HOME HEALTH CARE"}
DAY = pd.Timedelta(days=1)


def load(root: Path | str, source: str) -> pd.DataFrame:
    """Build the admission table from a MIMIC-IV directory containing `hosp/`."""
    hosp = Path(root) / "hosp"
    patients = pd.read_csv(hosp / "patients.csv.gz")
    adm = pd.read_csv(hosp / "admissions.csv.gz", parse_dates=["admittime", "dischtime"])
    dx = pd.read_csv(hosp / "diagnoses_icd.csv.gz", dtype={"icd_code": str})
    dx["icd_code"] = dx["icd_code"].str.strip().str.upper()

    adm = adm[adm["dischtime"] > adm["admittime"]].copy()
    cohort = _index_admissions(adm, dx).merge(patients, on="subject_id", how="left")
    cohort["age"] = cohort["anchor_age"] + cohort["admittime"].dt.year - cohort["anchor_year"]
    cohort = cohort[cohort["age"] >= 18].copy()

    out = pd.DataFrame(
        {
            "source": source,
            "patient_id": cohort["subject_id"].astype(str),
            "admission_id": cohort["hadm_id"].astype(str),
            "age": cohort["age"],
            "los_days": (cohort["dischtime"] - cohort["admittime"]) / DAY,
            "male": (cohort["gender"] == "M").astype(float),
            "emergency": cohort["admission_type"].isin(EMERGENCY).astype(float),
            "discharged_home": cohort["discharge_location"].isin(HOME).astype(float),
            "dx_group": cohort["dx_group"],
            "died_in_hospital": cohort["hospital_expire_flag"].astype(float),
        }
    )
    out["prior_admissions_365d"] = _prior_admissions(cohort, adm)
    out["readmit_30d"] = _readmitted(cohort, adm)
    out.loc[out["died_in_hospital"] == 1, "readmit_30d"] = np.nan

    hadm = cohort["hadm_id"]
    out = out.join(_comorbidities(dx, hadm).set_axis(out.index))
    out = out.join(_last_labs(hosp / "labevents.csv.gz", hadm).set_axis(out.index))
    return schema.conform(schema.blank_implausible_labs(out))


def _each(rule, dx: pd.DataFrame) -> list:
    """Apply a `(code, version)` rule from `codes` to every diagnosis row."""
    return [rule(c, v) for c, v in zip(dx["icd_code"], dx["icd_version"], strict=True)]


def _index_admissions(adm: pd.DataFrame, dx: pd.DataFrame) -> pd.DataFrame:
    primary = dx[dx["seq_num"] == 1]
    heart = [
        codes.is_heart_disease(c, v)
        for c, v in zip(primary["icd_code"], primary["icd_version"], strict=True)
    ]
    primary = primary[heart].drop_duplicates("hadm_id")
    groups = [
        codes.dx_group(c, v)
        for c, v in zip(primary["icd_code"], primary["icd_version"], strict=True)
    ]
    primary = primary.assign(dx_group=groups)[["hadm_id", "dx_group"]]
    cohort = adm.merge(primary, on="hadm_id", how="inner")
    return cohort.sort_values(["subject_id", "admittime"]).reset_index(drop=True)


def _prior_admissions(cohort: pd.DataFrame, adm: pd.DataFrame) -> np.ndarray:
    """Admissions of the same patient discharged in the 365 days before this one."""
    pairs = cohort[["hadm_id", "subject_id", "admittime"]].merge(
        adm[["subject_id", "dischtime"]], on="subject_id", suffixes=("", "_other")
    )
    gap = pairs["admittime"] - pairs["dischtime"]
    prior = pairs[(gap > pd.Timedelta(0)) & (gap <= 365 * DAY)].groupby("hadm_id").size()
    return cohort["hadm_id"].map(prior).fillna(0).to_numpy(dtype=float)


def _readmitted(cohort: pd.DataFrame, adm: pd.DataFrame) -> np.ndarray:
    unplanned = adm[~adm["admission_type"].isin(PLANNED)]
    pairs = cohort[["hadm_id", "subject_id", "dischtime"]].merge(
        unplanned[["subject_id", "admittime"]], on="subject_id", suffixes=("", "_next")
    )
    gap = pairs["admittime"] - pairs["dischtime"]
    back = pairs[(gap > pd.Timedelta(0)) & (gap <= 30 * DAY)]["hadm_id"].unique()
    return cohort["hadm_id"].isin(back).to_numpy(dtype=float)


def _comorbidities(dx: pd.DataFrame, hadm: pd.Series) -> pd.DataFrame:
    dx = dx[dx["hadm_id"].isin(hadm)]
    flags = {}
    for name in codes.COMORBIDITIES:
        hit = _each(lambda code, version, name=name: codes.has_comorbidity(name, code, version), dx)
        flags[name] = hadm.isin(dx.loc[hit, "hadm_id"]).to_numpy(dtype=float)
    return pd.DataFrame(flags)


def _last_labs(path: Path, hadm: pd.Series) -> pd.DataFrame:
    items = {itemid: name for name, itemid in codes.MIMIC_LAB_ITEMS.items()}
    wanted = set(hadm)
    kept = []
    columns = ["hadm_id", "itemid", "charttime", "valuenum"]
    for chunk in pd.read_csv(path, usecols=columns, chunksize=2_000_000):
        keep = chunk["itemid"].isin(items) & chunk["hadm_id"].isin(wanted)
        kept.append(chunk[keep & chunk["valuenum"].notna()])
    labs = pd.concat(kept).sort_values("charttime")
    last = labs.groupby(["hadm_id", "itemid"])["valuenum"].last().unstack("itemid")
    last = last.rename(columns=items).reindex(columns=list(items.values()))
    return last.reindex(hadm.to_numpy()).reset_index(drop=True)
