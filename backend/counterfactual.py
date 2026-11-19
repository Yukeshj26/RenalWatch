"""
counterfactual.py – Risk Counterfactual Engine and Renal Food-Swap Suggester.

Provides what-if clinical projections for hemodialysis patients:
1. Counterfactual Risk Simulations: Re-evaluates risk.assess() with one clinical
   parameter modified at a time (dietary potassium <= 2000 mg/day, IDWG < 2%,
   dialysis adherence, fluid limit adherence, BP control, symptom resolution)
   and ranks interventions by risk score reduction.
2. Kidney-Friendly Food-Swap Suggester: Scans the patient's logged foods for
   high-potassium items (>= 200 mg/serving) and suggests up to 2 lower-potassium
   alternatives from the same culinary category with exact per-serving potassium savings.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend import config, risk

# ---------------------------------------------------------------------------
# Load authoritative Food Database
# ---------------------------------------------------------------------------
_DATA_DIR = Path(__file__).resolve().parent / "data"
_FOODS_PATH = _DATA_DIR / "foods.json"
if not _FOODS_PATH.exists():
    for _alt in [
        Path("backend/data/foods.json"),
        Path(__file__).resolve().parent.parent / "backend" / "data" / "foods.json",
    ]:
        if _alt.exists():
            _FOODS_PATH = _alt
            break

with open(_FOODS_PATH, "r", encoding="utf-8") as _f:
    _RAW_FOODS: dict = json.load(_f)

FOOD_DB: dict[str, dict] = {k: v for k, v in _RAW_FOODS.items() if not k.startswith("_")}


def categorize_food(food_name: str) -> str:
    """Classify a food item into a clinical/culinary category."""
    fn = food_name.lower().strip()
    if any(w in fn for w in ["banana", "apple", "orange", "lime", "papaya", "guava", "mango", "watermelon", "grapes", "pomegranate", "pineapple"]):
        return "Fruits"
    if any(w in fn for w in ["coconut water", "tea", "coffee", "water", "juice", "milk", "buttermilk", "lassi", "curd"]):
        return "Beverages & Dairy"
    if any(w in fn for w in ["dal", "sambar", "rasam", "chickpeas", "rajma", "soya", "peas", "sprouts", "soup"]):
        return "Dals & Pulses"
    if any(w in fn for w in ["potato", "spinach", "tomato", "onion", "carrot", "cabbage", "cauliflower", "okra", "brinjal", "gourd", "cucumber", "beetroot", "capsicum", "mushroom", "beans", "salad"]):
        return "Vegetables"
    if any(w in fn for w in ["rice", "idli", "dosa", "uttapam", "appam", "paniyaram", "pongal", "khichdi", "biryani", "upma", "poha", "semiya", "chapati", "paratha", "puri", "naan", "bread", "oats", "ragi", "roti", "pasta", "noodles", "sandwich", "pizza"]):
        return "Grains & Staples"
    if any(w in fn for w in ["egg", "chicken", "fish", "mutton", "prawns", "paneer", "cheese"]):
        return "Proteins & Meats"
    if any(w in fn for w in ["peanuts", "almonds", "cashews", "vada", "samosa", "chutney", "pickle", "biscuits"]):
        return "Snacks & Chutneys"
    return "General Foods"


# Educational care-team tips for food swaps
_CATEGORY_TIPS = {
    "Fruits": "Discuss fruit portions with your renal care team; choose fresh, lower-potassium options.",
    "Beverages & Dairy": "Discuss total fluid allowances and electrolyte balance with your care team.",
    "Dals & Pulses": "Discuss pulse soaking / leaching techniques with your renal dietitian to reduce potassium.",
    "Vegetables": "Boiling and leaching high-potassium vegetables can reduce potassium content before cooking.",
    "Grains & Staples": "Refined grains typically contain less potassium and phosphorus than whole-bran grains.",
    "Proteins & Meats": "Focus on high-biological-value protein (like egg whites) while keeping potassium low.",
    "Snacks & Chutneys": "Watch for hidden sodium and potassium in commercial snacks and chutneys.",
}


def find_food_swaps(recent_meals: list[dict]) -> list[dict]:
    """Find high-potassium logged foods and suggest up to 2 lower-potassium alternatives.

    Returns:
        List of swap recommendations with per-serving potassium savings.
    """
    logged_items: list[tuple[str, int, str]] = []  # (name, k, unit)
    seen_names = set()

    # 1. Extract items from recent meals
    for meal in recent_meals:
        items = meal.get("items") or []
        if isinstance(items, list):
            for item in items:
                name = item.get("food", "").strip()
                k_val = item.get("k", 0)
                unit = item.get("unit", "serving")
                if name and name.lower() not in seen_names and k_val >= config.HIGH_POTASSIUM_FOOD_THRESHOLD_MG:
                    seen_names.add(name.lower())
                    logged_items.append((name, k_val, unit))

    # 2. Fallback: if patient hasn't logged high-K foods, provide common dialysis staple swaps
    if not logged_items:
        fallback_staples = [
            ("Coconut water", FOOD_DB.get("coconut water", {}).get("k", 600), "glass"),
            ("Banana", FOOD_DB.get("banana", {}).get("k", 420), "piece"),
            ("Potato curry", FOOD_DB.get("potato curry", {}).get("k", 520), "bowl"),
            ("Sambar", FOOD_DB.get("sambar", {}).get("k", 380), "bowl"),
        ]
        for name, k_val, unit in fallback_staples:
            if k_val:
                logged_items.append((name, k_val, unit))

    swaps: list[dict] = []

    for food_name, food_k, food_unit in logged_items:
        cat = categorize_food(food_name)
        # Find all foods in FOOD_DB of the same category with lower potassium
        candidates = []
        for db_name, db_info in FOOD_DB.items():
            db_k = db_info.get("k", 0)
            if db_k < food_k and categorize_food(db_name) == cat:
                k_saved = food_k - db_k
                candidates.append({
                    "food": db_name.title(),
                    "k": db_k,
                    "unit": db_info.get("unit", "serving"),
                    "k_saved": k_saved,
                    "tip": _CATEGORY_TIPS.get(cat, "Discuss with your renal care team."),
                })

        # Sort candidates by highest potassium savings
        candidates.sort(key=lambda c: c["k_saved"], reverse=True)
        top_alternatives = candidates[:2]

        if top_alternatives:
            swaps.append({
                "logged_food": food_name.title(),
                "logged_k": food_k,
                "unit": food_unit,
                "category": cat,
                "alternatives": top_alternatives,
            })

    return swaps


def compute_what_if(patient_state: dict) -> dict:
    """Run counterfactual simulations on patient inputs and return ranked score drops."""
    pat = patient_state
    dry_weight = float(pat.get("dry_weight", 65.0))
    current_weight = float(pat.get("current_weight", dry_weight))
    days_since = int(pat.get("days_since_session", 1))
    nutrients = pat.get("nutrients_today", {})
    k_today = int(nutrients.get("k", 0))
    p_today = int(nutrients.get("p", 0))
    fluid_today = int(nutrients.get("fluid", 0))
    fluid_limit = int(pat.get("fluid_limit", 1000))
    symptoms = list(pat.get("symptoms", []))
    bp_sys = int(pat.get("bp_sys", 120))
    bp_dia = int(pat.get("bp_dia", 80))

    baseline_risk = pat.get("risk") or risk.assess(
        weight=current_weight,
        dry_weight=dry_weight,
        days_since=days_since,
        k_today=k_today,
        p_today=p_today,
        fluid_today=fluid_today,
        fluid_limit=fluid_limit,
        symptoms=symptoms,
        bp_sys=bp_sys,
        bp_dia=bp_dia,
    )
    baseline_score = int(baseline_risk["score"])

    idwg_pct = round(((current_weight - dry_weight) / dry_weight) * 100, 1) if dry_weight > 0 else 0.0

    scenarios: list[dict] = []

    # -----------------------------------------------------------------------
    # 1. Potassium intake reduction (<= 2000 mg/day)
    # -----------------------------------------------------------------------
    if k_today > 1500:
        target_k = min(1500, config.SAFE_DAILY_POTASSIUM_TARGET_MG)
        cf_assess = risk.assess(
            weight=current_weight,
            dry_weight=dry_weight,
            days_since=days_since,
            k_today=target_k,
            p_today=p_today,
            fluid_today=fluid_today,
            fluid_limit=fluid_limit,
            symptoms=symptoms,
            bp_sys=bp_sys,
            bp_dia=bp_dia,
        )
        drop = max(0, baseline_score - cf_assess["score"])
        scenarios.append({
            "id": "reduce_k",
            "title": "Keep dietary potassium under 2,000 mg/day",
            "category": "Dietary Potassium",
            "current_value": f"{k_today} mg",
            "target_value": f"≤ 2,000 mg (target: {target_k} mg)",
            "current_score": baseline_score,
            "new_score": cf_assess["score"],
            "score_drop": drop,
            "description": f"Limiting high-potassium intake from {k_today} mg to {target_k} mg guards against life-threatening hyperkalemia and arrhythmias.",
            "action_text": "Swap high-potassium foods (bananas, coconut water, potato curry) for low-potassium options (apples, cabbage, buttermilk). Discuss specific targets with your care team.",
        })

    # -----------------------------------------------------------------------
    # 2. Control Interdialytic Weight Gain (IDWG < 2.0%)
    # -----------------------------------------------------------------------
    if idwg_pct >= 2.0:
        target_weight = round(dry_weight * (1.0 + (config.SAFE_IDWG_PCT_TARGET / 100.0)), 1)
        cf_assess = risk.assess(
            weight=target_weight,
            dry_weight=dry_weight,
            days_since=days_since,
            k_today=k_today,
            p_today=p_today,
            fluid_today=fluid_today,
            fluid_limit=fluid_limit,
            symptoms=symptoms,
            bp_sys=bp_sys,
            bp_dia=bp_dia,
        )
        drop = max(0, baseline_score - cf_assess["score"])
        scenarios.append({
            "id": "reduce_idwg",
            "title": "Maintain fluid intake to keep weight gain below 2%",
            "category": "Fluid & Weight",
            "current_value": f"{idwg_pct:.1f}% (+{round(current_weight - dry_weight, 1)} kg)",
            "target_value": f"< 2.0% (target: {target_weight} kg)",
            "current_score": baseline_score,
            "new_score": cf_assess["score"],
            "score_drop": drop,
            "description": f"Restricting fluid to keep weight gain under 2% ({round(dry_weight * 0.02, 1)} kg) relieves cardiovascular strain and prevents pulmonary edema.",
            "action_text": "Measure daily fluids, suck on ice chips, and avoid salty foods to prevent excess thirst. Discuss your dry weight target with your nephrologist.",
        })

    # -----------------------------------------------------------------------
    # 3. Resolve Missed Dialysis Session Gap (days_since = 1)
    # -----------------------------------------------------------------------
    if days_since >= 2:
        cf_assess = risk.assess(
            weight=dry_weight + 0.3,
            dry_weight=dry_weight,
            days_since=1,
            k_today=min(k_today, 1500),
            p_today=p_today,
            fluid_today=fluid_today,
            fluid_limit=fluid_limit,
            symptoms=[],
            bp_sys=min(bp_sys, 135),
            bp_dia=min(bp_dia, 85),
        )
        drop = max(0, baseline_score - cf_assess["score"])
        scenarios.append({
            "id": "attend_dialysis",
            "title": "Complete upcoming dialysis session on schedule",
            "category": "Dialysis Adherence",
            "current_value": f"{days_since} days since last session",
            "target_value": "Routine interdialytic interval (1 day)",
            "current_score": baseline_score,
            "new_score": cf_assess["score"],
            "score_drop": drop,
            "description": f"Attending your scheduled session promptly clears accumulated uremic toxins, removes fluid overload, and stabilizes electrolytes.",
            "action_text": "Never skip or postpone a dialysis session. If feeling unwell, contact your dialysis clinic immediately rather than waiting.",
        })

    # -----------------------------------------------------------------------
    # 4. Adhere to daily fluid limit
    # -----------------------------------------------------------------------
    if fluid_today > fluid_limit:
        cf_assess = risk.assess(
            weight=current_weight,
            dry_weight=dry_weight,
            days_since=days_since,
            k_today=k_today,
            p_today=p_today,
            fluid_today=fluid_limit,
            fluid_limit=fluid_limit,
            symptoms=symptoms,
            bp_sys=bp_sys,
            bp_dia=bp_dia,
        )
        drop = max(0, baseline_score - cf_assess["score"])
        scenarios.append({
            "id": "fluid_limit",
            "title": f"Limit daily fluids to prescribed {fluid_limit} mL",
            "category": "Fluid Allowance",
            "current_value": f"{fluid_today} mL",
            "target_value": f"≤ {fluid_limit} mL/day",
            "current_score": baseline_score,
            "new_score": cf_assess["score"],
            "score_drop": drop,
            "description": f"Staying within your daily {fluid_limit} mL allowance prevents fluid retention and dangerous interdialytic blood pressure spikes.",
            "action_text": "Count all liquids including water, tea, coffee, milk, curries, and gravies. Discuss fluid restriction strategies with your care team.",
        })

    # -----------------------------------------------------------------------
    # 5. Blood Pressure Optimization (< 140 mmHg)
    # -----------------------------------------------------------------------
    if bp_sys >= 140:
        cf_assess = risk.assess(
            weight=current_weight,
            dry_weight=dry_weight,
            days_since=days_since,
            k_today=k_today,
            p_today=p_today,
            fluid_today=fluid_today,
            fluid_limit=fluid_limit,
            symptoms=symptoms,
            bp_sys=config.SAFE_BP_SYS_TARGET,
            bp_dia=min(bp_dia, 85),
        )
        drop = max(0, baseline_score - cf_assess["score"])
        scenarios.append({
            "id": "optimize_bp",
            "title": "Optimize systolic blood pressure (< 140 mmHg)",
            "category": "Blood Pressure",
            "current_value": f"{bp_sys}/{bp_dia} mmHg",
            "target_value": f"< 140/90 mmHg (target: {config.SAFE_BP_SYS_TARGET} mmHg)",
            "current_score": baseline_score,
            "new_score": cf_assess["score"],
            "score_drop": drop,
            "description": f"Lowering systolic BP from {bp_sys} mmHg toward {config.SAFE_BP_SYS_TARGET} mmHg reduces vascular stress and lowers acute cardiovascular event risk.",
            "action_text": "Take anti-hypertensive medications exactly as prescribed and minimize sodium (salt) intake. Discuss any blood pressure adjustments with your care team.",
        })

    # -----------------------------------------------------------------------
    # 6. Symptom Alleviation
    # -----------------------------------------------------------------------
    if symptoms:
        cf_assess = risk.assess(
            weight=current_weight,
            dry_weight=dry_weight,
            days_since=days_since,
            k_today=k_today,
            p_today=p_today,
            fluid_today=fluid_today,
            fluid_limit=fluid_limit,
            symptoms=[],
            bp_sys=bp_sys,
            bp_dia=bp_dia,
        )
        drop = max(0, baseline_score - cf_assess["score"])
        scenarios.append({
            "id": "resolve_symptoms",
            "title": "Address and alleviate active interdialytic symptoms",
            "category": "Symptoms",
            "current_value": f"{len(symptoms)} symptom(s): {', '.join(symptoms)}",
            "target_value": "Symptom-free interdialytic period",
            "current_score": baseline_score,
            "new_score": cf_assess["score"],
            "score_drop": drop,
            "description": "Addressing swelling, cramps, or fatigue through target ultrafiltration and clinical medication adjustments restores physical comfort.",
            "action_text": "Discuss recurring symptoms with your care team so dialysis parameters (target dry weight, dialysate sodium) can be personalized.",
        })

    # Sort scenarios by score drop descending (highest impact first)
    scenarios.sort(key=lambda s: s["score_drop"], reverse=True)

    # Find food swaps based on recent meals
    food_swaps = find_food_swaps(pat.get("recent_meals", []))

    return {
        "patient_id": pat.get("id"),
        "patient_name": pat.get("name"),
        "current_score": baseline_score,
        "current_level": baseline_risk["level"],
        "scenarios": scenarios,
        "food_swaps": food_swaps,
        "care_team_guidance": "These projections are educational simulations based on your clinical inputs. Discuss any dietary, fluid, or dialysis adjustments with your care team or nephrologist before making changes.",
    }
