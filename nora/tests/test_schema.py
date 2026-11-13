import numpy as np
import pandas as pd
import pytest

from nora import schema


def row(**changes):
    base = {
        "source": "test",
        "patient_id": "p1",
        "admission_id": "a1",
        "age": 70,
        "los_days": 4.5,
        "prior_admissions_365d": 1,
        "creatinine": 1.2,
        "bun": 22,
        "sodium": 138,
        "potassium": 4.1,
        "hemoglobin": 12.5,
        "male": 1,
        "emergency": 1,
        "discharged_home": 0,
        "diabetes": 0,
        "ckd": 1,
        "copd": 0,
        "hypertension": 1,
        "afib": 0,
        "dx_group": "heart_failure",
        "died_in_hospital": 0,
        "readmit_30d": 1,
    }
    return base | changes


def table(*rows):
    return pd.DataFrame(list(rows))


def test_conform_orders_columns_and_casts_numbers_to_float():
    shuffled = table(row())[list(reversed(schema.COLUMNS))]
    out = schema.conform(shuffled)
    assert list(out.columns) == schema.COLUMNS
    assert out["age"].dtype == np.float64
    assert out["admission_id"].iloc[0] == "a1"


def test_conform_keeps_a_column_the_source_cannot_supply_as_missing():
    out = schema.conform(table(row(discharged_home=np.nan, hemoglobin=np.nan)))
    assert out["discharged_home"].isna().all()
    assert out["hemoglobin"].isna().all()


def test_conform_rejects_a_missing_or_extra_column():
    with pytest.raises(ValueError, match="missing \\['age'\\]"):
        schema.conform(table(row()).drop(columns="age"))
    with pytest.raises(ValueError, match="extra \\['weight'\\]"):
        schema.conform(table(row()).assign(weight=80))


def test_conform_rejects_a_value_in_the_wrong_unit():
    # Creatinine of 106 is umol/L arriving where mg/dL is expected.
    with pytest.raises(ValueError, match="creatinine outside"):
        schema.conform(table(row(creatinine=106)))


def test_conform_rejects_children_and_unknown_diagnosis_groups():
    with pytest.raises(ValueError, match="age outside"):
        schema.conform(table(row(age=17)))
    with pytest.raises(ValueError, match="dx_group"):
        schema.conform(table(row(dx_group="sepsis")))


def test_conform_rejects_duplicate_admissions_and_non_binary_flags():
    with pytest.raises(ValueError, match="not unique"):
        schema.conform(table(row(), row()))
    with pytest.raises(ValueError, match="ckd must be 0, 1 or missing"):
        schema.conform(table(row(ckd=2)))


def test_conform_rejects_a_readmission_after_death():
    with pytest.raises(ValueError, match="died in hospital"):
        schema.conform(table(row(died_in_hospital=1, readmit_30d=0)))


def test_implausible_lab_values_are_blanked_and_counted():
    rows = table(row(), row(admission_id="a2", creatinine=66.4, sodium=14))
    out = schema.conform(schema.blank_implausible_labs(rows))
    assert out["creatinine"].tolist()[0] == 1.2
    assert np.isnan(out.loc[1, "creatinine"]) and np.isnan(out.loc[1, "sodium"])
    assert out.attrs["implausible_labs"] == {
        "creatinine": 1,
        "bun": 0,
        "sodium": 1,
        "potassium": 0,
        "hemoglobin": 0,
    }


def test_blanking_leaves_an_impossible_age_for_conform_to_reject():
    with pytest.raises(ValueError, match="age outside"):
        schema.conform(schema.blank_implausible_labs(table(row(age=170))))


def test_task_frame_drops_rows_whose_outcome_is_unknown():
    both = table(row(), row(admission_id="a2", died_in_hospital=1, readmit_30d=np.nan))
    df = schema.conform(both)
    assert len(schema.task_frame(df, "readmit_30d")) == 1
    assert len(schema.task_frame(df, "died_in_hospital")) == 2
