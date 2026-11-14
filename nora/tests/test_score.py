import numpy as np
import pandas as pd
import pytest
from sklearn.metrics import roc_auc_score

from nora import fixture, schema, score, split


@pytest.fixture(scope="module")
def real():
    return split.split(fixture.sample(1500, seed=1))


def test_auroc_agrees_with_scikit_learn_including_ties():
    rng = np.random.default_rng(0)
    y = rng.integers(0, 2, 500).astype(float)
    p = np.round(rng.random(500) + 0.3 * y, 1)
    assert score._auroc(y, p) == pytest.approx(roc_auc_score(y, p))


def test_auroc_is_undefined_with_one_class():
    assert np.isnan(score._auroc(np.zeros(5), np.arange(5.0)))


def test_design_has_one_column_per_number_flag_and_group_and_keeps_missing(real):
    x = score.design(real[0])
    assert x.shape == (len(real[0]), len(schema.NUMERIC) + len(schema.BINARY) + 4)
    assert np.isnan(x).any()
    assert (x[:, -4:].sum(axis=1) == 1).all()


def test_column_distance_is_zero_for_the_same_column_and_one_for_disjoint_ones():
    a = pd.Series([1.0, 2.0, 3.0, 4.0])
    assert score._column_distance(a, a, numeric=True) == 0
    assert score._column_distance(a, a + 10, numeric=True) == 1
    flags = pd.Series([0.0, 0.0, 1.0, 1.0])
    assert score._column_distance(flags, pd.Series([1.0, 1.0, 1.0, 1.0]), numeric=False) == 0.5


def test_column_distance_counts_missing_values():
    full = pd.Series([1.0, 2.0, 3.0, 4.0])
    half = pd.Series([1.0, 2.0, 3.0, 4.0, np.nan, np.nan, np.nan, np.nan])
    empty = pd.Series([np.nan] * 4)
    assert score._column_distance(full, half, numeric=True) == 0.5
    assert score._column_distance(full, empty, numeric=True) == 1
    assert score._column_distance(empty, empty, numeric=True) == 0


def test_utility_reports_why_when_synthetic_data_has_one_outcome(real):
    train, test = real
    one_class = train.assign(readmit_30d=train["readmit_30d"] * 0)
    result = score.utility(train, one_class, test)
    assert result["passes"] is False
    assert "only one class" in result["reason"]
    assert result["n_test"] == len(schema.task_frame(test, "readmit_30d"))


def test_utility_gives_no_verdict_on_a_test_set_too_small_to_mean_anything(real):
    train, test = real
    readmitted = test[test["readmit_30d"] == 1].head(5)
    tiny = pd.concat([readmitted, test[test["readmit_30d"] == 0].head(40)])
    result = score.utility(train, train, tiny)
    assert result["difference"] == 0
    assert result["passes"] is False
    assert result["reason"].startswith("the test set has 5 with the outcome and 40 without")


def test_privacy_gives_no_verdict_with_too_few_admissions_to_compare(real):
    train, test = real
    result = score.privacy(train, test.head(10), fixture.sample(300, seed=9))
    assert result["passes"] is False
    assert "10 test admissions" in result["reason"]


def test_utility_ignores_admissions_that_ended_in_death(real):
    train, test = real
    result = score.utility(train, train, test)
    assert result["n_train_real"] == int(train["readmit_30d"].notna().sum())
    assert result["difference"] == 0


def test_privacy_counts_exact_copies_of_training_rows(real):
    train, test = real
    half_copied = pd.concat([train.iloc[: len(train) // 2], fixture.sample(400, seed=9)])
    result = score.privacy(train, test, half_copied.assign(admission_id=range(len(half_copied))))
    assert result["train_rows_copied"] == pytest.approx(0.5, abs=0.01)
    assert result["test_rows_copied"] == 0
    assert result["passes"] is False


def test_the_same_inputs_give_the_same_scorecard(real):
    train, test = real
    synthetic = fixture.sample(800, seed=5)
    assert score.scorecard(train, test, synthetic) == score.scorecard(train, test, synthetic)
