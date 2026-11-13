"""The scorer's verdicts on four tables whose right verdict is known.

One run is shared by every test here because it takes about 40 seconds."""

import pytest

from nora import selfcheck


@pytest.fixture(scope="module")
def cards():
    return selfcheck.run()


def test_the_scorer_gives_every_stand_in_its_known_verdict(cards):
    assert selfcheck.failures(cards) == []


def test_a_fresh_sample_of_the_same_process_passes_everything(cards):
    card = cards["holdout"]
    assert card["utility"]["passes"] and card["privacy"]["passes"]
    assert card["fidelity"]["marginal"] < 2 * card["floor"]["fidelity"]["marginal"]


def test_a_copy_of_the_training_data_is_useful_faithful_and_not_private(cards):
    card = cards["copy"]
    assert card["utility"]["difference"] == 0
    assert card["fidelity"]["marginal"] == 0
    assert card["privacy"]["attack_auroc"] > 0.95
    assert not card["privacy"]["passes"]


def test_shuffled_columns_look_right_one_at_a_time_and_are_caught_anyway(cards):
    card = cards["marginals"]
    assert card["fidelity"]["marginal"] < 0.02
    assert card["fidelity"]["discriminator_auroc"] > 0.6
    assert not card["utility"]["passes"]


def test_noise_fails_utility_and_fidelity_but_leaks_nothing(cards):
    card = cards["noise"]
    assert not card["utility"]["passes"]
    assert card["fidelity"]["discriminator_auroc"] > 0.95
    assert card["privacy"]["passes"]
