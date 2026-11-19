"""
Unit tests for backend/counterfactual.py (Explainable Risk Projections & Food Swaps).
"""

from backend.counterfactual import categorize_food, find_food_swaps, compute_what_if


def test_categorize_food():
    """Verify accurate culinary and clinical classification of foods."""
    assert categorize_food("Banana") == "Fruits"
    assert categorize_food("Apple") == "Fruits"
    assert categorize_food("Coconut water") == "Beverages & Dairy"
    assert categorize_food("Sambar") == "Dals & Pulses"
    assert categorize_food("Potato curry") == "Vegetables"
    assert categorize_food("Idli") == "Grains & Staples"
    assert categorize_food("Boiled Egg") == "Proteins & Meats"


def test_find_food_swaps_with_logged_high_k():
    """Ensure high potassium foods generate lower potassium alternatives in same category."""
    recent_meals = [
        {
            "items": [
                {"food": "Banana", "k": 420, "unit": "piece"},
                {"food": "Coconut water", "k": 600, "unit": "glass"},
            ]
        }
    ]
    swaps = find_food_swaps(recent_meals)
    assert len(swaps) >= 1

    first_swap = swaps[0]
    assert "logged_food" in first_swap
    assert "alternatives" in first_swap
    assert len(first_swap["alternatives"]) <= 2

    # Verify potassium saved is positive
    for alt in first_swap["alternatives"]:
        assert alt["k_saved"] > 0
        assert alt["k"] < first_swap["logged_k"]


def test_compute_what_if_counterfactuals():
    """Verify counterfactual projections compute score drops for high-risk inputs."""
    patient_state = {
        "id": 1,
        "name": "Test Patient",
        "dry_weight": 60.0,
        "current_weight": 63.5,  # High IDWG
        "days_since_session": 3,  # 3-day gap
        "fluid_limit": 1000,
        "bp_sys": 165,
        "bp_dia": 95,
        "symptoms": ["swelling", "cramps"],
        "nutrients_today": {"k": 2600, "p": 1200, "fluid": 1400, "na": 1800},
        "recent_meals": [],
    }

    result = compute_what_if(patient_state)
    assert "current_score" in result
    assert "scenarios" in result
    assert "food_swaps" in result

    # Baseline risk should be high
    assert result["current_score"] > 30

    # At least one counterfactual simulation should show a score drop
    scenarios = result["scenarios"]
    assert len(scenarios) > 0
    assert any(s["score_drop"] > 0 for s in scenarios)
