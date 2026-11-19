"""
Unit tests for backend/nutrition.py (IFCT Grounded Nutrient Engine).
"""

from backend.nutrition import parse_rules, analyze, nutrient_advice, FOOD_DB


def test_parse_rules_ifct_staple_foods():
    """Verify parsing and calculation for known IFCT staple foods."""
    # Test known staple like "idli" or "banana"
    text = "2 idli and 1 banana"
    items = parse_rules(text)
    assert len(items) >= 2

    foods_found = [i["food"].lower() for i in items]
    assert any("idli" in f for f in foods_found)
    assert any("banana" in f for f in foods_found)

    # Check verified IFCT flag
    idli_item = next(i for i in items if "idli" in i["food"].lower())
    assert idli_item["verified"] is True
    assert idli_item["source"] == "IFCT Verified"
    assert idli_item["k"] > 0


def test_analyze_aggregate_totals():
    """Verify total aggregation for multi-item meal."""
    res = analyze("1 cup tea, 2 biscuits, 1 apple")
    assert "items" in res
    assert "total" in res
    total = res["total"]

    assert total["k"] == sum(item["k"] for item in res["items"])
    assert total["fluid"] == sum(item["fluid"] for item in res["items"])
    assert total["na"] == sum(item["na"] for item in res["items"])
    assert total["p"] == sum(item["p"] for item in res["items"])


def test_estimate_unknown_novel_foods():
    """Ensure non-IFCT global foods are gracefully quantified and estimated."""
    res = analyze("1 plate avocado toast")
    assert len(res["items"]) >= 1
    item = res["items"][0]
    assert item["k"] > 0
    assert "k" in item


def test_nutrient_advice_warnings():
    """Verify high potassium and fluid trigger clinical alerts."""
    # Exceeding 2000mg K
    advice_k = nutrient_advice({"k": 2500, "fluid": 500}, fluid_limit=1000)
    assert advice_k is not None
    assert "High potassium load" in advice_k

    # Exceeding fluid limit
    advice_fluid = nutrient_advice({"k": 1000, "fluid": 1500}, fluid_limit=1000)
    assert advice_fluid is not None
    assert "Fluid intake" in advice_fluid

    # Normal compliant intake
    advice_normal = nutrient_advice({"k": 1200, "fluid": 800}, fluid_limit=1000)
    assert advice_normal is None
