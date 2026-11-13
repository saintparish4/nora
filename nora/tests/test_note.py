import numpy as np
from test_chart import row

from nora import chart, fhir, fixture, generate, note, schema


def written(**changes):
    return note.write(chart.build(row(**changes)))


def facts(key, field):
    return [fact for fact in key["facts"] if fact["field"] == field]


def test_every_answer_quotes_exactly_the_characters_it_points_at():
    table = generate.sample(generate.fit(fixture.sample(300, seed=5)), 400, 1, "copula")
    for _, admission in table.iterrows():
        text, key = note.write(chart.build(admission))
        assert key["facts"]
        for fact in key["facts"]:
            assert text[fact["start"] : fact["end"]] == fact["text"]


def test_the_note_and_the_structured_record_state_the_same_facts():
    table = generate.sample(generate.fit(fixture.sample(300, seed=5)), 400, 1, "copula")
    for _, admission in table.iterrows():
        drawn = chart.build(admission)
        text, key = note.write(drawn)
        record = fhir.read(fhir.render(drawn, text), "copula")[0]
        for fact in key["facts"]:
            stated, recorded = fact["value"], record[fact["field"]]
            if stated is None:
                assert np.isnan(recorded)
            elif fact["field"] == "los_days":
                assert abs(float(fact["text"].split()[0]) - recorded) <= 0.05
            else:
                assert stated == recorded


def test_numbers_can_be_read_straight_from_the_quoted_text():
    text, key = written(age=83, creatinine=2.4, sodium=131)
    assert facts(key, "age")[0]["text"] == "83-year-old"
    assert float(facts(key, "creatinine")[0]["text"]) == 2.4
    assert facts(key, "sodium")[0]["text"] == "131"


def test_an_absent_condition_is_stated_as_absent_and_keyed_as_zero():
    text, key = written(copd=1)
    assert facts(key, "copd")[0]["value"] == 1
    denied = facts(key, "diabetes")[0]
    assert denied["value"] == 0 and denied["text"] == "diabetes"
    line = text[text.rfind("\n", 0, denied["start"]) + 1 : text.find("\n", denied["end"])]
    assert line.startswith(("No history of", "Denies", "Negative for"))


def test_one_combination_code_answers_two_columns():
    text, key = written(hypertension=1)
    group, hypertension = facts(key, "dx_group")[0], facts(key, "hypertension")[0]
    assert group["text"].endswith("(I11.0)") and group["value"] == "heart_failure"
    assert (hypertension["start"], hypertension["end"]) == (group["start"], group["end"])
    assert hypertension["value"] == 1


def test_a_missing_lab_is_stated_as_not_measured():
    text, key = written(hemoglobin=np.nan)
    missing = facts(key, "hemoglobin")[0]
    assert missing["value"] is None and missing["text"] == "not measured"


def test_what_a_discharge_note_cannot_know_is_listed_as_not_stated():
    assert written()[1]["not_stated"] == ["readmit_30d"]
    assert written(readmit_30d=1)[1]["not_stated"] == ["readmit_30d"]
    died = written(died_in_hospital=1, discharged_home=0, readmit_30d=np.nan)[1]
    assert facts(died, "died_in_hospital")[0]["value"] == 1
    assert died["not_stated"] == ["discharged_home", "readmit_30d"]
    stated = {fact["field"] for fact in written()[1]["facts"]}
    assert stated == set(schema.FEATURES + schema.OUTCOMES) - {"readmit_30d"}
