"""Deliberate defects in clean records, with an answer key.

Software that reads charts has to cope with records that are wrong: the
same person registered twice, codes that contradict each other, fields
left empty. `inject` takes clean bundles and plants those three defects,
each at most once per admission, and returns the answer key that says
where every one is. A matcher, a validator or a data-quality check can
then be scored on what it finds, because the truth is known.

- duplicate_patient: a second bundle for the same person under a new
  patient id, with one or two demographic details changed the way a
  registration clerk changes them (two letters swapped in a name, a birth
  date a day off). The clinical facts are the same. The copy carries no
  note, since the note names the original.
- conflicting_code: an extra diagnosis that cannot be true alongside one
  already in the record (CONFLICTS says which, and why).
- missing_field: one element removed from one resource (MISSING lists
  them). Some of these the FHIR standard requires and some it does not,
  so a validator catches only some.

Each change also rewrites the resource's human-readable text, so the old
value cannot be read off the narrative. Injection is seeded: the same
bundles and seed always give the same defects.
"""

from __future__ import annotations

import copy
import json
from datetime import date, timedelta

import numpy as np

from nora import fhir

KINDS = ["duplicate_patient", "conflicting_code", "missing_field"]
HYPERTENSION = (
    "I10",
    "Essential hypertension",
    "I10 is hypertension with no heart or kidney disease; this record already codes it with one",
)
CONFLICTS = {  # the first three characters of a code already present: what to add
    "E11": ("E10.9", "Type 1 diabetes mellitus", "diabetes cannot be both type 1 and type 2"),
    "I11": HYPERTENSION,
    "I12": HYPERTENSION,
    "I13": HYPERTENSION,
}
MISSING = [  # (resource type, element)
    ("Patient", "birthDate"),
    ("Patient", "gender"),
    ("Encounter", "period"),
    ("Condition", "code"),
    ("Observation", "valueQuantity"),
]


def _resources(bundle: dict, kind: str) -> list[dict]:
    return [e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == kind]


def _index(bundle: dict) -> dict:
    """The index admission: the encounter that carries the diagnoses."""
    return next(e for e in _resources(bundle, "Encounter") if "diagnosis" in e)


def _replace(bundle: dict, resource: dict) -> None:
    """Put a changed resource back, with its narrative rewritten to match."""
    for entry in bundle["entry"]:
        if entry["resource"]["id"] == resource["id"]:
            entry["resource"] = fhir.narrated(resource)


def _typo(word: str, rng: np.random.Generator) -> str:
    """Swap two neighbouring letters that differ."""
    places = [i for i in range(1, len(word) - 1) if word[i] != word[i + 1]]
    i = int(rng.choice(places))
    return word[:i] + word[i + 1] + word[i] + word[i + 2 :]


def _duplicate(bundle: dict, new_id: str, rng: np.random.Generator) -> tuple[dict, dict]:
    patient_id = _resources(bundle, "Patient")[0]["id"]
    twin = json.loads(json.dumps(bundle).replace(patient_id, new_id))
    twin["entry"] = [
        e for e in twin["entry"] if e["resource"]["resourceType"] != "DocumentReference"
    ]
    person = _resources(twin, "Patient")[0]
    name, changes = person["name"][0], []
    for what in rng.permutation(["family", "given", "birthDate"])[: int(rng.integers(1, 3))]:
        if what == "family":
            was, name["family"] = name["family"], _typo(name["family"], rng)
            changes.append(
                {"path": "Patient.name[0].family", "original": was, "now": name["family"]}
            )
        elif what == "given":
            was, name["given"] = name["given"][0], [_typo(name["given"][0], rng)]
            changes.append(
                {"path": "Patient.name[0].given[0]", "original": was, "now": name["given"][0]}
            )
        else:
            was = person["birthDate"]
            moved = date.fromisoformat(was) + timedelta(days=int(rng.choice([-1, 1])))
            person["birthDate"] = moved.isoformat()
            changes.append(
                {"path": "Patient.birthDate", "original": was, "now": person["birthDate"]}
            )
    _replace(twin, person)
    return twin, {"patient": new_id, "duplicate_of": patient_id, "changes": changes}


