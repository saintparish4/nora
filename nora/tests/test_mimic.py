"""`mimic.load` against a hand-written MIMIC-IV directory small enough to
check by eye. Patient 1 has four admissions that exercise every label rule;
patients 2 to 4 each cover one exclusion or edge."""

import os
from io import StringIO
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from nora import mimic

PATIENTS = """subject_id,gender,anchor_age,anchor_year
1,M,70,2150
2,F,55,2160
3,F,80,2140
4,M,60,2155
"""

# hadm 100: heart failure, home, readmitted 9 days later by hadm 101
# hadm 101: heart failure again, then only a PLANNED admission (102) follows
# hadm 102: elective valve surgery; next admission is 400 days later
# hadm 103: ischemic; last one for the patient
# hadm 200: pneumonia is primary, heart failure secondary -> not in the cohort
# hadm 300: heart attack, died in hospital -> no readmission label
# hadm 400: discharge before admission -> data error, dropped
ADMISSIONS = """subject_id,hadm_id,admittime,dischtime,admission_type,discharge_location,hospital_expire_flag
1,100,2151-03-01 10:00:00,2151-03-05 10:00:00,EW EMER.,HOME,0
1,101,2151-03-14 08:00:00,2151-03-20 20:00:00,URGENT,SKILLED NURSING FACILITY,0
1,102,2151-04-02 07:00:00,2151-04-09 07:00:00,ELECTIVE,HOME HEALTH CARE,0
1,103,2152-05-14 07:00:00,2152-05-16 07:00:00,EW EMER.,,0
2,200,2161-01-10 00:00:00,2161-01-15 00:00:00,EW EMER.,HOME,0
3,300,2141-06-01 00:00:00,2141-06-03 12:00:00,DIRECT EMER.,DIED,1
4,400,2156-02-02 00:00:00,2156-02-01 00:00:00,EW EMER.,HOME,0
"""

DIAGNOSES = """subject_id,hadm_id,seq_num,icd_code,icd_version
1,100,1,I5023,10
1,100,2,N183,10
1,100,3,E1165,10
1,101,1,4280,9
1,101,2,42731,9
1,102,1,I350,10
1,103,1,I2510,10
1,103,2,I10,10
2,200,1,J189,10
2,200,2,I5023,10
3,300,1,I214,10
3,300,2,J449,10
4,400,1,I5023,10
"""

# For hadm 100 the last creatinine is 1.9 (the 03-04 result), not the
# earlier 2.4 and not the later row that has no numeric value.
LABS = """hadm_id,itemid,charttime,valuenum
100,50912,2151-03-01 12:00:00,2.4
100,50912,2151-03-04 06:00:00,1.9
100,50912,2151-03-05 06:00:00,
100,51006,2151-03-04 06:00:00,41
100,50983,2151-03-04 06:00:00,133
100,50971,2151-03-04 06:00:00,4.6
100,51222,2151-03-04 06:00:00,10.2
100,50931,2151-03-04 06:00:00,180
101,50912,2151-03-19 06:00:00,1.5
300,50912,2141-06-02 06:00:00,1.1
,50912,2151-03-02 06:00:00,9.9
"""


@pytest.fixture
def table(tmp_path):
    hosp = tmp_path / "hosp"
    hosp.mkdir()
    files = {
        "patients": PATIENTS,
        "admissions": ADMISSIONS,
        "diagnoses_icd": DIAGNOSES,
        "labevents": LABS,
    }
    for name, text in files.items():
        pd.read_csv(StringIO(text), dtype={"icd_code": str}).to_csv(
            hosp / f"{name}.csv.gz", index=False
        )
    return mimic.load(tmp_path, "toy").set_index("admission_id")


def test_cohort_is_chosen_by_primary_diagnosis_and_drops_data_errors(table):
    assert sorted(table.index) == ["100", "101", "102", "103", "300"]


def test_age_is_the_anchor_age_moved_to_the_admission_year(table):
    assert table.loc["100", "age"] == 71
    assert table.loc["103", "age"] == 72


def test_an_unplanned_return_within_30_days_is_a_readmission(table):
    assert table.loc["100", "readmit_30d"] == 1


def test_a_planned_return_within_30_days_is_not_a_readmission(table):
    # 102 starts 12 days after 101 ends, but it is elective.
    assert table.loc["101", "readmit_30d"] == 0


def test_a_return_after_30_days_is_not_a_readmission(table):
    assert table.loc["102", "readmit_30d"] == 0
    assert table.loc["103", "readmit_30d"] == 0


def test_a_death_in_hospital_has_no_readmission_label(table):
    assert table.loc["300", "died_in_hospital"] == 1
    assert np.isnan(table.loc["300", "readmit_30d"])


def test_prior_admissions_count_discharges_in_the_year_before(table):
    assert table["prior_admissions_365d"].to_dict() == {
        "100": 0,
        "101": 1,
        "102": 2,
        "103": 0,
        "300": 0,
    }


def test_diagnosis_groups_and_comorbidities_use_both_icd_revisions(table):
    assert table["dx_group"].to_dict() == {
        "100": "heart_failure",
        "101": "heart_failure",
        "102": "other",
        "103": "ischemic",
        "300": "ischemic",
    }
    assert table.loc["100", ["ckd", "diabetes", "afib"]].tolist() == [1, 1, 0]
    assert table.loc["101", "afib"] == 1
    assert table.loc["103", "hypertension"] == 1
    assert table.loc["300", "copd"] == 1


def test_a_lab_feature_is_the_last_numeric_result_of_the_admission(table):
    assert table.loc["100", "creatinine"] == 1.9
    assert table.loc["100", ["bun", "sodium", "potassium", "hemoglobin"]].tolist() == [
        41,
        133,
        4.6,
        10.2,
    ]
    assert np.isnan(table.loc["101", "bun"])
    assert table[["creatinine"]].loc["103"].isna().all()


def test_admission_fields_map_to_flags(table):
    assert table.loc["100", ["male", "emergency", "discharged_home", "los_days"]].tolist() == [
        1,
        1,
        1,
        4.0,
    ]
    assert table.loc["101", "discharged_home"] == 0
    assert table.loc["102", ["emergency", "discharged_home"]].tolist() == [0, 1]
    # A missing discharge location is not evidence of going home.
    assert table.loc["103", "discharged_home"] == 0


@pytest.mark.skipif("NORA_MIMIC_DEMO" not in os.environ, reason="set NORA_MIMIC_DEMO")
def test_the_open_demo_maps_to_fifty_heart_disease_admissions():
    demo = mimic.load(Path(os.environ["NORA_MIMIC_DEMO"]), "mimic-iv-demo-2.2")
    assert len(demo) == 50
    assert demo["patient_id"].nunique() == 34
    assert int(demo["died_in_hospital"].sum()) == 2
    assert int(demo["readmit_30d"].sum()) == 5
