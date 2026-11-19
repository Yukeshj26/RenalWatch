"""
config.py – Global configuration constants for RenalWatch.

Centralizes clinical thresholds, timing parameters, and operational constants.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Silent-Patient Detection Constants
# ---------------------------------------------------------------------------
# Standard threshold: flag as silent if no check-in for more than 24 hours
SILENT_HOURS_DEFAULT: float = 24.0

# Critical interdialytic gap threshold: flag as silent if no check-in for > 12 hours
# when the next session is more than 48 hours away (e.g. over 2-3 day weekend gap)
SILENT_HOURS_LONG_GAP: float = 12.0

# Threshold defining a long gap until the next dialysis session (hours)
NEXT_SESSION_LONG_GAP_HOURS: float = 48.0

# High potassium threshold per single food item serving (mg)
HIGH_POTASSIUM_FOOD_THRESHOLD_MG: int = 200

# Daily dietary potassium limit target for counterfactual analysis (mg/day)
SAFE_DAILY_POTASSIUM_TARGET_MG: int = 1500

# Safe interdialytic weight gain percentage target for counterfactual analysis (% IDWG)
SAFE_IDWG_PCT_TARGET: float = 1.5

# Safe systolic blood pressure target for counterfactual analysis (mmHg)
SAFE_BP_SYS_TARGET: int = 130
