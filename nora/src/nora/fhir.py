"""Charts as FHIR R4 bundles, and bundles back into admission table rows.

`render` writes one transaction Bundle per admission, in US Core 6.1.0
profiles (the version ONC certification requires): the Patient, the index
Encounter with its ranked diagnoses, the earlier and later Encounters that
the table's `prior_admissions_365d` and `readmit_30d` count, one lab
Observation per result, and the discharge note as a DocumentReference.

`read` goes the other way and applies the protocol's own rules to FHIR:
the cohort is chosen by the rank-1 diagnosis, a readmission is an unplanned
Encounter starting within 30 days of discharge, and so on (PROTOCOL.md
sections 2 to 4). A bundle that does not read back as the row it was
rendered from is a bug, and `tests/test_fhir.py` checks every generated
admission. The same reader is the start of the mapper the next step of the
plan needs, for FHIR that Nora did not write.

Display names are left off codings where the official wording differs from
clinical wording (ICD-10-CM, SNOMED); the clinical wording goes in `text`.
"""

from __future__ import annotations

import base64
from datetime import datetime
from html import escape

import numpy as np

from nora import codes, schema
from nora.chart import LABS, Chart, Stay, lab_value

BASE = "https://nora.example/fhir"
US_CORE = "http://hl7.org/fhir/us/core/StructureDefinition"
NOTE_CATEGORY = "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category"
HL7 = "http://terminology.hl7.org/CodeSystem"
ICD10 = "http://hl7.org/fhir/sid/icd-10-cm"
LOINC = "http://loinc.org"
SNOMED = "http://snomed.info/sct"
UCUM = "http://unitsofmeasure.org"
ZONE = "-05:00"  # every time is written in one fixed offset
DAY = 86400
HOSPITAL = {
    "resourceType": "Organization",
    "id": "nora-general",
    "meta": {"profile": [f"{US_CORE}/us-core-organization"]},
    "active": True,
    "name": "Nora General Hospital (synthetic)",
}


def _coding(system: str, code: str, display: str | None = None) -> dict:
    coding = {"system": system, "code": code}
    return {"coding": [coding | ({"display": display} if display else {})]}


def _ref(kind: str, id: str) -> dict:
    return {"reference": f"{kind}/{id}"}


def _time(moment: datetime) -> str:
    return moment.isoformat(timespec="seconds") + ZONE


def _narrated(resource: dict, summary: str) -> dict:
    """Add the short human-readable text FHIR asks every resource to carry."""
    div = f'<div xmlns="http://www.w3.org/1999/xhtml">{escape(summary)}</div>'
    return resource | {"text": {"status": "generated", "div": div}}


def _encounter(stay: Stay, patient: dict) -> dict:
    resource = {
        "resourceType": "Encounter",
        "id": stay.id,
        "meta": {"profile": [f"{US_CORE}/us-core-encounter"]},
        "status": "finished",
        "class": {"system": f"{HL7}/v3-ActCode", "code": "IMP"},
        "type": [_coding(SNOMED, "185347001") | {"text": "Hospital admission"}],
        "subject": patient,
        "period": {"start": _time(stay.start), "end": _time(stay.end)},
        "serviceProvider": _ref("Organization", HOSPITAL["id"]),
    }
    if stay.planned is not None:
        code = "EL" if stay.planned else "EM"
        resource["priority"] = _coding(f"{HL7}/v3-ActPriority", code)
    summary = f"Inpatient admission, {_time(stay.start)} to {_time(stay.end)}"
    return _narrated(resource, summary)


