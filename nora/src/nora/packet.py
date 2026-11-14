"""The blind packet: can a clinician tell real admissions from synthetic?

PROTOCOL.md section 12. `build` lays out admission cards, half from real
data and half synthetic, shuffled, each showing the same facts in the same
layout with nothing that says where it came from. The rater marks each
card real or synthetic on the answer sheet. `score` then compares the
sheet with the key: 50% correct means the rater could not tell.

Real cards may only come from open data (the MIMIC-IV demo), because the
rater has signed no data agreement. The key is kept apart from the packet.
The shuffle is seeded, and anyone who knows the seed can rebuild the key,
so a packet meant for a real rater is built with a seed that is not
published.
"""

from __future__ import annotations

import csv
import io
from html import escape

import numpy as np
import pandas as pd
from scipy.stats import binomtest

from nora import schema
from nora.chart import LABS, NAMES

GROUPS = {
    "ischemic": "Ischemic heart disease",
    "heart_failure": "Heart failure",
    "arrhythmia": "Arrhythmia",
    "other": "Other heart disease",
}
STYLE = """body{font-family:Georgia,serif;margin:2rem;color:#111}
.card{border:1px solid #888;padding:1.5rem;margin:0 auto 2rem;max-width:34rem}
.card{page-break-after:always}
h2{margin:0 0 1rem;font-size:1.1rem}table{border-collapse:collapse;width:100%}
td{padding:.25rem .5rem;border-bottom:1px solid #ddd}td:first-child{color:#444;width:55%}"""


def _yes_no(value: float) -> str:
    return "not recorded" if pd.isna(value) else ("yes" if value == 1 else "no")


def _number(value: float, unit: str = "") -> str:
    if pd.isna(value):
        return "not recorded"
    return f"{value:g}{' ' + unit if unit else ''}"


def facts(row: pd.Series) -> list[tuple[str, str]]:
    """What one card shows. Outcomes after discharge are left off."""
    sex = {1.0: "male", 0.0: "female"}.get(row["male"], "not recorded")
    lines = [
        ("Age", _number(row["age"], "years")),
        ("Sex", sex),
        ("Primary diagnosis group", GROUPS[row["dx_group"]]),
        ("Emergency admission", _yes_no(row["emergency"])),
        ("Admissions in the previous year", _number(row["prior_admissions_365d"])),
        ("Length of stay", _number(round(row["los_days"], 1), "days")),
    ]
    lines += [(NAMES[c][0].upper() + NAMES[c][1:], _yes_no(row[c])) for c in NAMES]
    for column in schema.LABS:
        label = LABS[column][2]
        label = label if label.isupper() else label.lower()
        lines.append((f"Last {label}", _number(row[column], LABS[column][3])))
    lines += [
        ("Died in hospital", _yes_no(row["died_in_hospital"])),
        ("Discharged home", _yes_no(row["discharged_home"])),
    ]
    return lines


def build(
    real: pd.DataFrame, synthetic: pd.DataFrame, cards: int, seed: int
) -> tuple[str, str, list]:
    """Return (the packet as HTML, a blank answer sheet as CSV, the key).

    Half the cards are real and half synthetic. With several admissions of
    one patient among the real rows, only one is used, so no two cards
    describe the same person.
    """
    half = cards // 2
    rng = np.random.default_rng(seed)
    real = real.drop_duplicates("patient_id")
    if len(real) < half or len(synthetic) < half:
        raise ValueError(f"{cards} cards need {half} real patients and {half} synthetic admissions")
    chosen = [(real.iloc[i], "real") for i in rng.choice(len(real), half, replace=False)] + [
        (synthetic.iloc[i], "synthetic") for i in rng.choice(len(synthetic), half, replace=False)
    ]
    order = rng.permutation(len(chosen))

    pages, key = [], []
    for number, position in enumerate(order, start=1):
        row, truth = chosen[position]
        lines = "".join(
            f"<tr><td>{escape(label)}</td><td>{escape(value)}</td></tr>"
            for label, value in facts(row)
        )
        pages.append(f'<div class="card"><h2>Card {number}</h2><table>{lines}</table></div>')
        key.append({"card": number, "truth": truth, "admission_id": row["admission_id"]})
    html = (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
        f"<title>Admission cards</title><style>{STYLE}</style></head><body>"
        "<p>Each card describes one hospital admission for heart disease. Some are real "
        "and some were made by a computer. For each card, write <b>real</b> or "
        "<b>synthetic</b> on the answer sheet. There is no time limit.</p>"
        + "".join(pages)
        + "</body></html>\n"
    )
    sheet = io.StringIO()
    writer = csv.writer(sheet, lineterminator="\n")
    writer.writerow(["card", "answer"])
    writer.writerows([[number, ""] for number in range(1, len(key) + 1)])
    return html, sheet.getvalue(), key


def score(key: list[dict], answers: dict[int, str]) -> dict:
    """The rater's accuracy, with an exact 95% binomial interval.

    A card left blank or answered with anything but "real" or "synthetic"
    is an error in the sheet, not a wrong answer.
    """
    truth = {entry["card"]: entry["truth"] for entry in key}
    bad = sorted(
        c for c in truth if answers.get(c, "").strip().lower() not in ("real", "synthetic")
    )
    if bad:
        raise ValueError(f"cards without a real/synthetic answer: {bad}")
    right = sum(answers[c].strip().lower() == truth[c] for c in truth)
    test = binomtest(right, len(truth), 0.5)
    interval = test.proportion_ci(0.95, method="exact")
    return {
        "cards": len(truth),
        "correct": right,
        "accuracy": right / len(truth),
        "accuracy_ci": [float(interval.low), float(interval.high)],
        "p_value_against_guessing": float(test.pvalue),
        "real_called_real": sum(truth[c] == "real" == answers[c].strip().lower() for c in truth),
        "synthetic_called_synthetic": sum(
            truth[c] == "synthetic" == answers[c].strip().lower() for c in truth
        ),
    }
