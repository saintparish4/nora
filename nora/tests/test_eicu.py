"""`eicu.load` against a hand-written eICU directory small enough to check
by eye. Offsets are minutes from the unit admission, as in eICU."""

import os
from io import StringIO
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from nora import eicu

# Stay 10 has two unit stays: unit 1 begins 60 minutes into the hospital
# stay, unit 2 two days later. Stay 20: pneumonia is the earliest Primary
# diagnosis. Stay 30: over 89, died. Stay 40: the earliest Primary diagnosis
# has no code. Stay 50: discharged before admitted. Stay 60: a child.
PATIENT = """patientunitstayid,patienthealthsystemstayid,uniquepid,unitvisitnumber,gender,age,hospitaladmitoffset,hospitaldischargeoffset,hospitaladmitsource,hospitaldischargelocation,hospitaldischargestatus
1,10,A,1,Male,70,-60,5700,Emergency Department,Home,Alive
2,10,A,2,Male,70,-2940,2820,Emergency Department,Home,Alive
3,20,B,1,Female,55,-10,3000,Floor,Home,Alive
4,30,C,1,Female,> 89,-30,1410,,Death,Expired
5,40,D,1,Male,60,-10,3000,Direct Admit,Home,Alive
6,50,E,1,Male,60,100,50,Direct Admit,Home,Alive
7,60,F,1,Female,12,-10,3000,Emergency Department,Home,Alive
"""

DIAGNOSIS = """diagnosisid,patientunitstayid,diagnosisoffset,diagnosisstring,icd9code,diagnosispriority
1,1,30,heart failure,"428.0, I50.9",Primary
2,1,10,hypertension,"401.9, I10",Other
3,2,5,atrial fibrillation,"427.31, I48.0",Primary
4,2,6,ckd,"585.9, N18.9",Major
5,3,20,pneumonia,"486, J18.9",Primary
6,3,40,heart failure,"428.0, I50.9",Primary
7,4,15,myocardial infarction,410.71,Primary
8,5,10,chest pain,,Primary
9,5,90,heart failure,"428.0, I50.9",Primary
10,6,10,heart failure,"428.0, I50.9",Primary
11,7,10,heart failure,"428.0, I50.9",Primary
"""

# Stay 10's last creatinine is the 1.4 from its second unit stay; the 9.9 is
# after hospital discharge and the first row is before admission.
LAB = """patientunitstayid,labname,labresult,labresultoffset
1,creatinine,3.0,-120
1,creatinine,2.2,100
2,creatinine,1.4,600
2,creatinine,9.9,5000
1,BUN,40,100
1,Hgb,10.5,100
1,glucose,180,100
4,sodium,131,60
4,potassium,,60
"""


@pytest.fixture
def table(tmp_path):
    for name, text in {"patient": PATIENT, "diagnosis": DIAGNOSIS, "lab": LAB}.items():
        pd.read_csv(StringIO(text), dtype=str).to_csv(tmp_path / f"{name}.csv.gz", index=False)
    return eicu.load(tmp_path, "toy").set_index("admission_id")


def test_icd_cells_split_into_codes_with_their_revision():
    assert eicu.icd("428.0, I50.9") == [("4280", 9), ("I509", 10)]
    assert eicu.icd("V45.81") == [("V4581", 9)]
    assert eicu.icd("E11.9") == [("E119", 10)]
    assert eicu.icd(np.nan) == []


def test_the_cohort_is_chosen_by_the_earliest_primary_diagnosis(table):
    assert sorted(table.index) == ["10", "30"]


def test_a_hospital_stay_is_one_admission_however_many_unit_stays_it_has(table):
    assert table.loc["10", "los_days"] == pytest.approx(5760 / 1440)
    assert table.loc["10", "patient_id"] == "A"
    assert table.loc["10", ["hypertension", "afib", "ckd", "diabetes"]].tolist() == [1, 1, 1, 0]


def test_what_eicu_cannot_supply_is_missing(table):
    assert table["readmit_30d"].isna().all() and table["prior_admissions_365d"].isna().all()
    assert np.isnan(table.loc["30", "emergency"])


def test_admission_fields_map_to_flags(table):
    assert table.loc[
        "10", ["male", "emergency", "discharged_home", "died_in_hospital"]
    ].tolist() == [
        1,
        1,
        1,
        0,
    ]
    assert table.loc["30", ["male", "discharged_home", "died_in_hospital"]].tolist() == [0, 0, 1]
    assert table["dx_group"].to_dict() == {"10": "heart_failure", "30": "ischemic"}


def test_an_age_over_89_is_recorded_as_90(table):
    assert table.loc["30", "age"] == 90


def test_a_lab_is_the_last_result_between_admission_and_discharge(table):
    assert table.loc["10", ["creatinine", "bun", "hemoglobin"]].tolist() == [1.4, 40, 10.5]
    assert table.loc["30", "sodium"] == 131 and np.isnan(table.loc["30", "potassium"])


@pytest.mark.skipif("NORA_EICU_DEMO" not in os.environ, reason="set NORA_EICU_DEMO")
def test_the_open_demo_maps_to_261_heart_disease_admissions():
    demo = eicu.load(Path(os.environ["NORA_EICU_DEMO"]), "eicu-demo-2.0.1")
    assert (len(demo), demo["patient_id"].nunique()) == (261, 241)
    assert int(demo["died_in_hospital"].sum()) == 26
