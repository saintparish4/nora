import copy

import numpy as np
import pytest
from test_chart import row

from nora import chart, fhir, fixture, generate, note, records, schema


def bundle(**changes):
    drawn = chart.build(row(**changes))
    return fhir.render(drawn, note.write(drawn)[0])


def resources(b, kind):
    return [e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == kind]


def test_every_generated_admission_reads_back_as_its_own_row():
    table = generate.sample(generate.fit(fixture.sample(300, seed=5)), 400, 1, "copula")
    for _, admission in table.iterrows():
        records.build(admission)  # raises on any column that disagrees


def test_a_bundle_reads_back_column_for_column():
    back = fhir.read(bundle(prior_admissions_365d=2, readmit_30d=1, ckd=1), "test")
    assert back == [row(prior_admissions_365d=2, readmit_30d=1, ckd=1)]
    assert list(back[0]) == schema.COLUMNS


def test_ids_are_unique_and_every_reference_points_inside_the_bundle():
    b = bundle(prior_admissions_365d=3, readmit_30d=1, diabetes=1)
    urls = [e["request"]["url"] for e in b["entry"]]
    assert len(urls) == len(set(urls))

    def references(node):
        if isinstance(node, dict):
            yield from ([node["reference"]] if "reference" in node else [])
            for value in node.values():
                yield from references(value)
        elif isinstance(node, list):
            for value in node:
                yield from references(value)

    assert set(references(b)) <= set(urls)


def test_what_the_table_does_not_say_is_left_out_of_the_record():
    b = bundle(hemoglobin=np.nan, discharged_home=np.nan, emergency=np.nan)
    assert len(resources(b, "Observation")) == 4
    stay = next(e for e in resources(b, "Encounter") if "diagnosis" in e)
    assert "hospitalization" not in stay and "priority" not in stay
    back = fhir.read(b, "test")[0]
    assert np.isnan(back["hemoglobin"]) and np.isnan(back["discharged_home"])
    assert np.isnan(back["emergency"])


def test_a_death_is_on_the_patient_and_the_encounter_and_has_no_readmission_label():
    b = bundle(died_in_hospital=1, discharged_home=0, readmit_30d=np.nan)
    assert "deceasedDateTime" in resources(b, "Patient")[0]
    back = fhir.read(b, "test")[0]
    assert back["died_in_hospital"] == 1 and np.isnan(back["readmit_30d"])


def test_a_planned_return_within_30_days_is_not_a_readmission():
    b = bundle(readmit_30d=1)
    assert fhir.read(b, "test")[0]["readmit_30d"] == 1
    planned = copy.deepcopy(b)
    later = next(e for e in resources(planned, "Encounter") if e["id"].endswith("readmission"))
    later["priority"]["coding"][0]["code"] = "EL"
    assert fhir.read(planned, "test")[0]["readmit_30d"] == 0


def test_the_cohort_is_chosen_by_the_first_ranked_diagnosis():
    b = bundle(dx_group="ischemic", diabetes=1)
    stay = next(e for e in resources(b, "Encounter") if "diagnosis" in e)
    for entry in stay["diagnosis"]:
        entry["rank"] = 3 - entry["rank"]  # diabetes first, heart disease second
    assert fhir.read(b, "test") == []


def test_the_note_travels_inside_the_bundle():
    drawn = chart.build(row())
    text = note.write(drawn)[0]
    assert fhir.note_text(fhir.render(drawn, text)) == text
    with pytest.raises(ValueError, match="no DocumentReference"):
        fhir.note_text({"entry": []})
