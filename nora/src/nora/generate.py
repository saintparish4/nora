"""The generator: a Gaussian copula fit to a real admission table.

PROTOCOL.md section 10 says a generator of ours has to beat Synthea on the
same scorecard. This is the first one, and it is deliberately the simplest
model that can: every column keeps the distribution it has in the real
table, and one correlation matrix says how the columns move together.

How it works. Each column is turned into a standard normal "latent" score
(a number by its rank, a flag by which side of a threshold it falls on).
Each diagnosis group gets its own latent mean, so heart failure admissions
can differ from ischemic ones. One correlation matrix, shared by all
groups, is estimated from what is left. A synthetic admission is a group
drawn by frequency, a latent vector drawn from that group's normal
distribution, and each latent score mapped back to a real-world value.

It is fit to training rows only (PROTOCOL.md section 5), and it has to work
on very little data: the open demo gives 42 admissions. Three choices
follow from that. Group means are pulled toward the whole table by PRIOR
pseudo-admissions. The correlation matrix is shrunk by the Ledoit-Wolf
rule, which needs no tuning. And values are drawn between observed values,
never outside their range, so the model cannot invent an implausible lab.

Known limits: missing values are drawn independently per column, though in
real charts labs go missing together; and every synthetic patient has
exactly one admission.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.stats import norm, rankdata
from sklearn.covariance import LedoitWolf

from nora import schema

FLAGS = schema.BINARY + schema.OUTCOMES
LATENT = schema.NUMERIC + FLAGS
PRIOR = 10
# Real values come in steps: whole years, a creatinine to one decimal, a
# stay to the minute. A column is rounded to the coarsest of these steps
# that every real value sits on, so a creatinine of 1.2374 cannot give a
# synthetic row away at a glance.
STEPS = [1, 0.1, 0.01, 1 / 1440]


@dataclass
class Model:
    groups: dict[str, float]  # P(dx_group)
    shift: dict[str, np.ndarray]  # latent mean of each group, one entry per LATENT column
    chol: np.ndarray  # Cholesky factor of the latent correlation matrix
    center: np.ndarray  # mean and spread of each latent score over all groups,
    spread: np.ndarray  # used to turn a number's latent score into a percentile
    values: dict[str, np.ndarray]  # sorted real values of each numeric column
    step: dict[str, float]  # the step each numeric column is rounded to, if any
    threshold: dict[str, float]  # a flag is 1 when its latent score is above this
    missing: dict[str, float]  # share of rows where the column is missing


def _rate(ones: float, n: float) -> float:
    """A smoothed proportion that is never exactly 0 or 1."""
    return (ones + 0.5) / (n + 1)


def _step(x: np.ndarray) -> float | None:
    for step in STEPS:
        if len(x) and np.abs(x / step - np.round(x / step)).max() < 1e-6:
            return step
    return None


def fit(train: pd.DataFrame) -> Model:
    n = len(train)
    scores = np.zeros((n, len(LATENT)))  # a missing value keeps the score 0, the mean
    attenuation = np.ones(len(LATENT))
    values, threshold = {}, {}
    for j, column in enumerate(LATENT):
        seen = train[column].notna().to_numpy()
        x = train.loc[seen, column].to_numpy()
        if column in schema.NUMERIC:
            values[column] = np.sort(x)
            scores[seen, j] = norm.ppf(rankdata(x) / (len(x) + 1))
        else:
            p = _rate(x.sum(), len(x))
            t = threshold[column] = norm.ppf(1 - p)
            # The mean latent score on each side of the threshold.
            scores[seen, j] = np.where(x == 1, norm.pdf(t) / p, -norm.pdf(t) / (1 - p))
            # A flag shows only part of the correlation its latent score has.
            attenuation[j] = norm.pdf(t) / np.sqrt(p * (1 - p))

    counts = train["dx_group"].value_counts()
    groups = {g: (counts.get(g, 0) + 1) / (n + len(schema.DX_GROUPS)) for g in schema.DX_GROUPS}
    shift, residual = {}, scores.copy()
    for g in schema.DX_GROUPS:
        rows = (train["dx_group"] == g).to_numpy()
        weight = rows.sum() / (rows.sum() + PRIOR)
        mean = weight * scores[rows].mean(axis=0) if rows.any() else np.zeros(len(LATENT))
        residual[rows] -= mean
        shift[g] = mean.copy()
        for j, column in enumerate(LATENT):
            if column in FLAGS:
                # For a flag, shift the latent mean so the group has its own rate.
                x = train.loc[rows, column].dropna()
                p = norm.cdf(-threshold[column])
                p_group = (x.sum() + PRIOR * p) / (len(x) + PRIOR)
                shift[g][j] = norm.ppf(p_group) - norm.ppf(p)

    corr = _correlation(LedoitWolf().fit(residual).covariance_, attenuation)
    mix = np.array([groups[g] for g in schema.DX_GROUPS])
    means = np.array([shift[g] for g in schema.DX_GROUPS])
    center = mix @ means
    spread = np.sqrt(1 + mix @ means**2 - center**2)
    missing = {c: float(train[c].isna().mean()) for c in schema.FEATURES}
    step = {c: _step(x) for c, x in values.items()}
    chol = np.linalg.cholesky(corr)
    return Model(groups, shift, chol, center, spread, values, step, threshold, missing)


def _correlation(covariance: np.ndarray, attenuation: np.ndarray) -> np.ndarray:
    """A valid correlation matrix for the latent scores."""
    sd = np.sqrt(np.diag(covariance))
    sd[sd == 0] = 1  # a column with no values at all: uncorrelated with everything
    corr = covariance / np.outer(sd, sd) / np.outer(attenuation, attenuation)
    corr = np.clip(corr, -0.9, 0.9)
    np.fill_diagonal(corr, 1)
    # Undoing the attenuation can leave a matrix no data could produce;
    # lifting its negative eigenvalues gives the nearest one that could.
    eigenvalues, vectors = np.linalg.eigh(corr)
    corr = vectors @ np.diag(np.clip(eigenvalues, 1e-3, None)) @ vectors.T
    sd = np.sqrt(np.diag(corr))
    return corr / np.outer(sd, sd)


def sample(model: Model, n: int, seed: int, source: str) -> pd.DataFrame:
    """Draw `n` synthetic admissions. The same seed gives the same table."""
    rng = np.random.default_rng(seed)
    group = rng.choice(schema.DX_GROUPS, n, p=[model.groups[g] for g in schema.DX_GROUPS])
    latent = rng.standard_normal((n, len(LATENT))) @ model.chol.T
    latent += np.array([model.shift[g] for g in group])
    percentile = norm.cdf((latent - model.center) / model.spread)

    out = pd.DataFrame({"source": source, "dx_group": group}, index=range(n))
    out["patient_id"] = [f"{source}-{i:05d}" for i in range(n)]
    out["admission_id"] = out["patient_id"] + "-1"
    for j, column in enumerate(LATENT):
        if column in schema.NUMERIC:
            real = model.values[column]
            if len(real) == 0:
                out[column] = np.nan
                continue
            at = (np.arange(len(real)) + 0.5) / len(real)
            out[column] = np.interp(percentile[:, j], at, real)
            if step := model.step[column]:
                out[column] = ((out[column] / step).round() * step).round(9)
        else:
            out[column] = (latent[:, j] > model.threshold[column]).astype(float)
    for column, share in model.missing.items():
        if column != "dx_group":
            out.loc[rng.random(n) < share, column] = np.nan
    # Two things no real table holds: a death followed by a readmission, and
    # a death recorded as a discharge home.
    died = out["died_in_hospital"] == 1
    out.loc[died, "readmit_30d"] = np.nan
    out.loc[died & out["discharged_home"].notna(), "discharged_home"] = 0.0
    return schema.conform(out)
