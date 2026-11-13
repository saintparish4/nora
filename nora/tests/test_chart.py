from datetime import timedelta

import numpy as np
import pytest

from nora import chart


def row(**changes):
    base = {
        "source": "test",
        "patient_id": "p1",
        "admission_id": "a1",
        "age": 70.0,
        "los_days": 4.5,
        "prior_admissions_365d": 0.0,
        "creatinine": 1.2,
        "bun": 22.0,
        "sodium": 138.0,
        "potassium": 4.1,
        "hemoglobin": 12.5,
        "male": 1.0,
        "emergency": 1.0,
        "discharged_home": 1.0,
        "diabetes": 0.0,
        "ckd": 0.0,
        "copd": 0.0,
        "hypertension": 0.0,
        "afib": 0.0,
        "dx_group": "heart_failure",
        "died_in_hospital": 0.0,
        "readmit_30d": 0.0,
    }
    return base | changes


def icd(**changes):
    return [dx.code for dx in chart.build(row(**changes)).diagnoses]


def test_the_same_row_always_gives_the_same_chart():
    assert chart.build(row()) == chart.build(row())
    assert chart.build(row()).index.start != chart.build(row(admission_id="a2")).index.start


def test_heart_failure_with_hypertension_is_coded_as_hypertensive_heart_disease_first():
    assert icd(hypertension=1)[0] == "I11.0"
    assert icd(hypertension=1)[1].startswith("I50")
    assert "I10" not in icd(hypertension=1)


def test_adding_kidney_disease_changes_the_combination_code():
    assert icd(hypertension=1, ckd=1)[0] == "I13.0"
    assert "N18.9" in icd(hypertension=1, ckd=1)
    assert icd(dx_group="ischemic", hypertension=1, ckd=1)[1:] == ["I12.9", "N18.9"]
    assert icd(dx_group="ischemic", hypertension=1)[1:] == ["I10"]


def test_diabetes_with_kidney_disease_uses_the_diabetic_kidney_disease_code():
    assert "E11.22" in icd(diabetes=1, ckd=1)
    assert "E11.9" in icd(diabetes=1)


def test_atrial_fibrillation_is_primary_only_for_an_arrhythmia_admission():
    assert icd(dx_group="arrhythmia", afib=1)[0].startswith("I48")
    assert not icd(dx_group="arrhythmia")[0].startswith("I48")
    assert icd(dx_group="ischemic", afib=1)[1] == "I48.91"


def test_every_comorbidity_flag_is_accounted_for_by_one_diagnosis():
    drawn = chart.build(row(diabetes=1, ckd=1, copd=1, hypertension=1, afib=1))
    assert sorted(dx.flag for dx in drawn.diagnoses if dx.flag) == [
        "afib",
        "ckd",
        "copd",
        "diabetes",
        "hypertension",
    ]
    assert chart.build(row(copd=1)).absent == ["diabetes", "ckd", "hypertension", "afib"]


def test_the_birth_date_gives_the_age_in_completed_years():
    for admission in ["a1", "a2", "a3", "a4"]:
        drawn = chart.build(row(admission_id=admission, age=70))
        start, born = drawn.index.start.date(), drawn.birth_date
        assert start.year - born.year - ((start.month, start.day) < (born.month, born.day)) == 70


def test_the_stay_lasts_exactly_the_length_in_the_table():
    drawn = chart.build(row(los_days=4.5))
    assert drawn.index.end - drawn.index.start == timedelta(days=4.5)
    assert drawn.index.start <= drawn.lab_time <= drawn.index.end


def test_earlier_admissions_fall_in_the_year_before_and_do_not_overlap():
    drawn = chart.build(row(prior_admissions_365d=6))
    assert len(drawn.prior) == 6
    for earlier, later in zip(drawn.prior, [*drawn.prior[1:], drawn.index], strict=True):
        assert earlier.start < earlier.end < later.start
    assert drawn.index.start - drawn.prior[0].end <= timedelta(days=365)


def test_a_readmission_starts_within_30_days_and_only_when_the_table_says_so():
    back = chart.build(row(readmit_30d=1)).readmission
    index = chart.build(row(readmit_30d=1)).index
    assert timedelta(0) < back.start - index.end <= timedelta(days=30)
    assert back.planned is False
    assert chart.build(row(readmit_30d=0)).readmission is None
    assert chart.build(row(died_in_hospital=1, readmit_30d=np.nan)).readmission is None


def test_a_row_too_incomplete_to_be_a_chart_is_refused():
    with pytest.raises(ValueError, match="age is missing"):
        chart.build(row(age=np.nan))
    assert chart.build(row(emergency=np.nan)).index.planned is None
