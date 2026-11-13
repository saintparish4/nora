"""The generator on small tables, then scored where the truth is known.

The scored run is shared by the last three tests because it takes about a
minute."""

import numpy as np
import pytest

from nora import fixture, generate, schema, selfcheck


@pytest.fixture(scope="module")
def train():
    return fixture.sample(60, seed=4)


def test_the_same_seed_gives_the_same_table(train):
    model = generate.fit(train)
    assert generate.sample(model, 50, 1, "s").equals(generate.sample(model, 50, 1, "s"))
    assert not generate.sample(model, 50, 1, "s").equals(generate.sample(model, 50, 2, "s"))


def test_the_table_passes_the_schema_and_stays_inside_the_real_range(train):
    out = generate.sample(generate.fit(train), 500, 1, "copula")
    assert list(out.columns) == schema.COLUMNS and len(out) == 500
    assert out["admission_id"].is_unique and (out["source"] == "copula").all()
    for column in schema.NUMERIC:
        assert out[column].min() >= train[column].min()
        assert out[column].max() <= train[column].max()


def test_values_come_at_the_precision_of_the_real_table(train):
    coarse = train.assign(creatinine=train["creatinine"].round(1), bun=train["bun"].round())
    model = generate.fit(coarse)
    assert model.step["creatinine"] == 0.1 and model.step["bun"] == 1
    assert model.step["potassium"] is None  # the fixture's potassium has no step
    out = generate.sample(model, 300, 1, "s")
    assert np.allclose(out["creatinine"] * 10, (out["creatinine"] * 10).round())
    assert (out["age"] == out["age"].round()).all()


def test_no_one_dies_and_goes_home_or_dies_and_is_readmitted(train):
    out = generate.sample(generate.fit(train), 3000, 1, "s")
    died = out[out["died_in_hospital"] == 1]
    assert len(died) > 0
    assert (died["discharged_home"] == 0).all() and died["readmit_30d"].isna().all()


def test_missing_values_are_drawn_at_the_real_rate_and_an_empty_column_stays_empty(train):
    empty = train.assign(discharged_home=np.nan, sodium=np.nan)
    out = generate.sample(generate.fit(empty), 2000, 1, "s")
    assert out["discharged_home"].isna().all() and out["sodium"].isna().all()
    share = train["hemoglobin"].isna().mean()
    assert abs(out["hemoglobin"].isna().mean() - share) < 0.03
    assert out["age"].notna().all()


@pytest.fixture(scope="module")
def cards():
    return selfcheck.generator_by_size()


def test_with_enough_data_the_generator_passes_like_an_honest_sample(cards):
    assert selfcheck.generator_failures(cards) == []


def test_no_training_row_is_ever_copied_at_any_size(cards):
    assert [card["privacy"]["train_rows_copied"] for card in cards.values()] == [0] * len(cards)


def test_fit_to_42_admissions_it_leaks_who_it_was_trained_on(cards):
    # A known limit, kept as a test so that it is never quietly forgotten:
    # the open demo gives 42 training admissions, and that is too few.
    privacy = cards[42]["privacy"]
    assert privacy["attack_auroc"] > privacy["ceiling"]
    assert not privacy["passes"]
