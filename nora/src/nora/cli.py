"""The `nora` command: the only way results are produced.

Each subcommand is one protocol step run from the project root, and each
refuses to continue when a lock does not hold. Real data is read from and
written to `data/`, which git ignores. Scores go to `results/`, simulated
baseline tables to `baselines/` and our own generator's output to
`generated/`; all three are committed.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import pandas as pd

from nora import (
    defects,
    eicu,
    generate,
    mimic,
    packet,
    records,
    schema,
    score,
    selfcheck,
    split,
    synthea,
    validate,
)

DATA = Path("data")
RESULTS = Path("results")
BASELINES = Path("baselines")
GENERATED = Path("generated")
LOCK = Path("protocol/lock.json")
KEY = "answers.key.json"  # the answer key written beside defective bundles
PROTOCOL = Path("PROTOCOL.md")


def read_table(path: Path) -> pd.DataFrame:
    return schema.conform(pd.read_csv(path, dtype=dict.fromkeys(schema.IDS, str)))


def verdict(part: dict) -> str:
    """PASS, FAIL, or NOT ASSESSABLE when the scorer gave a reason instead."""
    if "reason" in part:
        return f"NOT ASSESSABLE ({part['reason']})"
    return "PASS" if part["passes"] else "FAIL"


def summary(card: dict) -> str:
    u, f, p = card["utility"], card["fidelity"], card["privacy"]
    floor = card["floor"]["fidelity"]
    if "difference" in u:
        low, high = u["difference_ci"]
        utility = (
            f"AUROC trained on real {u['auroc_train_real']:.3f}, on synthetic "
            f"{u['auroc_train_synthetic']:.3f}, difference {u['difference']:+.3f} "
            f"[{low:+.3f}, {high:+.3f}]"
        )
    else:
        utility = "AUROC undefined"
    low, high = p["attack_auroc_ci"]
    return "\n".join(
        [
            f"utility   {utility} (margin {u['margin']})",
            f"          {verdict(u)}",
            f"fidelity  marginal {f['marginal']:.3f} (floor {floor['marginal']:.3f}), "
            f"correlation {f['correlation']:.3f} (floor {floor['correlation']:.3f}), "
            f"discriminator {f['discriminator_auroc']:.3f} "
            f"(floor {floor['discriminator_auroc']:.3f})",
            f"privacy   attack AUROC {p['attack_auroc']:.3f} [{low:.3f}, {high:.3f}] "
            f"(ceiling {p['ceiling']}); "
            f"copied train {p['train_rows_copied']:.1%}, test {p['test_rows_copied']:.1%}",
            f"          {verdict(p)}",
        ]
    )


def cohort(args: argparse.Namespace) -> None:
    if bool(args.mimic) == bool(args.eicu):
        raise ValueError("give exactly one of --mimic and --eicu")
    table = mimic.load(args.mimic, args.name) if args.mimic else eicu.load(args.eicu, args.name)
    if LOCK.exists() and args.name in json.loads(LOCK.read_text()):
        split.verify(table, args.name, LOCK, PROTOCOL)
        state = "matches its lock"
    else:
        split.lock(table, args.name, LOCK, PROTOCOL)
        state = "locked"
    train, test = split.split(table)
    out = DATA / args.name
    out.mkdir(parents=True, exist_ok=True)
    train.to_csv(out / "train.csv", index=False)
    test.to_csv(out / "test.csv", index=False)
    known = table["readmit_30d"].notna()
    print(
        f"{args.name}: {len(table)} admissions, {table['patient_id'].nunique()} patients; {state}"
    )
    print(f"  train {len(train)}, test {len(test)}")
    print(f"  died in hospital {int(table['died_in_hospital'].sum())}")
    print(f"  readmitted within 30 days {int(table['readmit_30d'].sum())} of {int(known.sum())}")


def run_synthea(args: argparse.Namespace) -> None:
    table = synthea.load(args.csv)
    out = BASELINES / "synthea" / "admissions.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(out, index=False)
    known = table["readmit_30d"].notna()
    print(f"synthea: {len(table)} stays, {table['patient_id'].nunique()} patients -> {out}")
    print(f"  by diagnosis group {table['dx_group'].value_counts().to_dict()}")
    print(f"  died in hospital {int(table['died_in_hospital'].sum())}")
    print(f"  readmitted within 30 days {int(table['readmit_30d'].sum())} of {int(known.sum())}")
    print(f"  implausible lab values blanked {table.attrs['implausible_labs']}")
    print(f"  table sha256 {split.digest(table)}")


def run_generate(args: argparse.Namespace) -> None:
    train = read_table(DATA / args.name / "train.csv")
    test = read_table(DATA / args.name / "test.csv")
    split.verify(pd.concat([train, test]), args.name, LOCK, PROTOCOL)
    # Fit to the training side only: the test set is for scoring.
    model = generate.fit(train, generate.SYSTEMS[args.system])
    table = generate.sample(model, args.rows, args.seed, args.system)
    out = GENERATED / args.name / args.system / "admissions.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(out, index=False)
    known = table["readmit_30d"].notna()
    print(f"{args.system}: fit to {len(train)} training admissions of {args.name}")
    print(f"  {len(table)} synthetic admissions, seed {args.seed} -> {out}")
    print(f"  by diagnosis group {table['dx_group'].value_counts().to_dict()}")
    print(f"  died in hospital {int(table['died_in_hospital'].sum())}")
    print(f"  readmitted within 30 days {int(table['readmit_30d'].sum())} of {int(known.sum())}")
    print(f"  table sha256 {split.digest(table)}")


def run_render(args: argparse.Namespace) -> None:
    table = read_table(args.table)
    count = records.write(table.head(args.limit) if args.limit else table, args.out)
    print(f"{count} admissions -> {args.out} (a FHIR bundle, a note and an answer key each)")
    print("  every bundle reads back as its table row")


def run_defects(args: argparse.Namespace) -> None:
    paths = sorted(p for p in args.records.glob("*.json") if not p.name.endswith(".key.json"))
    clean = {p.name.removesuffix(".json"): json.loads(p.read_text()) for p in paths}
    bundles, key = defects.inject(clean, args.seed, args.share)
    args.out.mkdir(parents=True, exist_ok=True)
    for name, bundle in bundles.items():
        (args.out / f"{name}.json").write_text(json.dumps(bundle, indent=2) + "\n")
    (args.out / KEY).write_text(json.dumps(key, indent=2) + "\n")
    print(f"{len(clean)} clean bundles -> {len(bundles)} in {args.out}, answer key in {KEY}")
    for kind in defects.KINDS:
        print(f"  {sum(entry['kind'] == kind for entry in key):5d}  {kind}")


def run_validate(args: argparse.Namespace) -> None:
    report = validate.run(args.bundles)
    if (args.bundles / KEY).exists():
        # These bundles hold planted defects: say which ones the validator caught.
        key = json.loads((args.bundles / KEY).read_text())
        names = {p.name.removesuffix(".json") for p in args.bundles.glob("*.json")} - {KEY[:-5]}
        report["defects"] = defects.detection(key, set(report["bundles_with_errors"]), names)
    out = RESULTS / "fhir-validation" / f"{args.system}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(f"HL7 validator {report['validator']}, {report['implementation_guide']} -> {out}")
    print(
        f"  {report['bundles']} bundles: {report['errors']} errors, "
        f"{report['warnings']} warnings, {report['information']} information messages"
    )
    for kind, count in report["messages"].items():
        print(f"  {count:6d}  {kind[:150]}")
    for kind, found in report.get("defects", {}).items():
        total = found.get("planted", found.get("bundles"))
        print(f"  {kind}: {found['flagged']} of {total} bundles reported with an error")
    if report["errors"] and "defects" not in report:
        sys.exit(1)


def run_packet(args: argparse.Namespace) -> None:
    if args.answers:
        key = json.loads((args.out / "key.json").read_text())
        sheet = pd.read_csv(args.answers, dtype=str).fillna("")
        result = packet.score(
            key, dict(zip(sheet["card"].astype(int), sheet["answer"], strict=True))
        )
        low, high = result["accuracy_ci"]
        right, cards = result["correct"], result["cards"]
        print(f"{right} of {cards} cards right: accuracy {result['accuracy']:.2f}")
        print(f"  95% interval [{low:.2f}, {high:.2f}]; 0.50 means the rater could not tell")
        return
    real = pd.concat([read_table(DATA / args.name / f"{side}.csv") for side in ("train", "test")])
    seed = args.seed if args.seed is not None else int.from_bytes(os.urandom(4))
    html, sheet, key = packet.build(real, read_table(args.synthetic), args.cards, seed)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "packet.html").write_text(html)
    (args.out / "answer_sheet.csv").write_text(sheet)
    (args.out / "key.json").write_text(json.dumps(key, indent=2) + "\n")
    print(f"{len(key)} cards -> {args.out}/packet.html and answer_sheet.csv")
    print("  key.json is the answer: keep it away from the rater")


def run_score(args: argparse.Namespace) -> None:
    train = read_table(DATA / args.name / "train.csv")
    test = read_table(DATA / args.name / "test.csv")
    split.verify(pd.concat([train, test]), args.name, LOCK, PROTOCOL)
    synthetic = read_table(args.synthetic)
    card = score.scorecard(train, test, synthetic, args.outcome)
    card |= {
        "dataset": args.name,
        "system": args.system,
        "synthetic_rows": len(synthetic),
        "synthetic_sha256": split.digest(synthetic),
    }
    out = RESULTS / args.name / f"{args.system}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(card, indent=2, sort_keys=True) + "\n")
    print(f"{args.system} against {args.name} -> {out}")
    print(summary(card))


def run_generator_check() -> None:
    cards = selfcheck.generator_by_size()
    out = RESULTS / "fixture" / "copula-by-training-size.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(cards, indent=2, sort_keys=True) + "\n")
    print(f"the generator on the known process, by training size -> {out}")
    for size, systems in cards.items():
        for name, card in systems.items():
            print(f"[{name}, {size} training admissions]")
            print(summary(card))
    problems = selfcheck.generator_failures(cards)
    for problem in problems:
        print(f"WRONG  {problem}")
    if problems:
        sys.exit(1)
    print(f"generator check passed at {max(cards)} admissions; read the smaller sizes as they came")


def run_selfcheck(args: argparse.Namespace) -> None:
    if args.generator:
        return run_generator_check()
    cards = selfcheck.run()
    for name, card in cards.items():
        print(f"[{name}]")
        print(summary(card))
    problems = selfcheck.failures(cards)
    for problem in problems:
        print(f"WRONG VERDICT  {problem}")
    if problems:
        sys.exit(1)
    print("self-check passed: every stand-in got its known verdict")


def main() -> None:
    parser = argparse.ArgumentParser(prog="nora", description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(required=True)

    p = commands.add_parser("cohort", help="build, lock and split a real dataset")
    p.add_argument("--mimic", type=Path, help="a MIMIC-IV directory, the one that contains hosp/")
    p.add_argument("--eicu", type=Path, help="an eICU-CRD directory of CSV files")
    p.add_argument("--name", required=True, help="dataset name, e.g. mimic-iv-demo-2.2")
    p.set_defaults(run=cohort)

    p = commands.add_parser("synthea", help="map a Synthea CSV export to the admission table")
    p.add_argument("--csv", type=Path, required=True, help="Synthea's output/csv directory")
    p.set_defaults(run=run_synthea)

    p = commands.add_parser("generate", help="fit the generator to a locked dataset and sample")
    p.add_argument("--name", required=True, help="the locked dataset to fit to (training side)")
    p.add_argument("--rows", type=int, default=1000, help="synthetic admissions to draw")
    p.add_argument("--seed", type=int, default=20261113)
    p.add_argument("--system", default="copula-v2", choices=list(generate.SYSTEMS))
    p.set_defaults(run=run_generate)

    p = commands.add_parser("render", help="write FHIR bundles, notes and answer keys")
    p.add_argument("--table", type=Path, required=True, help="admission table as CSV")
    p.add_argument("--out", type=Path, required=True, help="directory to write into")
    p.add_argument("--limit", type=int, help="only the first N admissions")
    p.set_defaults(run=run_render)

    p = commands.add_parser("defects", help="plant defects in clean bundles, with an answer key")
    p.add_argument("--records", type=Path, required=True, help="directory of clean bundles")
    p.add_argument("--out", type=Path, required=True, help="directory to write into")
    p.add_argument("--seed", type=int, default=20261113)
    p.add_argument("--share", type=float, default=0.1, help="share of admissions per defect")
    p.set_defaults(run=run_defects)

    p = commands.add_parser("validate", help="run the HL7 validator over rendered bundles")
    p.add_argument("--bundles", type=Path, required=True, help="directory of bundles")
    p.add_argument("--system", required=True, help="label for the generator, e.g. copula-v1")
    p.set_defaults(run=run_validate)

    p = commands.add_parser("packet", help="build the blind real-or-synthetic packet, or score it")
    p.add_argument("--out", type=Path, required=True, help="directory for the packet and its key")
    p.add_argument("--name", help="the locked open dataset the real cards come from")
    p.add_argument("--synthetic", type=Path, help="admission table as CSV")
    p.add_argument("--cards", type=int, default=40)
    p.add_argument("--seed", type=int, help="omit for a packet whose key cannot be rebuilt")
    p.add_argument("--answers", type=Path, help="a filled answer sheet: score it instead")
    p.set_defaults(run=run_packet)

    p = commands.add_parser("score", help="score a synthetic table against a locked dataset")
    p.add_argument("--name", required=True, help="the locked dataset to score against")
    p.add_argument("--synthetic", type=Path, required=True, help="admission table as CSV")
    p.add_argument("--system", required=True, help="label for the generator, e.g. synthea")
    p.add_argument("--outcome", default="readmit_30d", choices=schema.OUTCOMES)
    p.set_defaults(run=run_score)

    p = commands.add_parser("selfcheck", help="prove the scorer on tables with known verdicts")
    p.add_argument("--generator", action="store_true", help="score our generator by training size")
    p.set_defaults(run=run_selfcheck)

    args = parser.parse_args()
    try:
        args.run(args)
    except (ValueError, FileNotFoundError) as error:
        sys.exit(f"nora: {error}")
