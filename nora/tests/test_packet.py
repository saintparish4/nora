import pandas as pd
import pytest

from nora import fixture, packet


@pytest.fixture(scope="module")
def built():
    real, synthetic = fixture.sample(200, seed=1, source="real"), fixture.sample(200, seed=2)
    return real, synthetic, packet.build(real, synthetic, cards=20, seed=5)


def test_half_the_cards_are_real_and_no_patient_appears_twice(built):
    real, synthetic, (html, sheet, key) = built
    assert [entry["card"] for entry in key] == list(range(1, 21))
    assert sum(entry["truth"] == "real" for entry in key) == 10
    ids = [e["admission_id"] for e in key if e["truth"] == "real"]
    assert real.set_index("admission_id").loc[ids, "patient_id"].is_unique
    assert html.count('class="card"') == 20
    assert sheet.splitlines()[:2] == ["card,answer", "1,"]


def test_a_card_shows_nothing_that_says_where_it_came_from(built):
    real, synthetic, (html, sheet, key) = built
    assert "real" not in html.split("</p>", 1)[1]
    for table in (real, synthetic):
        assert not any(i in html for i in table["admission_id"].head(50))
    assert "Readmitted" not in html and "fixture" not in html


def test_the_same_seed_builds_the_same_packet(built):
    real, synthetic, first = built
    assert packet.build(real, synthetic, cards=20, seed=5) == first
    assert packet.build(real, synthetic, cards=20, seed=6)[2] != first[2]


def test_a_card_reads_the_same_whether_real_or_synthetic():
    row = fixture.sample(5, seed=1).iloc[0]
    assert packet.facts(row) == packet.facts(row.copy())
    labels = [label for label, _ in packet.facts(row)]
    assert labels[:3] == ["Age", "Sex", "Primary diagnosis group"] and "Last BUN" in labels
    blank = row.copy()
    blank["hemoglobin"] = blank["discharged_home"] = float("nan")
    shown = dict(packet.facts(blank))
    assert shown["Last hemoglobin"] == shown["Discharged home"] == "not recorded"


def test_a_rater_who_guesses_scores_near_half_and_one_who_knows_scores_one(built):
    key = built[2][2]
    perfect = packet.score(key, {e["card"]: e["truth"].upper() + " " for e in key})
    assert perfect["accuracy"] == 1 and perfect["accuracy_ci"][0] > 0.8
    all_real = packet.score(key, {e["card"]: "real" for e in key})
    assert all_real["accuracy"] == 0.5 and all_real["real_called_real"] == 10
    assert all_real["accuracy_ci"][0] < 0.5 < all_real["accuracy_ci"][1]


def test_an_unanswered_card_is_an_error_not_a_wrong_answer(built):
    key = built[2][2]
    answers = {e["card"]: "real" for e in key} | {3: "", 7: "maybe"}
    with pytest.raises(ValueError, match=r"\[3, 7\]"):
        packet.score(key, answers)


def test_too_few_real_patients_is_refused():
    few = fixture.sample(8, seed=1)
    with pytest.raises(ValueError, match="need 10 real patients"):
        packet.build(few, fixture.sample(50, seed=2), cards=20, seed=1)
    assert isinstance(few, pd.DataFrame)