def render(chart: Chart, note: str) -> dict:
    row, index = chart.row, chart.index
    patient = _ref("Patient", chart.patient_id)
    encounter = _ref("Encounter", index.id)
    died = row["died_in_hospital"] == 1

    person = {
        "resourceType": "Patient",
        "id": chart.patient_id,
        "meta": {"profile": [f"{US_CORE}/us-core-patient"]},
        "identifier": [
            {
                "type": _coding(f"{HL7}/v2-0203", "MR"),
                "system": f"{BASE}/mrn",
                "value": chart.patient_id,
            }
        ],
        "name": [{"use": "official", "family": chart.family, "given": [chart.given]}],
        "gender": "male" if row["male"] == 1 else "female",
        "birthDate": chart.birth_date.isoformat(),
    }
    if died:
        person["deceasedDateTime"] = _time(index.end)

    conditions = [
        {
            "resourceType": "Condition",
            "id": f"{index.id}-dx{rank}",
            "meta": {"profile": [f"{US_CORE}/us-core-condition-encounter-diagnosis"]},
            "clinicalStatus": _coding(f"{HL7}/condition-clinical", "active"),
            "verificationStatus": _coding(f"{HL7}/condition-ver-status", "confirmed"),
            "category": [_coding(f"{HL7}/condition-category", "encounter-diagnosis")],
            "code": _coding(ICD10, dx.code) | {"text": dx.text},
            "subject": patient,
            "encounter": encounter,
            "recordedDate": _time(index.end),
        }
        for rank, dx in enumerate(chart.diagnoses, start=1)
    ]

    stay = _encounter(index, patient)
    stay["diagnosis"] = [
        {"condition": _ref("Condition", c["id"]), "rank": rank}
        for rank, c in enumerate(conditions, start=1)
    ]
    if died:
        disposition = ("exp", "Expired")
    elif row["discharged_home"] == 1:
        disposition = ("home", "Home")
    elif row["discharged_home"] == 0:
        disposition = ("other-hcf", "Other healthcare facility")
    else:
        disposition = None  # the table does not say, so neither does the record
    if disposition:
        coded = _coding(f"{HL7}/discharge-disposition", *disposition)
        stay["hospitalization"] = {"dischargeDisposition": coded}

    labs = [
        {
            "resourceType": "Observation",
            "id": f"{index.id}-{column}",
            "meta": {"profile": [f"{US_CORE}/us-core-observation-lab"]},
            "status": "final",
            "category": [_coding(f"{HL7}/observation-category", "laboratory")],
            "code": _coding(LOINC, loinc, name),
            "subject": patient,
            "encounter": encounter,
            "effectiveDateTime": _time(chart.lab_time),
            "performer": [_ref("Organization", HOSPITAL["id"])],
            "valueQuantity": {"value": value, "unit": unit, "system": UCUM, "code": unit},
        }
        for column, (loinc, name, _, unit) in LABS.items()
        if (value := lab_value(row, column)) is not None
    ]

    document = {
        "resourceType": "DocumentReference",
        "id": f"{index.id}-note",
        "meta": {"profile": [f"{US_CORE}/us-core-documentreference"]},
        "status": "current",
        "type": _coding(LOINC, "18842-5", "Discharge summary"),
        "category": [_coding(NOTE_CATEGORY, "clinical-note")],
        "subject": patient,
        "date": _time(index.end),
        "content": [
            {
                "attachment": {
                    "contentType": "text/plain; charset=utf-8",
                    "data": base64.b64encode(note.encode()).decode(),
                }
            }
        ],
        "context": {"encounter": [encounter]},
    }

    others = [_encounter(s, patient) for s in chart.prior]
    if chart.readmission:
        others.append(_encounter(chart.readmission, patient))
    name = f"{chart.given} {chart.family}"
    person = _narrated(person, f"{name}, {person['gender']}, born {person['birthDate']}")
    conditions = [
        _narrated(c, f"{c['code']['text']} ({c['code']['coding'][0]['code']})") for c in conditions
    ]
    for i, lab in enumerate(labs):
        quantity = lab["valueQuantity"]
        display = lab["code"]["coding"][0]["display"]
        labs[i] = _narrated(lab, f"{display}: {quantity['value']} {quantity['unit']}")
    document = _narrated(document, f"Discharge summary for {name}")
    hospital = _narrated(HOSPITAL, HOSPITAL["name"])
    resources = [hospital, person, *others, stay, *conditions, *labs, document]
    return {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "fullUrl": f"{BASE}/{r['resourceType']}/{r['id']}",
                "resource": r,
                "request": {"method": "PUT", "url": f"{r['resourceType']}/{r['id']}"},
            }
            for r in resources
        ],
    }


