"""A discharge note written from a chart, with an answer key.

The note states the same facts as the structured record, in sentences, and
the key says exactly where: each entry names a table column, the value the
note asserts for it, and the characters that assert it. Software that reads
notes can then be scored against known truth, including on what a note
denies ("No history of diabetes") and on what it cannot know: a discharge
note is written before any readmission, so `readmit_30d` is never in it,
and the key lists it under `not_stated`.

The note is a template, with a few wordings chosen per admission so that
one regular expression does not solve every note. It is not written to
pass for a clinician's prose (PROTOCOL.md section 12).

Offsets count characters of the note text, start inclusive, end exclusive,
so `note[start:end]` is the quoted text.
"""

from __future__ import annotations

from nora import schema
from nora.chart import LABS, NAMES, Chart, lab_value, pick


class _Writer:
    def __init__(self) -> None:
        self.parts: list[str] = []
        self.length = 0
        self.facts: list[dict] = []

    def add(self, text: str) -> None:
        self.parts.append(text)
        self.length += len(text)

    def fact(self, field: str, value, text: str) -> None:
        """Write `text` and record that it asserts `value` for `field`."""
        span = {"start": self.length, "end": self.length + len(text), "text": text}
        self.facts.append({"field": field, "value": value} | span)
        self.add(text)


def _list(items: list[str]) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " or " + items[-1]


def write(chart: Chart) -> tuple[str, dict]:
    """Return the note text and its answer key."""
    row, index = chart.row, chart.index
    key = index.id
    w = _Writer()
    stamp = "%Y-%m-%d %H:%M"
    male = row["male"] == 1

    w.add("DISCHARGE SUMMARY\n\n")
    w.add(f"Patient: {chart.given} {chart.family}    MRN: {chart.patient_id}\n")
    w.add(f"Date of birth: {chart.birth_date.isoformat()}    Sex: ")
    w.fact("male", int(male), "male" if male else "female")
    w.add(f"\nAdmitted: {index.start.strftime(stamp)}    ")
    w.add(f"Discharged: {index.end.strftime(stamp)}\n\n")

    primary = chart.diagnoses[0]
    w.add("PRINCIPAL DIAGNOSIS\n")
    w.fact("dx_group", row["dx_group"], f"{primary.text} ({primary.code})")
    if primary.flag:
        # One diagnosis can settle two columns: I11.0 is both the heart
        # failure admission and the patient's hypertension.
        w.facts.append(w.facts[-1] | {"field": primary.flag, "value": 1})
    w.add("\n\nHISTORY OF PRESENT ILLNESS\n")
    w.add(f"{'Mr.' if male else 'Ms.'} {chart.family} is a ")
    w.fact("age", int(row["age"]), f"{int(row['age'])}-year-old")
    w.add(f" {'man' if male else 'woman'} who ")
    if index.planned is None:
        w.add("was admitted")
    elif index.planned:
        w.fact(
            "emergency",
            0,
            ["came in for a planned admission", "was admitted electively"][pick(key, "route", 2)],
        )
    else:
        options = [
            "was admitted through the emergency department",
            "presented as an emergency admission",
        ]
        w.fact("emergency", 1, options[pick(key, "route", 2)])
    w.add(f" with {primary.text[0].lower()}{primary.text[1:]}. ")
    count = int(row["prior_admissions_365d"])
    if count == 0:
        options = [
            "No hospital admissions in the previous year",
            "No admissions in the past 12 months",
        ]
        w.fact("prior_admissions_365d", 0, options[pick(key, "prior", 2)])
        w.add(".\n\n")
    else:
        w.fact(
            "prior_admissions_365d", count, f"{count} hospital admission{'s' if count > 1 else ''}"
        )
        w.add(" in the previous year.\n\n")

    w.add("PAST MEDICAL HISTORY AND SECONDARY DIAGNOSES\n")
    secondary = chart.diagnoses[1:]
    for dx in secondary:
        if dx.flag:
            w.fact(dx.flag, 1, f"{dx.text} ({dx.code})")
        else:
            w.add(f"{dx.text} ({dx.code})")
        w.add("\n")
    if not secondary:
        w.add("None recorded.\n")
    absent = chart.absent
    if absent:
        opener = ["No history of ", "Denies ", "Negative for "][pick(key, "negation", 3)]
        w.add(opener)
        names = [NAMES[column] for column in absent]
        for i, column in enumerate(absent):
            if i:
                w.add(" or " if i == len(absent) - 1 else ", ")
            w.fact(column, 0, names[i])
        w.add(".\n")

    w.add("\nLABORATORY RESULTS (last before discharge)\n")
    for column, (_, _, label, unit) in LABS.items():
        value = lab_value(row, column)
        w.add(f"{label}: ")
        if value is None:
            w.fact(column, None, "not measured")
            w.add(" during this admission\n")
        else:
            w.fact(column, value, str(value))
            w.add(f" {unit}\n")

    w.add("\nHOSPITAL COURSE AND DISPOSITION\n")
    w.add("Length of stay ")
    w.fact("los_days", row["los_days"], f"{row['los_days']:.1f} days")
    w.add(". ")
    if row["died_in_hospital"] == 1:
        w.fact(
            "died_in_hospital",
            1,
            ["The patient died in hospital", "The patient expired during this admission"][
                pick(key, "death", 2)
            ],
        )
        w.add(f" on {index.end.strftime('%Y-%m-%d')}.\n")
    else:
        if row["discharged_home"] == 1:
            w.fact("discharged_home", 1, ["Discharged home", "Went home"][pick(key, "home", 2)])
        elif row["discharged_home"] == 0:
            options = [
                "Discharged to a skilled nursing facility",
                "Transferred to another care facility",
            ]
            w.fact("discharged_home", 0, options[pick(key, "home", 2)])
        else:
            w.add("Discharged")
        w.add(" in ")
        w.fact("died_in_hospital", 0, "stable condition")
        w.add(".\n")

    stated = {fact["field"] for fact in w.facts}
    return "".join(w.parts), {
        "admission_id": key,
        "facts": w.facts,
        "not_stated": [c for c in schema.FEATURES + schema.OUTCOMES if c not in stated],
    }
