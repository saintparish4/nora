"""A made-up admission process with known answers. Not a generator.

The scorer has to be shown to work before it is trusted with a real
question (PROTOCOL.md section 9). That needs data where the truth is known
in advance: here readmission really does depend on heart failure, kidney
disease, creatinine and prior admissions, with coefficients written below,
and a fresh sample is by construction a perfect, private "synthetic" copy
of an earlier one. `selfcheck` builds its stand-in systems from this.

The numbers are invented to be roughly hospital-shaped. Nothing here was
fit to patient data, and nothing here is ever scored as a result.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from nora import schema


def sample(n: int, seed: int, source: str = "fixture") -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    def flag(p):
        return (rng.random(n) < p).astype(float)

    age = np.clip(rng.normal(70, 12, n), 18, 100).round()
    group = rng.choice(schema.DX_GROUPS, n, p=[0.35, 0.35, 0.15, 0.15])
    hf = (group == "heart_failure").astype(float)
    ckd = flag(np.clip(0.10 + 0.005 * (age - 50), 0.02, 0.6))
    creatinine = np.clip(np.exp(rng.normal(0.6 * ckd, 0.25)), 0.3, 12)
    prior = rng.poisson(0.4 + 0.5 * hf).astype(float)
    home = flag(np.clip(0.80 - 0.005 * (age - 50), 0.2, 0.95))
    died = flag(0.03 + 0.04 * ckd)

    logit = (
        -2.6 + 0.9 * hf + 0.7 * ckd + 0.5 * prior + 0.6 * (creatinine - 1)
        - 0.5 * home + 0.03 * (age - 70)
    )  # fmt: skip
    readmit = flag(1 / (1 + np.exp(-logit)))
    readmit[died == 1] = np.nan
    hemoglobin = np.clip(rng.normal(12.5 - 1.2 * ckd, 1.8, n), 4, 20)
    hemoglobin[rng.random(n) < 0.05] = np.nan

    return schema.conform(
        pd.DataFrame(
            {
                "source": source,
                # About two admissions per patient, so patient-level splits matter.
                "patient_id": [f"{seed}-{p}" for p in rng.integers(0, max(1, n // 2), n)],
                "admission_id": [f"{seed}-{i}" for i in range(n)],
                "age": age,
                "los_days": np.clip(np.exp(rng.normal(1.3 + 0.3 * hf + 0.2 * ckd, 0.6)), 0.1, 90),
                "prior_admissions_365d": prior,
                "creatinine": creatinine,
                "bun": np.clip(creatinine * 18 + rng.normal(0, 6, n), 3, 200),
                "sodium": np.clip(rng.normal(138 - 2 * hf, 3.5, n), 110, 165),
                "potassium": np.clip(rng.normal(4.2, 0.5, n), 2, 8),
                "hemoglobin": hemoglobin,
                "male": flag(0.55),
                "emergency": flag(0.7),
                "discharged_home": home,
                "diabetes": flag(0.30),
                "ckd": ckd,
                "copd": flag(0.15),
                "hypertension": flag(0.65),
                "afib": flag(0.20 + 0.15 * hf),
                "dx_group": group,
                "died_in_hospital": died,
                "readmit_30d": readmit,
            }
        )
    )
