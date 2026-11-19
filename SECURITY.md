# Security Policy

## 🛡️ Clinical Data & Synthetic Patient Privacy
RenalWatch is engineered from the ground up to protect patient safety and medical data integrity:
- **Zero Protected Health Information (PHI):** All sample patient profiles, clinical charts, and vitals provided in this repository are **100% synthetic**. No real patient data is committed, retained, or transmitted.
- **SQL Injection Prevention:** 100% of SQLite database interactions utilize parameterized prepared statements.
- **Data Validation:** All incoming payloads are strictly validated through Pydantic schemas.
- **Deterministic Emergency Guardrails:** Red-flag symptoms bypass generative AI models to prevent medical hallucination vulnerabilities.

## 🚨 Reporting a Vulnerability
If you discover a security vulnerability within RenalWatch, please open a confidential GitHub Security Advisory or report it directly to the maintainers. We are committed to reviewing and addressing security inquiries within 24 hours.
