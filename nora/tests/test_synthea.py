"""`synthea.load` against a hand-written Synthea export small enough to
check by eye. Patient P1 carries the stay-joining and readmission rules;
P2 dies in hospital; P3 is a child."""

from io import StringIO

import numpy as np
import pandas as pd
import pytest

from nora import synthea

PATIENTS = """Id,BIRTHDATE,DEATHDATE,GENDER
P1,1950-01-01,,M
P2,1960-07-15,2020-05-03,F
P3,2010-02-02,,F
"""

# E1 emergency visit, then E2 admission and E3 transfer one hour later: one stay.
# E4 appendicitis 14 days after that stay ends: a readmission, not in the cohort.
# E5 heart attack months later: its own stay, two prior admissions in the year.
# E6 heart attack ending in death. E7 a child. E8 a clinic visit, not a stay.
ENCOUNTERS = """Id,START,STOP,PATIENT,ENCOUNTERCLASS,REASONCODE
E1,2020-01-01T08:00:00Z,2020-01-01T10:00:00Z,P1,emergency,88805009
E2,2020-01-01T10:00:00Z,2020-01-04T10:00:00Z,P1,inpatient,88805009
E3,2020-01-04T11:00:00Z,2020-01-06T10:00:00Z,P1,inpatient,399261000
E4,2020-01-20T00:00:00Z,2020-01-22T00:00:00Z,P1,inpatient,74400008
E5,2020-06-01T00:00:00Z,2020-06-03T12:00:00Z,P1,inpatient,401314000
E6,2020-05-01T00:00:00Z,2020-05-03T06:00:00Z,P2,inpatient,401303003
E7,2021-03-01T00:00:00Z,2021-03-02T00:00:00Z,P3,inpatient,88805009
E8,2020-02-10T09:00:00Z,2020-02-10T09:30:00Z,P1,ambulatory,88805009
"""

# Diabetes is lifelong; hypertension starts between the two stays; atrial
# fibrillation resolved years earlier.
CONDITIONS = """START,STOP,PATIENT,CODE
2015-01-01,,P1,44054006
2020-03-01,,P1,59621000
2010-01-01,2012-01-01,P1,49436004
"""

# The stay's last creatinine is the 1.6 from the transfer (E3), reported
# under the blood code. E5's 66.4 is not a survivable value.
OBSERVATIONS = """DATE,ENCOUNTER,CODE,VALUE
2020-01-02T06:00:00Z,E2,2160-0,2.1
2020-01-05T06:00:00Z,E3,38483-4,1.6
2020-01-02T06:00:00Z,E2,718-7,11.2
2020-01-02T06:00:00Z,E2,2951-2,not done
2020-01-21T06:00:00Z,E4,2160-0,0.9
2020-06-02T06:00:00Z,E5,2160-0,66.4
2020-06-02T06:00:00Z,E5,6298-4,4.4
"""


@pytest.fixture
def table(tmp_path):
    files = {
        "patients": PATIENTS,
        "encounters": ENCOUNTERS,
        "conditions": CONDITIONS,
        "observations": OBSERVATIONS,
    }
    for name, text in files.items():
        pd.read_csv(StringIO(text), dtype=str).to_csv(tmp_path / f"{name}.csv", index=False)
    return synthea.load(tmp_path).set_index("admission_id")


def test_only_adult_stays_that_open_with_a_heart_disease_are_in_the_cohort(table):
    assert sorted(table.index) == ["E2", "E5", "E6"]
    assert table["dx_group"].to_dict() == {
        "E2": "heart_failure",
        "E5": "ischemic",
        "E6": "ischemic",
    }


def test_a_transfer_within_a_day_is_part_of_the_same_stay(table):
    assert table.loc["E2", "los_days"] == 5.0
    assert "E3" not in table.index


def test_a_later_stay_for_any_reason_is_a_readmission(table):
    assert table.loc["E2", "readmit_30d"] == 1
    assert table.loc["E5", "readmit_30d"] == 0


def test_prior_admissions_count_stays_not_encounters(table):
    assert table.loc["E2", "prior_admissions_365d"] == 0
    assert table.loc["E5", "prior_admissions_365d"] == 2


def test_a_death_during_the_stay_has_no_readmission_label(table):
    assert table.loc["E6", "died_in_hospital"] == 1
    assert np.isnan(table.loc["E6", "readmit_30d"])
    assert table.loc["E2", "died_in_hospital"] == 0


def test_an_emergency_visit_just_before_the_stay_marks_it_as_an_emergency(table):
    assert table["emergency"].to_dict() == {"E2": 1, "E5": 0, "E6": 0}


def test_comorbidities_are_the_conditions_active_when_the_stay_begins(table):
    assert table.loc["E2", ["diabetes", "hypertension", "afib"]].tolist() == [1, 0, 0]
    assert table.loc["E5", ["diabetes", "hypertension", "afib"]].tolist() == [1, 1, 0]


def test_labs_are_the_last_numeric_result_of_the_whole_stay_under_either_code(table):
    assert table.loc["E2", "creatinine"] == 1.6
    assert table.loc["E2", "hemoglobin"] == 11.2
    assert np.isnan(table.loc["E2", "sodium"])
    assert table.loc["E5", "potassium"] == 4.4


def test_a_runaway_lab_value_is_blanked_and_counted(table):
    assert np.isnan(table.loc["E5", "creatinine"])
    assert table.attrs["implausible_labs"]["creatinine"] == 1


def test_what_synthea_cannot_supply_is_missing_not_guessed(table):
    assert table["discharged_home"].isna().all()
    assert table.loc["E2", "male"] == 1


def test_age_is_in_completed_years_on_the_day_of_admission(table):
    # P1 turns 70 on the day of the first stay; P2 is still 59 in May 2020.
    assert table["age"].to_dict() == {"E2": 70, "E5": 70, "E6": 59}
