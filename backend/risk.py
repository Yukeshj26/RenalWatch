"""
risk.py – Clinical risk scoring engine for RenalWatch.

Combines a deterministic rule-based score with a lightweight logistic
regression model to produce a blended risk score (0-100) for each patient.
"""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from typing import Optional

import numpy as np
from sklearn.linear_model import LogisticRegression

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global ML model (trained lazily at startup via train_model())
# ---------------------------------------------------------------------------
_ml_model: Optional[LogisticRegression] = None


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
    """Train a logistic regression on synthetic features.

    Features: [idwg_pct, days_since, k_load, symptom_count, bp_sys]
    Label:    1 if the patient would be high-risk by rules, else 0

    Called once at application startup.
    """
    global _ml_model

    # Generate synthetic training data
    rng = np.random.RandomState(42)
    n = 500
    idwg = rng.uniform(0.5, 6.0, n)
    days_since = rng.randint(0, 5, n).astype(float)
    k_load = rng.uniform(400, 3000, n)
    sym_count = rng.randint(0, 6, n).astype(float)
    bp_sys = rng.uniform(110, 180, n)

    X = np.column_stack([idwg, days_since, k_load, sym_count, bp_sys])

    # Label: 1 when rule score would be "high" (≥55)
    y = np.zeros(n, dtype=int)
    for i in range(n):
        score, _ = _rule_score(
            idwg_pct=idwg[i],
            days_since=int(days_since[i]),
            k_today=int(k_load[i]),
            p_today=0,
            fluid_today=0,
            fluid_limit=1000,
            symptoms=["swelling"] * int(sym_count[i]),  # approximate
            bp_sys=int(bp_sys[i]),
        )
        y[i] = 1 if score >= 55 else 0

    _ml_model = LogisticRegression(max_iter=1000, random_state=42)
    _ml_model.fit(X, y)
    logger.info("ML risk model trained on %d synthetic samples", n)


def ml_predict(features: dict) -> float:
    """Return the ML model's probability of high risk (0.0 – 1.0).

    features keys: idwg_pct, days_since, k_load, symptom_count, bp_sys
    """
    if _ml_model is None:
        return 0.0
    X = np.array([[
        features.get("idwg_pct", 0),
        features.get("days_since", 0),
        features.get("k_load", 0),
        features.get("symptom_count", 0),
        features.get("bp_sys", 120),
    ]])
    prob = _ml_model.predict_proba(X)[0]
    # Index 1 is the "high risk" class
    return float(prob[1]) if len(prob) > 1 else 0.0


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
