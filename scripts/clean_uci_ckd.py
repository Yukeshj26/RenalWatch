"""
scripts/clean_uci_ckd.py – Clean the public UCI Chronic Kidney Disease dataset.

Attribution:
    Dataset: Chronic Kidney Disease
    Authors: L. Jerlin Rubini, P. Soundarapandian, P. Eswaran (2015)
    Repository: UCI Machine Learning Repository
    DOI: https://doi.org/10.24432/C5G020
    License: Creative Commons Attribution 4.0 International (CC BY 4.0)

Purpose:
    Cleans raw data by removing whitespace/typos, converting missing markers ('?')
    to NaN, filtering for adult CKD patients (classification == 'ckd' and age >= 18),
    and blanking out physiologically implausible entry errors.
    NOTE: Used SOLELY to inform synthetic cohort distributions and descriptive
    threshold sanity checks. NEVER used to train or validate risk models.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import pandas as pd


def resolve_raw_csv_path() -> Path:
    """Locate kidney_disease.csv in repo or download automatically if missing."""
    candidates = [
        Path("kidney_disease.csv"),
        Path("data/kidney_disease.csv"),
        Path("../kidney_disease.csv"),
        Path(__file__).resolve().parent.parent / "kidney_disease.csv",
        Path(__file__).resolve().parent.parent / "data" / "kidney_disease.csv",
        Path(__file__).resolve().parent.parent / "backend" / "data" / "kidney_disease.csv",
    ]
    for c in candidates:
        if c.is_file():
            return c

    # Automatic fallback download if file not present locally
    target_path = Path(__file__).resolve().parent.parent / "kidney_disease.csv"
    url = "https://raw.githubusercontent.com/ArjunAnil2000/Chronic-Kidney-Disease-dataset/master/kidney_disease.csv"
    try:
        import urllib.request
        print(f"kidney_disease.csv not found locally. Downloading from public mirror: {url}...")
        urllib.request.urlretrieve(url, str(target_path))
        if target_path.is_file():
            return target_path
    except Exception as e:
        pass

    raise FileNotFoundError(
        "Could not find or automatically download kidney_disease.csv."
    )


def clean_uci_ckd(csv_path: Optional[str | Path] = None) -> Tuple[pd.DataFrame, dict]:
    """Load, clean, filter, and validate the UCI CKD dataset.

    Returns:
        (cleaned_df, report_dict)
    """
    path = Path(csv_path) if csv_path else resolve_raw_csv_path()
    df_raw = pd.read_csv(path)
    total_raw = len(df_raw)

    df = df_raw.copy()

    # Standardize column names (classification target column)
    if "class" in df.columns and "classification" not in df.columns:
        df = df.rename(columns={"class": "classification"})

    # 1. Strip whitespace in all string columns and map missing markers
    for col in df.columns:
        if df[col].dtype == object or str(df[col].dtype).startswith("str"):
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({
                "?": np.nan,
                "": np.nan,
                "nan": np.nan,
                "None": np.nan,
                "\t?": np.nan,
            })

    # Convert numeric columns
    numeric_cols = [
        "age", "bp", "sg", "al", "su", "bgr", "bu",
        "sc", "sod", "pot", "hemo", "pcv", "wc", "rc",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # 2. Filter: keep only classification == "ckd" and age >= 18
    is_ckd = df["classification"] == "ckd"
    non_ckd_count = int((~is_ckd).sum())

    ckd_df = df[is_ckd].copy()
    pediatric_count = int((ckd_df["age"] < 18).sum())
    missing_age_count = int(ckd_df["age"].isna().sum())

    adult_ckd = ckd_df[ckd_df["age"] >= 18].copy()
    retained_rows = len(adult_ckd)

    # 3. Entry error bounds on physiological variables
    # Note: 'bp' in this dataset is diastolic only (normal range 60-90 mmHg)
    pot_outliers = (adult_ckd["pot"] < 2.0) | (adult_ckd["pot"] > 8.0)
    sod_outliers = (adult_ckd["sod"] < 110) | (adult_ckd["sod"] > 160)
    bp_outliers = (adult_ckd["bp"] < 40) | (adult_ckd["bp"] > 200)

    pot_dropped_vals = adult_ckd.loc[pot_outliers, "pot"].tolist()
    sod_dropped_vals = adult_ckd.loc[sod_outliers, "sod"].tolist()
    bp_dropped_vals = adult_ckd.loc[bp_outliers, "bp"].tolist()

    adult_ckd.loc[pot_outliers, "pot"] = np.nan
    adult_ckd.loc[sod_outliers, "sod"] = np.nan
    adult_ckd.loc[bp_outliers, "bp"] = np.nan

    # Calculate NaN counts in cleaned cohort
    nan_summary = adult_ckd.isna().sum().to_dict()

    report = {
        "total_raw_rows": total_raw,
        "non_ckd_rows_dropped": non_ckd_count,
        "pediatric_ckd_dropped (age < 18)": pediatric_count,
        "missing_age_ckd_dropped": missing_age_count,
        "retained_adult_ckd_rows": retained_rows,
        "entry_errors_set_to_nan": {
            "pot (valid [2.0, 8.0] mEq/L)": {
                "count": int(pot_outliers.sum()),
                "dropped_values": pot_dropped_vals,
            },
            "sod (valid [110, 160] mEq/L)": {
                "count": int(sod_outliers.sum()),
                "dropped_values": sod_dropped_vals,
            },
            "bp (diastolic valid [40, 200] mmHg)": {
                "count": int(bp_outliers.sum()),
                "dropped_values": bp_dropped_vals,
            },
        },
        "missing_values_per_column": nan_summary,
    }

    return adult_ckd, report


if __name__ == "__main__":
    cleaned_df, report = clean_uci_ckd()
    print("=" * 70)
    print("UCI CHRONIC KIDNEY DISEASE DATASET CLEANING REPORT")
    print("=" * 70)
    print(f"Total raw instances:               {report['total_raw_rows']}")
    print(f"Non-CKD instances dropped:         {report['non_ckd_rows_dropped']}")
    print(f"Pediatric CKD instances dropped:   {report['pediatric_ckd_dropped (age < 18)']}")
    print(f"Missing age CKD instances dropped: {report['missing_age_ckd_dropped']}")
    print(f"Retained adult CKD cohort:         {report['retained_adult_ckd_rows']}")
    print("-" * 70)
    print("Physiological entry error values replaced with NaN:")
    for k, v in report["entry_errors_set_to_nan"].items():
        print(f"  - {k}: {v['count']} value(s) dropped {v['dropped_values']}")
    print("-" * 70)
    print("Missing / NaN values in retained adult CKD cohort per column:")
    for col, count in report["missing_values_per_column"].items():
        if count > 0:
            print(f"  {col:<8}: {count:>3} missing ({count / report['retained_adult_ckd_rows'] * 100:.1f}%)")
    print("=" * 70)

    # Save cleaned dataset for reproducible downstream scripts
    out_dir = Path(__file__).resolve().parent.parent / "backend" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "cleaned_uci_ckd.csv"
    cleaned_df.to_csv(out_path, index=False)
    print(f"Cleaned dataset saved to: {out_path}")
