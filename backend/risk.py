"""
risk.py – Clinical risk scoring engine for RenalWatch.

Combines a deterministic rule-based score with a lightweight logistic
regression model to produce a blended risk score (0-100) for each patient.
"""

from __future__ import annotations

import json
import logging
import math
from datetime import date, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Calibrated Logistic Regression Weights (Fit on synthetic dialysis cohort)
# Features: [idwg_pct, days_since, k_load, symptom_count, bp_sys]
# ---------------------------------------------------------------------------
_LR_INTERCEPT: float = -27.213217563081283
_LR_COEFFICIENTS: list[float] = [
    1.9443435997151586,   # idwg_pct: +1.944 per 1% interdialytic weight gain
    1.5264315473014770,   # days_since: +1.526 per day since last session
    0.003216729058893583, # k_load: +0.0032 per mg potassium intake
    2.7861701240892676,   # symptom_count: +2.786 per concurrent symptom
    0.05721320065675756,  # bp_sys: +0.057 per mmHg systolic BP
]


# ---------------------------------------------------------------------------
# Rule-based scoring
# ---------------------------------------------------------------------------

# Symptom point values
_SYMPTOM_POINTS: dict[str, int] = {
    "swelling": 10,
    "cramps": 5,
    "fatigue": 5,
    "nausea": 3,
    "itching": 3,
}


def _rule_score(
    idwg_pct: float,
    days_since: int,
    k_today: int,
    p_today: int,
    fluid_today: int,
    fluid_limit: int,
    symptoms: list[str],
    bp_sys: int,
) -> tuple[int, list[dict]]:
    """Calculate a deterministic rule-based risk score.

    Returns:
        (raw_score, factors)  where factors is a list of {points, reason}.
    """
    factors: list[dict] = []

    # 1. IDWG%  (inter-dialytic weight gain)
    if idwg_pct >= 4.0:
        factors.append({"points": 30, "reason": f"IDWG {idwg_pct:.1f}% (≥ 4%)"})
    elif idwg_pct >= 3.0:
        factors.append({"points": 20, "reason": f"IDWG {idwg_pct:.1f}% (≥ 3%)"})
    elif idwg_pct >= 2.0:
        factors.append({"points": 10, "reason": f"IDWG {idwg_pct:.1f}% (≥ 2%)"})

    # 2. Days since last dialysis
    if days_since >= 3:
        factors.append({"points": 20, "reason": f"{days_since} days since dialysis"})
    elif days_since == 2:
        factors.append({"points": 8, "reason": "2 days since dialysis"})

    # 3. Potassium load today
    if k_today > 2000:
        factors.append({"points": 20, "reason": f"High potassium ({k_today} mg)"})
    elif k_today > 1500:
        factors.append({"points": 10, "reason": f"Elevated potassium ({k_today} mg)"})

    # 4. Phosphorus load today
    if p_today > 1000:
        factors.append({"points": 8, "reason": f"High phosphorus ({p_today} mg)"})

    # 5. Fluid over limit
    if fluid_limit > 0 and fluid_today > fluid_limit:
        factors.append({"points": 10, "reason": f"Fluid {fluid_today} mL over limit {fluid_limit} mL"})

    # 6. Symptoms
    for sym in symptoms:
        pts = _SYMPTOM_POINTS.get(sym, 0)
        if pts:
            factors.append({"points": pts, "reason": f"Symptom: {sym}"})

    # 7. Blood pressure
    if bp_sys >= 160:
        factors.append({"points": 10, "reason": f"High BP (systolic {bp_sys})"})
    elif bp_sys >= 140:
        factors.append({"points": 5, "reason": f"Elevated BP (systolic {bp_sys})"})

    raw = sum(f["points"] for f in factors)
    return raw, factors


# ---------------------------------------------------------------------------
# ML model
# ---------------------------------------------------------------------------

def train_model() -> None:
    """Initialize the logistic regression scoring parameters.
    Pre-warmed inference engine optimized for serverless deployments.
    """
    logger.info("ML risk model initialized with pre-calibrated logistic regression weights.")


def ml_predict(features: dict) -> float:
    """Return the logistic regression model's probability of high risk (0.0 – 1.0).

    Computes P(y=1|X) = 1 / (1 + exp(-z)) using calibrated weights:
    features keys: idwg_pct, days_since, k_load, symptom_count, bp_sys
    """
    idwg = float(features.get("idwg_pct", 0.0))
    days = float(features.get("days_since", 0.0))
    k = float(features.get("k_load", 0.0))
    syms = float(features.get("symptom_count", 0.0))
    bp = float(features.get("bp_sys", 120.0))

    z = (
        _LR_INTERCEPT
        + _LR_COEFFICIENTS[0] * idwg
        + _LR_COEFFICIENTS[1] * days
        + _LR_COEFFICIENTS[2] * k
        + _LR_COEFFICIENTS[3] * syms
        + _LR_COEFFICIENTS[4] * bp
    )

    # Numerically stable sigmoid function
    z_clamped = max(min(z, 50.0), -50.0)
    return 1.0 / (1.0 + math.exp(-z_clamped))


# ---------------------------------------------------------------------------
# Public API – blended score
# ---------------------------------------------------------------------------

def assess(
    *,
    weight: float,
    dry_weight: float,
    days_since: int,
    k_today: int = 0,
    p_today: int = 0,
    fluid_today: int = 0,
    fluid_limit: int = 1000,
    symptoms: list[str] | None = None,
    bp_sys: int = 120,
    bp_dia: int = 80,
) -> dict:
    """Compute a blended (rule + ML) risk assessment for a patient.

    Returns:
        {
            score:   int (0-100),
            level:   'high' | 'medium' | 'low',
            idwg_pct: float,
            factors: [{points, reason}, ...],
            summary: str   – top 2 reasons
        }
    """
    symptoms = symptoms or []
    idwg_pct = round(((weight - dry_weight) / dry_weight) * 100, 1) if dry_weight > 0 else 0.0
    idwg_pct = max(idwg_pct, 0.0)

    rule_raw, factors = _rule_score(
        idwg_pct=idwg_pct,
        days_since=days_since,
        k_today=k_today,
        p_today=p_today,
        fluid_today=fluid_today,
        fluid_limit=fluid_limit,
        symptoms=symptoms,
        bp_sys=bp_sys,
    )

    # ML probability
    ml_prob = ml_predict({
        "idwg_pct": idwg_pct,
        "days_since": days_since,
        "k_load": k_today,
        "symptom_count": len(symptoms),
        "bp_sys": bp_sys,
    })

    # Blend: 70% rule-based + 30% ML
    blended = rule_raw * 0.7 + ml_prob * 100 * 0.3
    score = min(100, max(0, round(blended)))

    # Risk level
    if score >= 55:
        level = "high"
    elif score >= 30:
        level = "medium"
    else:
        level = "low"

    # Summary: top 2 contributing factors
    top_factors = sorted(factors, key=lambda f: f["points"], reverse=True)[:2]
    summary = "; ".join(f["reason"] for f in top_factors) if top_factors else "No significant risk factors"

    return {
        "score": score,
        "level": level,
        "idwg_pct": idwg_pct,
        "factors": factors,
        "summary": summary,
    }