def note_text(bundle: dict) -> str:
    """The discharge note carried in a bundle's DocumentReference."""
    for entry in bundle["entry"]:
        if entry["resource"]["resourceType"] == "DocumentReference":
            data = entry["resource"]["content"][0]["attachment"]["data"]
            return base64.b64decode(data).decode()
    raise ValueError("the bundle has no DocumentReference")


def _moment(text: str) -> datetime:
    return datetime.fromisoformat(text)


def _first_code(concept: dict | None) -> str | None:
    return concept["coding"][0]["code"] if concept else None


def read(bundle: dict, source: str) -> list[dict]:
    """The admission table rows a bundle holds, by the protocol's rules."""
    kinds: dict[str, dict[str, dict]] = {}
    for entry in bundle["entry"]:
        resource = entry["resource"]
        kinds.setdefault(resource["resourceType"], {})[resource["id"]] = resource
    encounters = list(kinds.get("Encounter", {}).values())
    conditions = kinds.get("Condition", {})
    rows = []
    for stay in encounters:
        ranked = sorted(stay.get("diagnosis", []), key=lambda d: d["rank"])
        icd = [
            _first_code(conditions[d["condition"]["reference"].split("/")[1]]["code"]).replace(
                ".", ""
            )
            for d in ranked
        ]
        if not icd or not codes.is_heart_disease(icd[0], 10):
            continue
        patient = kinds["Patient"][stay["subject"]["reference"].split("/")[1]]
        start, end = _moment(stay["period"]["start"]), _moment(stay["period"]["end"])
        born = datetime.fromisoformat(patient["birthDate"]).date()
        age = start.year - born.year - ((start.month, start.day) < (born.month, born.day))
        if end <= start or age < 18:
            continue
        mine = [e for e in encounters if e["subject"] == stay["subject"] and e is not stay]
        prior = back = 0
        for other in mine:
            since_end = (start - _moment(other["period"]["end"])).total_seconds()
            prior += 0 < since_end <= 365 * DAY
            until_start = (_moment(other["period"]["start"]) - end).total_seconds()
            planned = _first_code(other.get("priority")) == "EL"
            back += 0 < until_start <= 30 * DAY and not planned
        disposition = _first_code(stay.get("hospitalization", {}).get("dischargeDisposition"))
        died = disposition == "exp"
        priority = _first_code(stay.get("priority"))
        row = {
            "source": source,
            "patient_id": patient["id"],
            "admission_id": stay["id"],
            "age": float(age),
            "los_days": (end - start).total_seconds() / DAY,
            "prior_admissions_365d": float(prior),
            "male": {"male": 1.0, "female": 0.0}.get(patient.get("gender"), np.nan),
            "emergency": np.nan if priority is None else float(priority != "EL"),
            "discharged_home": np.nan if disposition is None else float(disposition == "home"),
            "dx_group": codes.dx_group(icd[0], 10),
            "died_in_hospital": float(died),
            "readmit_30d": np.nan if died else float(back > 0),
        }
        for name in codes.COMORBIDITIES:
            row[name] = float(any(codes.has_comorbidity(name, code, 10) for code in icd))
        for column, (loinc, *_) in LABS.items():
            results = [
                o
                for o in kinds.get("Observation", {}).values()
                if _first_code(o["code"]) == loinc
                and o.get("encounter") == _ref("Encounter", stay["id"])
                and "valueQuantity" in o
            ]
            results.sort(key=lambda o: _moment(o["effectiveDateTime"]))
            row[column] = float(results[-1]["valueQuantity"]["value"]) if results else np.nan
        rows.append({column: row[column] for column in schema.COLUMNS})
    return rows
