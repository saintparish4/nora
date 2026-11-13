"""Scoring a synthetic admission table against a real one.

Implements PROTOCOL.md sections 6 to 8. Three questions, three functions:

- `utility`: is a model trained on the synthetic table as good, on real
  held-out patients, as one trained on real data? (train on synthetic, test
  on real, against train on real, test on real)
- `fidelity`: does the synthetic table look like the real one, column by
  column and in how columns move together?
- `privacy`: can someone holding the synthetic table tell which real
  patients it was built from? (a membership inference attack)

The three pull against each other, which is why none is reported alone: a
verbatim copy of the training data is perfect on the first two and fails
the third. `selfcheck` proves each function can fail a table that deserves
to fail before any generator is scored.

Everything is seeded, and nothing here reads the clock or the network, so
the same inputs always give the same numbers.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp, rankdata
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from nora import schema

SEED = 20261110
BOOTSTRAPS = 1000
UTILITY_MARGIN = 0.05
PRIVACY_CEILING = 0.55
# Below this many test admissions in either class a verdict would be noise,
# so none is given (PROTOCOL.md sections 6 and 8).
MIN_PER_CLASS = 30


def design(df: pd.DataFrame) -> np.ndarray:
    """The model matrix: numbers and flags as they are, groups one-hot."""
    parts = [df[schema.NUMERIC + schema.BINARY].to_numpy(dtype=float)]
    for column, levels in schema.CATEGORICAL.items():
        parts += [(df[column] == level).to_numpy(dtype=float)[:, None] for level in levels]
    return np.hstack(parts)


def _auroc(y: np.ndarray, p: np.ndarray) -> float:
    """Area under the ROC curve by ranks (the Mann-Whitney U statistic).

    Written out because the bootstrap calls it thousands of times and the
    library version re-validates its input on every call. NaN when `y` has
    one class, where the area is undefined.
    """
    positives = int(y.sum())
    negatives = len(y) - positives
    if positives == 0 or negatives == 0:
        return float("nan")
    ranks = rankdata(p)[y == 1].sum()
    return float((ranks - positives * (positives + 1) / 2) / (positives * negatives))


def _interval(values: list[float]) -> list[float]:
    values = [v for v in values if not np.isnan(v)]
    if not values:
        return [float("nan"), float("nan")]
    return [float(np.percentile(values, 2.5)), float(np.percentile(values, 97.5))]


def _fit_predict(train: pd.DataFrame, test: pd.DataFrame, outcome: str) -> np.ndarray | None:
    """Predicted risk for `test`, or None when `train` has only one class.

    The model is fixed by the protocol: a logistic regression on median-
    imputed, standardised features. It is deliberately plain, so that a gap
    between two training sets is about the data and not about tuning.
    """
    y = train[outcome].to_numpy()
    if len(y) == 0 or y.min() == y.max():
        return None
    model = make_pipeline(
        SimpleImputer(strategy="median", keep_empty_features=True),
        StandardScaler(),
        LogisticRegression(max_iter=1000),
    )
    return model.fit(design(train), y).predict_proba(design(test))[:, 1]


def utility(
    train: pd.DataFrame, synthetic: pd.DataFrame, test: pd.DataFrame, outcome: str = "readmit_30d"
) -> dict:
    train, synthetic, test = (schema.task_frame(d, outcome) for d in (train, synthetic, test))
    y = test[outcome].to_numpy()
    result = {
        "outcome": outcome,
        "n_train_real": len(train),
        "n_synthetic": len(synthetic),
        "n_test": len(test),
        "n_test_positive": int(y.sum()),
        "margin": UTILITY_MARGIN,
    }
    real, synth = _fit_predict(train, test, outcome), _fit_predict(synthetic, test, outcome)
    if real is None or synth is None or np.isnan(_auroc(y, real)):
        return result | {"passes": False, "reason": "a training or test set has only one class"}
    positives, negatives = int(y.sum()), int(len(y) - y.sum())
    if min(positives, negatives) < MIN_PER_CLASS:
        result["reason"] = (
            f"the test set has {positives} readmitted and {negatives} not readmitted; "
            f"a verdict needs {MIN_PER_CLASS} of each"
        )

    # Resample patients, not admissions: one patient's admissions are not
    # independent, and treating them as such makes the interval too narrow.
    rng = np.random.default_rng(SEED)
    groups = list(test.groupby("patient_id").indices.values())
    gaps = []
    for _ in range(BOOTSTRAPS):
        rows = np.concatenate([groups[i] for i in rng.integers(0, len(groups), len(groups))])
        gaps.append(_auroc(y[rows], synth[rows]) - _auroc(y[rows], real[rows]))
    low, high = _interval(gaps)
    return result | {
        "auroc_train_real": _auroc(y, real),
        "auroc_train_synthetic": _auroc(y, synth),
        "difference": _auroc(y, synth) - _auroc(y, real),
        "difference_ci": [low, high],
        "passes": bool(low > -UTILITY_MARGIN) and "reason" not in result,
    }


def _column_distance(real: pd.Series, synthetic: pd.Series, numeric: bool) -> float:
    """0 when the two columns are distributed alike, 1 when they share nothing.

    Missingness counts: a column that is 5% missing in real data and never
    missing in synthetic data is different by at least 0.05.
    """
    gap = abs(real.isna().mean() - synthetic.isna().mean())
    a, b = real.dropna(), synthetic.dropna()
    if a.empty or b.empty:
        return 0.0 if a.empty and b.empty else 1.0
    if numeric:
        # Only the statistic is used. "asymp" stops scipy warning that its
        # exact p-value, which is never read, could not be computed.
        distance = ks_2samp(a, b, method="asymp").statistic
    else:
        p, q = a.value_counts(normalize=True), b.value_counts(normalize=True)
        distance = 0.5 * p.subtract(q, fill_value=0).abs().sum()
    return float(max(distance, gap))


def _correlation_gap(real: pd.DataFrame, synthetic: pd.DataFrame) -> float:
    columns = schema.NUMERIC + schema.BINARY
    upper = np.triu_indices(len(columns), k=1)
    r = real[columns].corr(method="spearman").fillna(0).to_numpy()[upper]
    s = synthetic[columns].corr(method="spearman").fillna(0).to_numpy()[upper]
    return float(np.abs(r - s).mean())


def _discriminator(real: pd.DataFrame, synthetic: pd.DataFrame) -> float:
    """AUROC of a classifier told to separate real rows from synthetic ones.

    0.5 means it cannot. It sees every feature at once, so it catches what
    the per-column distances miss.
    """
    n = min(len(real), len(synthetic))
    if n < 10:
        return float("nan")
    real = real.sample(n, random_state=SEED)
    synthetic = synthetic.sample(n, random_state=SEED)
    x = np.vstack([design(real), design(synthetic)])
    y = np.r_[np.zeros(n), np.ones(n)]
    forest = RandomForestClassifier(
        n_estimators=100, min_samples_leaf=5, random_state=SEED, n_jobs=-1
    )
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    p = cross_val_predict(forest, x, y, cv=folds, method="predict_proba")[:, 1]
    return _auroc(y, p)


def fidelity(real: pd.DataFrame, synthetic: pd.DataFrame) -> dict:
    columns = {
        c: _column_distance(real[c], synthetic[c], numeric=c in schema.NUMERIC)
        for c in schema.FEATURES + schema.OUTCOMES
    }
    return {
        "columns": columns,
        "marginal": float(np.mean(list(columns.values()))),
        "correlation": _correlation_gap(real, synthetic),
        "discriminator_auroc": _discriminator(real, synthetic),
    }


def _embed(df: pd.DataFrame, low: pd.Series, high: pd.Series) -> np.ndarray:
    """Rows as points where city-block distance means "how different".

    Each number is scaled to 0..1 over the real data's range. A missing
    value becomes 0 plus a flag worth 1, so missing-versus-missing costs
    nothing and missing-versus-present costs at least 1.
    """
    scaled = (df[schema.NUMERIC] - low) / (high - low).replace(0, 1)
    values = pd.concat([scaled.clip(0, 1), df[schema.BINARY]], axis=1)
    groups = [
        0.5 * (df[column] == level).to_numpy(dtype=float)[:, None]
        for column, levels in schema.CATEGORICAL.items()
        for level in levels
    ]
    return np.hstack([values.fillna(0).to_numpy(), values.isna().to_numpy(dtype=float), *groups])


def privacy(train: pd.DataFrame, test: pd.DataFrame, synthetic: pd.DataFrame) -> dict:
    """Membership inference by distance to the closest synthetic record.

    The attacker guesses "this real patient was in the training data" when a
    synthetic record sits unusually close to them. Training patients are the
    members and the locked test patients, whom no generator has seen, are
    the non-members. An AUROC of 0.5 means the guess is no better than a
    coin; the protocol passes a table only when the whole interval is at or
    under PRIVACY_CEILING, so too little data fails rather than passes.

    A result that carries a "reason" was not assessable: the numbers are
    still reported, and `passes` is False.
    """
    real = pd.concat([train, test])
    low, high = real[schema.NUMERIC].min(), real[schema.NUMERIC].max()
    index = NearestNeighbors(n_neighbors=1, metric="manhattan").fit(_embed(synthetic, low, high))
    distance = index.kneighbors(_embed(real, low, high))[0][:, 0]
    member = np.r_[np.ones(len(train)), np.zeros(len(test))]

    rng = np.random.default_rng(SEED)
    resampled = []
    for _ in range(BOOTSTRAPS):
        rows = rng.integers(0, len(member), len(member))
        resampled.append(_auroc(member[rows], -distance[rows]))
    low_ci, high_ci = _interval(resampled)
    result = {}
    if min(len(train), len(test)) < MIN_PER_CLASS:
        result["reason"] = (
            f"{len(train)} training and {len(test)} test admissions; "
            f"a verdict needs {MIN_PER_CLASS} of each"
        )
    return result | {
        "attack_auroc": _auroc(member, -distance),
        "attack_auroc_ci": [low_ci, high_ci],
        "ceiling": PRIVACY_CEILING,
        "train_rows_copied": float((distance[member == 1] < 1e-9).mean()),
        "test_rows_copied": float((distance[member == 0] < 1e-9).mean()),
        "passes": bool(high_ci <= PRIVACY_CEILING) and "reason" not in result,
    }


def scorecard(train: pd.DataFrame, test: pd.DataFrame, synthetic: pd.DataFrame) -> dict:
    """Everything the protocol reports for one synthetic table.

    `floor` is real test data scored as if it were synthetic: the distance
    two honest samples of the same hospital show by chance. A generator is
    judged against that, not against zero.
    """
    return {
        "utility": utility(train, synthetic, test),
        "fidelity": fidelity(train, synthetic),
        "privacy": privacy(train, test, synthetic),
        "floor": {"fidelity": fidelity(train, test)},
    }
