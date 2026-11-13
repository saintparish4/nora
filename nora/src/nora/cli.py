"""The `nora` command: the only way results are produced.

Each subcommand is one protocol step run from the project root, and each
refuses to continue when a lock does not hold. Real data is read from and
written to `data/`, which git ignores. Scores go to `results/` and simulated
baseline tables to `baselines/`; both are committed.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

from nora import mimic, schema, score, selfcheck, split, synthea

DATA = Path("data")
RESULTS = Path("results")
BASELINES = Path("baselines")
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


def run_selfcheck(_: argparse.Namespace) -> None:
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

    p = commands.add_parser("score", help="score a synthetic table against a locked dataset")
    p.add_argument("--name", required=True, help="the locked dataset to score against")
    p.add_argument("--synthetic", type=Path, required=True, help="admission table as CSV")
    p.add_argument("--system", required=True, help="label for the generator, e.g. synthea")
    p.set_defaults(run=run_score)

    p = commands.add_parser("selfcheck", help="prove the scorer on tables with known verdicts")
    p.set_defaults(run=run_selfcheck)

    args = parser.parse_args()
    try:
        args.run(args)
    except (ValueError, FileNotFoundError) as error:
        sys.exit(f"nora: {error}")
