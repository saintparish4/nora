"""The ConText filter and the medspaCy baseline for the evidence eval.

Both are specified in ../PLAN-2026-10-22.md, written before either ran. Change
nothing here without a new dated plan.

    nora_context.py filter   --rules ../rules --model ../model_alone --out keep.jsonl
    nora_context.py baseline --rules ../rules --out proposals.jsonl

Criteria and their vocabulary are read from the rule round's traces (each
trace carries the criteria it was graded against, hints included), so this
shares the rule pass's word lists exactly. Documents come from the same
traces, already normalised the way the harness normalises them, so offsets
written here are offsets the Ruby grader understands.
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

import medspacy
from medspacy.target_matcher import TargetRule

EXCLUDING = ("is_negated", "is_uncertain", "is_hypothetical", "is_family")
OUTCOME_CUES = ("stopped", "discontinued", "d/c", "lost", "loss", "no weight", "side effect", "intolerance", "nausea", "because")
BMI_VALUE = re.compile(r"(?:\bBMI\b|body mass index)\D{0,20}?(\d{2}(?:\.\d+)?)", re.IGNORECASE)
Z68 = re.compile(r"\bZ68\.(\d)(\d)\b")


def role(criterion):
    hint = criterion.get("hint") or {}
    kind = criterion["kind"]
    if kind == "documented_value":
        return "bmi"
    if kind == "diagnosis":
        return "comorbidity" if criterion.get("optional") else "diagnosis"
    if kind == "prior_trial":
        return "second_trial" if hint.get("min_distinct") else "trial"
    return {"lifestyle": "lifestyle", "other": "glp1"}[kind]


def targets(criterion):
    """(literal, label) pairs for one criterion, from its hint."""
    hint = criterion.get("hint") or {}
    kind = role(criterion)
    if kind == "bmi":
        return [(t, "BMI") for t in ("BMI", "body mass index")] + [(t, "COMORBIDITY") for t in hint.get("comorbidity_terms", [])]
    if kind in ("diagnosis", "comorbidity"):
        return [(t, "DX") for t in hint.get("terms", [])]
    if kind == "lifestyle":
        activity = hint.get("also_requires", [])
        diet = [t for t in hint.get("terms", []) if t not in activity and t != "lifestyle"]
        return [(t, "DIET") for t in diet] + [(t, "ACTIVITY") for t in activity]
    if kind in ("trial", "second_trial"):
        return [(name, f"DRUG{i}") for i, group in enumerate(hint.get("drugs", [])) for name in group]
    return [(t, "GLP1") for t in hint.get("terms", [])]


_pipelines = {}


def pipeline(criterion):
    key = json.dumps(targets(criterion), sort_keys=True)
    if key not in _pipelines:
        nlp = medspacy.load()
        nlp.get_pipe("medspacy_target_matcher").add([TargetRule(literal, label) for literal, label in targets(criterion)])
        _pipelines[key] = nlp
    return _pipelines[key]


def affirmed(ent, allow_historical):
    if any(getattr(ent._, attr) for attr in EXCLUDING):
        return False
    return allow_historical or not ent._.is_historical


def keeps(criterion, text):
    """The filter rule for one model excerpt (PLAN, condition F)."""
    kind = role(criterion)
    ents = list(pipeline(criterion)(text).ents)
    if not ents:
        return False
    if kind == "glp1":
        return any(e._.is_negated for e in ents)
    return any(affirmed(e, allow_historical=kind != "bmi") for e in ents)


def load_traces(round_dir, rep):
    traces = {}
    for path in sorted(Path(round_dir, "traces").glob(f"*_rep{rep}.json")):
        trace = json.loads(path.read_text())
        traces[trace["case_id"]] = trace
    if not traces:
        sys.exit(f"no traces for rep {rep} under {round_dir}")
    return traces


def reps(round_dir):
    return sorted({int(p.stem.rsplit("_rep", 1)[1]) for p in Path(round_dir, "traces").glob("*.json")})


def run_filter(args):
    rules = load_traces(args.rules, 0)
    with open(args.out, "w") as out:
        for rep in reps(args.model):
            for case_id, trace in load_traces(args.model, rep).items():
                criteria = rules[case_id]["criteria"]
                for requirement in trace["requirements"]:
                    criterion = criteria[str(requirement["position"])]
                    for p in requirement["proposals"]:
                        if p["source"] != "ai":
                            continue
                        out.write(json.dumps({"case_id": case_id, "rep": rep, "position": requirement["position"],
                                              "document": p["document"], "start": p["start"], "finish": p["finish"],
                                              "keep": keeps(criterion, p["excerpt"])}) + "\n")


def bmi_value(text):
    match = BMI_VALUE.search(text)
    if match:
        return float(match.group(1))
    code = Z68.search(text)
    if code:
        return float(code.group(1) + code.group(2))
    return None


def within_six_months(occurred_on, as_of):
    occurred, request = date.fromisoformat(str(occurred_on)), date.fromisoformat(str(as_of))
    months = (request.year - occurred.year) * 12 + (request.month - occurred.month)
    return months < 6 or (months == 6 and occurred.day >= request.day)


def sentences(criterion, trace):
    nlp = pipeline(criterion)
    for document in trace["documents"]:
        doc = nlp(document["body"])
        for sent in doc.sents:
            text = sent.text.rstrip()
            if text:
                yield document, sent.start_char, sent.start_char + len(text), text, [e for e in sent.ents]


def propose(criterion, trace):
    kind = role(criterion)
    found = []
    if kind == "bmi":
        comorbid = any(e.label_ == "COMORBIDITY" and affirmed(e, True) for _, _, _, _, ents in sentences(criterion, trace) for e in ents)
        for document, start, finish, text, ents in sentences(criterion, trace):
            if not any(e.label_ == "BMI" and affirmed(e, False) for e in ents) and not Z68.search(text):
                continue
            value = bmi_value(text)
            if value is None or not within_six_months(document["occurred_on"], trace["as_of"]):
                continue
            if value >= 30 or (27 <= value < 30 and comorbid):
                found.append((document["key"], start, finish, text))
    elif kind in ("diagnosis", "comorbidity"):
        found = [(d["key"], s, f, t) for d, s, f, t, ents in sentences(criterion, trace) if any(affirmed(e, True) for e in ents)]
    elif kind == "lifestyle":
        for d, s, f, t, ents in sentences(criterion, trace):
            labels = {e.label_ for e in ents if affirmed(e, True)}
            if {"DIET", "ACTIVITY"} <= labels:
                found.append((d["key"], s, f, t))
    elif kind in ("trial", "second_trial"):
        groups = set()
        for d, s, f, t, ents in sentences(criterion, trace):
            drugs = {e.label_ for e in ents if affirmed(e, True)}
            if drugs and any(cue in t.lower() for cue in OUTCOME_CUES):
                found.append((d["key"], s, f, t))
                groups |= drugs
        if kind == "second_trial" and len(groups) < 2:
            found = []
    else:
        found = [(d["key"], s, f, t) for d, s, f, t, ents in sentences(criterion, trace) if any(e._.is_negated for e in ents)]
    return found


def run_baseline(args):
    with open(args.out, "w") as out:
        for case_id, trace in load_traces(args.rules, 0).items():
            for position, criterion in trace["criteria"].items():
                for document, start, finish, text in propose(criterion, trace):
                    out.write(json.dumps({"case_id": case_id, "rep": 0, "position": int(position), "document": document,
                                          "start": start, "finish": finish, "excerpt": text}) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    f = sub.add_parser("filter")
    f.add_argument("--rules", required=True)
    f.add_argument("--model", required=True)
    f.add_argument("--out", required=True)
    b = sub.add_parser("baseline")
    b.add_argument("--rules", required=True)
    b.add_argument("--out", required=True)
    args = parser.parse_args()
    {"filter": run_filter, "baseline": run_baseline}[args.command](args)


if __name__ == "__main__":
    main()
