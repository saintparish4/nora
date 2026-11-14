import json
from pathlib import Path

import pytest
from test_chart import row

from nora import defects, fhir, records

ROOT = Path(__file__).parents[1] / "generated/mimic-iv-demo-2.2/copula-v2"


@pytest.fixture(scope="module")
def clean():
    rows = [
        row(admission_id=f"t-{i:05d}-1", patient_id=f"t-{i:05d}", diabetes=i % 2, hypertension=1)
        for i in range(40)
    ]
    return {r["admission_id"]: records.build(r)[0] for r in rows}


@pytest.fixture(scope="module")
def planted(clean):
    return defects.inject(clean, seed=3, share=0.1)


def entries(key, kind):
    return [entry for entry in key if entry["kind"] == kind]


def test_each_kind_is_planted_in_its_share_and_no_admission_gets_two(clean, planted):
    bundles, key = planted
    assert [len(entries(key, kind)) for kind in defects.KINDS] == [4, 4, 4]
    assert len(bundles) == len(clean) + 4
    touched = [e["bundle"] for e in key if e["kind"] != "duplicate_patient"]
    touched += [e["duplicate_of"] + "-1" for e in entries(key, "duplicate_patient")]
    assert len(touched) == len(set(touched))


def test_every_other_bundle_is_left_exactly_as_it_was(clean, planted):
    bundles, key = planted
    changed = {entry["bundle"] for entry in key}
    assert all(bundles[name] == clean[name] for name in clean if name not in changed)


def test_the_same_seed_plants_the_same_defects(clean, planted):
    assert defects.inject(clean, seed=3, share=0.1) == planted
    assert defects.inject(clean, seed=4, share=0.1)[1] != planted[1]


def test_a_duplicate_is_the_same_admission_under_a_new_id_with_the_changes_in_the_key(
    clean, planted
):
    bundles, key = planted
    for entry in entries(key, "duplicate_patient"):
        twin, original = bundles[entry["bundle"]], clean[entry["duplicate_of"] + "-1"]
        assert entry["duplicate_of"] not in json.dumps(twin)
        assert not [
            e for e in twin["entry"] if e["resource"]["resourceType"] == "DocumentReference"
        ]
        person = twin["entry"][1]["resource"]
        was = original["entry"][1]["resource"]
        assert 1 <= len(entry["changes"]) <= 2
        for change in entry["changes"]:
            assert change["original"] != change["now"]
            assert change["original"] in json.dumps(was) and change["now"] in json.dumps(person)
            assert change["original"] not in person["text"]["div"]
        same = fhir.read(twin, "t")[0] | {"patient_id": "", "admission_id": "", "age": 0}
        assert same == fhir.read(original, "t")[0] | {
            "patient_id": "",
            "admission_id": "",
            "age": 0,
        }


def test_a_conflicting_code_is_added_beside_the_code_it_contradicts(clean, planted):
    bundles, key = planted
    for entry in entries(key, "conflicting_code"):
        codes = {
            f"Condition/{e['resource']['id']}": e["resource"]["code"]["coding"][0]["code"]
            for e in bundles[entry["bundle"]]["entry"]
            if e["resource"]["resourceType"] == "Condition"
        }
        assert codes[entry["resource"]] == entry["added"]
        assert codes[entry["conflicts_with"]][:3] in defects.CONFLICTS
        ranks = [d["rank"] for d in defects._index(bundles[entry["bundle"]])["diagnosis"]]
        assert ranks == list(range(1, len(codes) + 1))


def test_a_missing_field_is_gone_from_the_resource_and_from_its_narrative(clean, planted):
    bundles, key = planted
    for entry in entries(key, "missing_field"):
        kind, element = entry["path"].split(".")
        resource = next(
            e["resource"]
            for e in bundles[entry["bundle"]]["entry"]
            if f"{e['resource']['resourceType']}/{e['resource']['id']}" == entry["resource"]
        )
        assert resource["resourceType"] == kind and element not in resource
        if isinstance(entry["original"], str):
            assert entry["original"] not in resource["text"]["div"]


def test_detection_counts_what_a_detector_flagged_by_kind(planted):
    bundles, key = planted
    missing = {entry["bundle"] for entry in entries(key, "missing_field")}
    clean_one = next(name for name in bundles if name not in {e["bundle"] for e in key})
    found = defects.detection(key, missing | {clean_one}, set(bundles))
    assert found["missing_field"] == {"planted": 4, "flagged": 4}
    assert found["duplicate_patient"] == {"planted": 4, "flagged": 0}
    assert found["clean"] == {"bundles": len(bundles) - 12, "flagged": 1}


def test_the_committed_defects_are_what_the_committed_sample_gives():
    paths = sorted(p for p in (ROOT / "sample").glob("*.json") if not p.name.endswith(".key.json"))
    sample = {p.name.removesuffix(".json"): json.loads(p.read_text()) for p in paths}
    bundles, key = defects.inject(sample, seed=20261113, share=0.2)
    assert json.loads((ROOT / "defects/answers.key.json").read_text()) == key
    for name, bundle in bundles.items():
        assert json.loads((ROOT / "defects" / f"{name}.json").read_text()) == bundle
