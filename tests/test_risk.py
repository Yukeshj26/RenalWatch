"""
Unit tests for backend/risk.py (Clinical Risk Engine & Machine Learning Inference).
"""

import math
import pytest
from backend.risk import (
    _rule_score,
    ml_predict,
    assess,
    _LR_INTERCEPT,
    _LR_COEFFICIENTS,
)


def test_rule_score_low_risk():
    """Verify rule score for a compliant, low-risk patient."""
    score, factors = _rule_score(
        idwg_pct=1.2,
        days_since=1,
        k_today=1500,
        p_today=800,
        fluid_today=800,
        fluid_limit=1000,
        symptoms=[],
        bp_sys=120,
    )
    assert score == 0
    assert len(factors) == 0


def test_rule_score_high_idwg_and_potassium():
    """Verify high IDWG (>=4%) and potassium (>2000mg) trigger appropriate point values."""
    score, factors = _rule_score(
        idwg_pct=4.5,  # +30 pts
        days_since=3,  # +20 pts (interdialytic gap >= 3 days)
        k_today=2500,  # +20 pts (>2000 mg)
        p_today=1200,  # +8 pts (>1000 mg)
        fluid_today=1500,  # +10 pts (> fluid limit)
        fluid_limit=1000,
        symptoms=["swelling", "cramps"],  # +10 (swelling) + 5 (cramps) = 15 pts
        bp_sys=165,  # +10 pts (BP >= 160)
    )
    # Expected: 30 + 20 + 20 + 8 + 10 + 15 + 10 = 113
    assert score == 113
    assert len(factors) == 8


def test_rule_score_moderate_thresholds():
    """Verify moderate tier thresholds (IDWG >= 2%, BP >= 140)."""
    score, factors = _rule_score(
        idwg_pct=2.5,  # +10 pts
        days_since=2,  # +8 pts
        k_today=1800,  # +10 pts (k_today > 1500)
        p_today=800,   # 0 pts
        fluid_today=900,  # 0 pts
        fluid_limit=1000,
        symptoms=["fatigue"],  # +5 pts
        bp_sys=145,  # +5 pts
    )
    # Expected: 10 + 8 + 10 + 5 + 5 = 38
    assert score == 38
    assert len(factors) == 5


def test_ml_predict_mathematical_sigmoid():
    """Verify zero-dependency logistic regression sigmoid formula."""
    features = {
        "idwg_pct": 3.0,
        "days_since": 2,
        "k_load": 2200,
        "symptom_count": 1,
        "bp_sys": 150,
    }
    manual_z = (
        _LR_INTERCEPT
        + _LR_COEFFICIENTS[0] * features["idwg_pct"]
        + _LR_COEFFICIENTS[1] * features["days_since"]
        + _LR_COEFFICIENTS[2] * features["k_load"]
        + _LR_COEFFICIENTS[3] * features["symptom_count"]
        + _LR_COEFFICIENTS[4] * features["bp_sys"]
    )
    manual_prob = 1.0 / (1.0 + math.exp(-manual_z))

    prob = ml_predict(features)
    assert pytest.approx(prob, rel=1e-5) == manual_prob
    assert 0.0 <= prob <= 1.0


def test_assess_composite_scoring_weights():
    """Verify composite risk score matches 70% rule + 30% ML formula."""
    res = assess(
        weight=62.0,
        dry_weight=60.0,
        days_since=2,
        k_today=2100,
        p_today=950,
        fluid_today=1100,
        fluid_limit=1000,
        symptoms=["swelling"],
        bp_sys=155,
        bp_dia=90,
    )

    assert "score" in res
    assert "level" in res
    assert "factors" in res
    assert "summary" in res

    assert 0 <= res["score"] <= 100
    assert res["level"] in ["low", "medium", "high"]


def test_risk_level_boundaries():
    """Ensure risk level classifications align with clinical definitions."""
    # Low Risk (< 30)
    low_res = assess(
        weight=60.5,
        dry_weight=60.0,
        days_since=1,
        k_today=1200,
        p_today=700,
        fluid_today=800,
        fluid_limit=1000,
        symptoms=[],
        bp_sys=115,
        bp_dia=75,
    )
    assert low_res["level"] == "low"
    assert low_res["score"] < 30

    # High Risk (>= 60)
    high_res = assess(
        weight=64.0,
        dry_weight=60.0,
        days_since=3,
        k_today=3000,
        p_today=1500,
        fluid_today=1800,
        fluid_limit=1000,
        symptoms=["swelling", "cramps"],
        bp_sys=170,
        bp_dia=100,
    )
    assert high_res["level"] == "high"
    assert high_res["score"] >= 60
