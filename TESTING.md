# 🧪 RenalWatch Comprehensive Testing & Quality Assurance Suite

[![CI & Quality Assurance](https://github.com/Yukeshj26/RenalWatch/actions/workflows/ci.yml/badge.svg)](https://github.com/Yukeshj26/RenalWatch/actions/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/Pytest-26%20Passed-brightgreen?style=flat&logo=pytest)](https://github.com/Yukeshj26/RenalWatch)
[![Vitest Passing](https://img.shields.io/badge/Vitest-4%20Passed-brightgreen?style=flat&logo=vitest)](https://github.com/Yukeshj26/RenalWatch)
[![Coverage](https://img.shields.io/badge/Coverage-99%25%20Core%20Risk-brightgreen?style=flat)](https://github.com/Yukeshj26/RenalWatch)

This document outlines the testing architecture, quality assurance protocols, automated continuous integration (CI) workflows, and test coverage metrics implemented in **RenalWatch**.

---

## 📊 Test Suite Summary

| Layer | Framework | Test Files | Total Tests | Status | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Backend API & Core Engines** | `pytest` + `pytest-cov` | 5 | **26 passed** | ✅ 100% Passing | ~1.4s |
| **Frontend UI & Components** | `vitest` + `@testing-library/react` | 3 | **4 passed** | ✅ 100% Passing | ~1.8s |
| **Continuous Integration (CI)** | GitHub Actions | 1 workflow | **2 jobs** | ✅ Green | Automatic |

---

## 🚀 Quick Execution Guide

### 1. Run Complete Test Suite (Frontend + Backend)
```bash
npm test
```

### 2. Run Backend Unit & Integration Tests (Python Pytest)
```bash
# Run all backend tests with verbose output
pytest -v

# Run with test coverage report
pytest -v --cov=backend --cov-report=term-missing tests/
```

### 3. Run Frontend Component & A11y Tests (Vitest)
```bash
cd frontend
npm test
```

---

## 🔬 Backend Test Breakdown (26 Tests)

### 1. `tests/test_api.py` – Endpoints & Role Gateway (7 Tests)
- `test_list_patients_returns_triage_queue`: Verifies `/api/patients` returns urgency-ranked patient cohort with IDWG%, clinical factors, and silent patient status.
- `test_get_patient_detail`: Verifies `/api/patients/{pid}` aggregates 7-day weight history, today's nutrient totals, and clinical risk factors.
- `test_get_patient_not_found`: Asserts HTTP 404 is thrown cleanly for invalid patient IDs.
- `test_get_patient_what_if_counterfactual`: Validates `/api/patients/{pid}/what-if` produces educational projections for dialysis attendance, fluid restriction, and potassium control.
- `test_direct_registration_and_login_flow`: End-to-end integration test verifying patient self-registration and subsequent credential authentication.
- `test_login_invalid_credentials`: Verifies HTTP 401 response and security rejection for invalid passwords or unregistered identifiers.
- `test_hours_to_next_session`: Validates mathematical hour-calculation algorithm against dialysis schedules (e.g., `Mon,Wed,Fri`).

### 2. `tests/test_risk.py` – Risk Engine & Calibrated Logistic Regression (6 Tests)
- `test_rule_score_low_risk`: Verifies patient with compliant IDWG (< 2%) and normal vitals yields a low risk score.
- `test_rule_score_high_idwg_and_potassium`: Verifies severe fluid overload (IDWG $\ge 4\%$) and hyperkalemia (> 2000 mg) trigger high clinical risk points.
- `test_rule_score_moderate_thresholds`: Asserts boundary conditions (IDWG 2–3%, elevated BP) yield appropriate moderate risk scoring.
- `test_ml_predict_mathematical_sigmoid`: Validates zero-variance pre-calibrated logistic regression inference ($z = \beta_0 + \sum \beta_i x_i$).
- `test_assess_composite_scoring_weights`: Verifies 70% rule-based + 30% ML mathematical blending formula.
- `test_risk_level_boundaries`: Asserts risk tier transitions (`high` $\ge 55$, `medium` 30–54, `low` < 30).

### 3. `tests/test_safety.py` – Deterministic Emergency Firewall (6 Tests)
- `test_safety_firewall_benign_symptoms`: Verifies benign interdialytic symptoms (e.g. mild cramps, itching) do not trigger false emergency protocols.
- `test_safety_firewall_english_keywords`: Tests immediate red-flag detection for chest pain, acute shortness of breath, and syncope in English.
- `test_safety_firewall_structured_emergencies`: Tests structured emergency keywords (e.g., `chest_pain`, `fistula_clot`).
- `test_safety_firewall_tamil_localization`: Verifies vernacular red-flag interception in Tamil (மூச்சுத்திணறல், நெஞ்சு வலி).
- `test_safety_firewall_hindi_localization`: Verifies vernacular red-flag interception in Hindi (सांस लेने में तकलीफ, सीने में दर्द).
- `test_safety_firewall_empty_inputs`: Validates safe default handling of empty symptom lists and blank clinical notes.

### 4. `tests/test_nutrition.py` – IFCT Nutrition Engine (4 Tests)
- `test_parse_rules_ifct_staple_foods`: Verifies exact nutrient lookups for Indian staple foods (Idli, Dosa, Sambar, Dal, Coconut Water) against the Indian Food Composition Tables (IFCT).
- `test_analyze_aggregate_totals`: Verifies multi-item meal descriptions correctly aggregate Potassium, Phosphorus, Sodium, and Fluid.
- `test_estimate_unknown_novel_foods`: Asserts fallback nutrient estimation logic safely parses novel dishes without throwing exceptions.
- `test_nutrient_advice_warnings`: Tests clinical warning generation when potassium exceeds 1500 mg or fluid exceeds patient-specific limits.

### 5. `tests/test_counterfactual.py` – "What-If" Simulation Engine (3 Tests)
- `test_categorize_food`: Verifies proper food categorization (Fruits, Dals, Vegetables, Dairy) for targeted dietary recommendations.
- `test_find_food_swaps_with_logged_high_k`: Tests food swap generator proposing low-potassium alternatives (e.g., Apple instead of Banana).
- `test_compute_what_if_counterfactuals`: Asserts educational risk-drop simulations compute positive score reductions across all clinical domains.

---

## 💻 Frontend Component & Accessibility Tests (4 Tests)

- `RoleGateway.test.jsx`:
  - Verifies clear visual distinction between **Patient Portal** and **Clinic Management** portals.
  - Verifies tab switching updates labels, icons, and placeholder fields dynamically.
- `RegisterModal.test.jsx`:
  - Tests patient registration modal rendering, form field accessibility, dry weight inputs, and schedule selection.
- `AboutModal.test.jsx`:
  - Validates medical disclaimers, clinical KDIGO guidelines references, and close interactions.

---

## 🔄 Continuous Integration (CI) Workflow

Every commit to `main` automatically triggers the GitHub Actions pipeline (`.github/workflows/ci.yml`):
1. **Python 3.12 Backend Job**:
   - Checks out repository.
   - Installs runtime dependencies (`requirements.txt`) and test dependencies (`requirements-dev.txt`).
   - Executes Pytest with full coverage analysis.
2. **Node.js 20 Frontend Job**:
   - Installs client dependencies via `npm ci`.
   - Executes Vitest component test suite.
   - Verifies production Vite build compilation.
