"""
scripts/extract_cohort_params.py – Extract empirical clinical distributions from cleaned UCI CKD dataset.

Attribution:
    Dataset: Chronic Kidney Disease
    Authors: L. Jerlin Rubini, P. Soundarapandian, P. Eswaran (2015)
    Repository: UCI Machine Learning Repository
    DOI: https://doi.org/10.24432/C5G020
    License: Creative Commons Attribution 4.0 International (CC BY 4.0)

Extracts continuous statistics (mean, std, min, percentiles, max) and categorical
proportions, saving the results to backend/data/cohort_params.json with full
attribution and limitations disclosures.
"""

from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pandas as pd

from clean_uci_ckd import clean_uci_ckd


def extract_cohort_parameters(df: pd.DataFrame) -> dict:
    """Compute continuous percentiles and categorical proportions."""
    continuous_defs = {
        "age": {"unit": "years", "desc": "Patient age at diagnosis"},
        "bp": {"unit": "mmHg (diastolic)", "desc": "Diastolic blood pressure (systolic not recorded in UCI dataset)"},
        "sod": {"unit": "mEq/L", "desc": "Serum sodium"},
        "pot": {"unit": "mEq/L", "desc": "Serum potassium"},
        "hemo": {"unit": "g/dL", "desc": "Hemoglobin level"},
        "sc": {"unit": "mg/dL", "desc": "Serum creatinine"},
        "bu": {"unit": "mg/dL", "desc": "Blood urea nitrogen"},
    }

    continuous_stats = {}
    for col, meta in continuous_defs.items():
        if col in df.columns:
            s = df[col].dropna()
            continuous_stats[col] = {
                "unit": meta["unit"],
                "description": meta["desc"],
                "count": int(len(s)),
                "mean": round(float(s.mean()), 2),
                "std": round(float(s.std()), 2),
                "min": round(float(s.min()), 2),
                "p05": round(float(np.percentile(s, 5)), 2),
                "p25": round(float(np.percentile(s, 25)), 2),
                "p50": round(float(np.percentile(s, 50)), 2),
                "p75": round(float(np.percentile(s, 75)), 2),
                "p95": round(float(np.percentile(s, 95)), 2),
                "max": round(float(s.max()), 2),
            }

    categorical_defs = {
        "htn": {"desc": "Hypertension history", "pos": "yes"},
        "dm": {"desc": "Diabetes mellitus history", "pos": "yes"},
        "cad": {"desc": "Coronary artery disease history", "pos": "yes"},
        "pe": {"desc": "Pedal edema present", "pos": "yes"},
        "ane": {"desc": "Anemia diagnosed", "pos": "yes"},
        "appet": {"desc": "Patient appetite assessment", "pos": "poor"},
    }

    categorical_stats = {}
    for col, meta in categorical_defs.items():
        if col in df.columns:
            counts = df[col].dropna().value_counts().to_dict()
            total = sum(counts.values())
            proportions = {k: round(v / total, 4) for k, v in counts.items()}
            pos_rate = proportions.get(meta["pos"], 0.0)
            categorical_stats[col] = {
                "description": meta["desc"],
                "total_valid": total,
                "counts": {str(k): int(v) for k, v in counts.items()},
                "proportions": proportions,
                "positive_rate": pos_rate,
            }

    output = {
        "source": {
            "name": "UCI Machine Learning Repository: Chronic Kidney Disease Dataset",
            "authors": "L. Jerlin Rubini, P. Soundarapandian, P. Eswaran",
            "year": 2015,
            "doi": "10.24432/C5G020",
            "repository_url": "https://archive.ics.uci.edu/dataset/336/chronic+kidney+disease",
            "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
            "citation": "Rubini, L., Soundarapandian, P., & Eswaran, P. (2015). Chronic Kidney Disease [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5G020",
        },
        "limitations": [
            "Pre-Dialysis CKD vs. Maintenance Hemodialysis: The UCI dataset captures patients across stages 1-5 of Chronic Kidney Disease (predominantly pre-dialysis), NOT an end-stage maintenance hemodialysis cohort. Dialysis patients frequently present with higher pre-session serum potassium levels due to anuric fluid and solute retention. Baseline parameters here inform realistic variation, but do NOT represent true maintenance hemodialysis baselines.",
            "Absence of Interdialytic Features: The dataset contains no measurements for target dry weight, interdialytic weight gain (IDWG), dialysis schedules, dialysis session dates, meals/dietary nutrient intake, or interdialytic emergency outcomes. All such parameters in RenalWatch remain purely synthetic.",
            "Diastolic Blood Pressure Only: The 'bp' field in the UCI dataset records diastolic blood pressure only (40-180 mmHg); systolic BP was not recorded.",
            "Strict Non-Training Mandate: These distributions are used solely to parameterize realistic baseline synthetic patient demographics and for descriptive sanity checks of clinical rule thresholds. They are NOT used to train, optimize, or validate any risk prediction model.",
        ],
        "sample_size": {
            "total_cleaned_adult_ckd": int(len(df)),
        },
        "continuous_distributions": continuous_stats,
        "categorical_proportions": categorical_stats,
    }

    return output


if __name__ == "__main__":
    cleaned_df, report = clean_uci_ckd()
    params = extract_cohort_parameters(cleaned_df)

    out_file = Path(__file__).resolve().parent.parent / "backend" / "data" / "cohort_params.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(params, f, indent=2)

    print("=" * 80)
    print("EXTRACTED COHORT PARAMETERS (UCI CKD Adult Cohort, N=226)")
    print("=" * 80)
    print(f"{'Feature':<8} {'Unit':<18} {'Mean ± Std':<16} {'Median':<8} {'5th - 95th Percentile':<24}")
    print("-" * 80)
    for feat, s in params["continuous_distributions"].items():
        mean_std = f"{s['mean']} ± {s['std']}"
        p5_95 = f"[{s['p05']} – {s['p95']}]"
        print(f"{feat:<8} {s['unit']:<18} {mean_std:<16} {s['p50']:<8} {p5_95:<24}")

    print("-" * 80)
    print("CATEGORICAL PROPORTIONS:")
    for feat, c in params["categorical_proportions"].items():
        print(f"  {feat:<6} ({c['description']}):")
        for val, prop in c["proportions"].items():
            print(f"      - {val}: {prop * 100:.1f}% ({c['counts'].get(val, 0)}/{c['total_valid']})")
    print("=" * 80)
    print(f"Saved cohort parameters to: {out_file}")
