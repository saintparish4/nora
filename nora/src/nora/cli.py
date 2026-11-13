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
import sys
from pathlib import Path

import pandas as pd

from nora import generate, mimic, records, schema, score, selfcheck, split, synthea, validate

DATA = Path("data")
RESULTS = Path("results")
BASELINES = Path("baselines")
GENERATED = Path("generated")
LOCK = Path("protocol/lock.json")
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
    table = mimic.load(args.mimic, args.name)
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
    table = generate.sample(generate.fit(train), args.rows, args.seed, args.system)
    out = GENERATED / args.system / "admissions.csv"
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


def run_validate(args: argparse.Namespace) -> None:
    report = validate.run(args.bundles)
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
    if report["errors"]:
        sys.exit(1)


def run_score(args: argparse.Namespace) -> None:
    train = read_table(DATA / args.name / "train.csv")
    test = read_table(DATA / args.name / "test.csv")
    split.verify(pd.concat([train, test]), args.name, LOCK, PROTOCOL)
    synthetic = read_table(args.synthetic)
    card = score.scorecard(train, test, synthetic)
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
    for size, card in cards.items():
        print(f"[fit to {size} admissions]")
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
    p.add_argument("--mimic", type=Path, required=True, help="directory that contains hosp/")
    p.add_argument("--name", required=True, help="dataset name, e.g. mimic-iv-demo-2.2")
    p.set_defaults(run=cohort)

    p = commands.add_parser("synthea", help="map a Synthea CSV export to the admission table")
    p.add_argument("--csv", type=Path, required=True, help="Synthea's output/csv directory")
    p.set_defaults(run=run_synthea)

    p = commands.add_parser("generate", help="fit the generator to a locked dataset and sample")
    p.add_argument("--name", required=True, help="the locked dataset to fit to (training side)")
    p.add_argument("--rows", type=int, default=1000, help="synthetic admissions to draw")
    p.add_argument("--seed", type=int, default=20261113)
    p.add_argument("--system", default="copula-v1", help="label for this generator")
    p.set_defaults(run=run_generate)

    p = commands.add_parser("render", help="write FHIR bundles, notes and answer keys")
    p.add_argument("--table", type=Path, required=True, help="admission table as CSV")
    p.add_argument("--out", type=Path, required=True, help="directory to write into")
    p.add_argument("--limit", type=int, help="only the first N admissions")
    p.set_defaults(run=run_render)

    p = commands.add_parser("validate", help="run the HL7 validator over rendered bundles")
    p.add_argument("--bundles", type=Path, required=True, help="directory of bundles")
    p.add_argument("--system", required=True, help="label for the generator, e.g. copula-v1")
    p.set_defaults(run=run_validate)

    p = commands.add_parser("score", help="score a synthetic table against a locked dataset")
    p.add_argument("--name", required=True, help="the locked dataset to score against")
    p.add_argument("--synthetic", type=Path, required=True, help="admission table as CSV")
    p.add_argument("--system", required=True, help="label for the generator, e.g. synthea")
    p.set_defaults(run=run_score)

    p = commands.add_parser("selfcheck", help="prove the scorer on tables with known verdicts")
    p.add_argument("--generator", action="store_true", help="score our generator by training size")
    p.set_defaults(run=run_selfcheck)

    args = parser.parse_args()
    try:
        args.run(args)
    except (ValueError, FileNotFoundError) as error:
        sys.exit(f"nora: {error}")