def _conflict(bundle: dict) -> tuple[dict, dict] | None:
    conditions = _resources(bundle, "Condition")
    for existing in conditions:
        code = existing["code"]["coding"][0]["code"]
        if code[:3] not in CONFLICTS:
            continue
        added, text, why = CONFLICTS[code[:3]]
        out = copy.deepcopy(bundle)
        stay = _index(out)
        rank = len(stay["diagnosis"]) + 1
        extra = copy.deepcopy(existing) | {"id": f"{stay['id']}-dx{rank}"}
        extra["code"] = {"coding": [{"system": fhir.ICD10, "code": added}], "text": text}
        stay["diagnosis"].append(
            {"condition": {"reference": f"Condition/{extra['id']}"}, "rank": rank}
        )
        _replace(out, stay)
        last = max(
            i for i, e in enumerate(out["entry"]) if e["resource"]["resourceType"] == "Condition"
        )
        url = f"Condition/{extra['id']}"
        entry = {"fullUrl": f"{fhir.BASE}/{url}", "resource": fhir.narrated(extra)}
        out["entry"].insert(last + 1, entry | {"request": {"method": "PUT", "url": url}})
        return out, {
            "resource": url,
            "conflicts_with": f"Condition/{existing['id']}",
            "added": added,
            "why": why,
        }
    return None


def _missing(bundle: dict, rng: np.random.Generator) -> tuple[dict, dict]:
    out = copy.deepcopy(bundle)
    targets = {
        "Patient": _resources(out, "Patient")[0],
        "Encounter": _index(out),
        "Condition": _resources(out, "Condition")[0],
    }
    if labs := _resources(out, "Observation"):
        targets["Observation"] = labs[0]
    kind, element = MISSING[int(rng.choice([i for i, m in enumerate(MISSING) if m[0] in targets]))]
    resource = targets[kind]
    original = resource.pop(element)
    _replace(out, resource)
    return out, {
        "resource": f"{kind}/{resource['id']}",
        "path": f"{kind}.{element}",
        "original": original,
    }


def inject(records: dict[str, dict], seed: int, share: float = 0.1) -> tuple[dict[str, dict], list]:
    """Plant each kind of defect in `share` of the admissions.

    `records` maps an admission id to its clean bundle. Returns the bundles
    to hand to the software under test (clean ones unchanged, defective
    ones changed, duplicates added) and the answer key.
    """
    rng = np.random.default_rng(seed)
    order = [str(i) for i in rng.permutation(sorted(records))]
    each = round(share * len(order))
    out, key = dict(records), []
    prefix = _resources(records[order[0]], "Patient")[0]["id"].rsplit("-", 1)[0]

    def record(kind: str, bundle_id: str, detail: dict) -> None:
        key.append({"id": f"D{len(key) + 1:04d}", "kind": kind, "bundle": bundle_id} | detail)

    for number, admission in enumerate(order[:each]):
        new_id = f"{prefix}-9{number:04d}"
        twin, detail = _duplicate(records[admission], new_id, rng)
        twin_id = _index(twin)["id"]
        if twin_id in out:
            raise ValueError(f"{twin_id} is already an admission; too many rows for this id scheme")
        out[twin_id] = twin
        record("duplicate_patient", twin_id, detail)
    rest = order[each:]
    conflicted = []
    for admission in rest:
        if len(conflicted) < each and (made := _conflict(records[admission])):
            out[admission] = made[0]
            record("conflicting_code", admission, made[1])
            conflicted.append(admission)
    for admission in [a for a in rest if a not in conflicted][:each]:
        out[admission], detail = _missing(records[admission], rng)
        record("missing_field", admission, detail)
    return out, key


def detection(key: list[dict], flagged: set[str], bundles: set[str]) -> dict:
    """Score a detector that flags whole bundles against the answer key.

    For each kind: how many defective bundles were flagged. And how many
    clean bundles were flagged anyway.
    """
    defective = {entry["bundle"] for entry in key}
    result = {}
    for kind in KINDS:
        planted = {entry["bundle"] for entry in key if entry["kind"] == kind}
        result[kind] = {"planted": len(planted), "flagged": len(planted & flagged)}
    clean = bundles - defective
    return result | {"clean": {"bundles": len(clean), "flagged": len(clean & flagged)}}
