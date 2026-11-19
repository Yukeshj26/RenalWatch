# 💧 RenalWatch

**Early-warning companion for dialysis patients between sessions**

![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57)
![Synthetic Data Only](https://img.shields.io/badge/Data-Synthetic%20Only-orange)

---

## The Problem

Dialysis patients face serious health risks **between sessions**: fluid overload, dangerous potassium spikes, and missed or delayed treatments. Yet monitoring during these inter-dialytic periods is minimal — patients are largely on their own, and clinicians have little visibility until the next appointment.

A single missed session or an unchecked dietary lapse can cascade into a medical emergency.

## The Solution

RenalWatch bridges the gap between dialysis sessions with two complementary interfaces:

- **Patient-facing logging** — patients record weight, blood pressure, meals, and symptoms daily through a simple, multilingual interface (with voice input support).
- **Clinician dashboard** — clinicians see all their patients ranked by risk score, color-coded for urgency, with transparent explanations of every risk factor.

The system combines **rule-based scoring** with a lightweight **ML model** to surface the patients who need attention most, while a **hard-coded safety layer** ensures emergency symptoms always trigger immediate, unambiguous guidance — with zero reliance on AI-generated medical advice.

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🏥 **Patient Health Logging** | Track weight, blood pressure, heart rate, and symptoms daily |
| 🍽️ **Food-to-Nutrient Engine** | IFCT-inspired database parses Indian meals into potassium, phosphorus, sodium, and fluid totals |
| 🎤 **Voice Input** | Browser-based speech-to-text in Tamil, Hindi, and English |
| ⚠️ **Risk Scoring** | Blended rule-based + ML scoring — transparent and explainable |
| 👨‍⚕️ **Clinician Dashboard** | Ranked patient list with color-coded risk levels and drill-down details |
| 🚨 **Safety Layer** | Hard-coded emergency rules for critical symptoms — no AI medical advice |
| 🌐 **Multilingual** | Full support for English, Tamil, and Hindi |

---

## Architecture

```
┌──────────────────┐
│  Patient Interface│    Browser-based logging + voice input
│  (HTML/CSS/JS)   │
└────────┬─────────┘
         │  REST API
         ▼
┌──────────────────┐
│     FastAPI       │    Main application server
│   backend/main   │
└──┬─────┬─────┬───┘
   │     │     │
   ▼     ▼     ▼
┌──────┐┌──────┐┌────────┐
│ Risk ││ Food ││ Safety │   Scoring, nutrition parsing,
│Engine││Engine││ Layer  │   emergency detection
└──┬───┘└──┬───┘└────┬───┘
   │       │         │
   ▼       ▼         ▼
┌──────────────────────────┐
│         SQLite           │   Patients, logs, meals, alerts
└──────────┬───────────────┘
           │
           ▼
┌──────────────────┐
│Clinician Dashboard│   Risk-ranked patient overview
│  (HTML/CSS/JS)   │
└──────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, FastAPI, Uvicorn |
| Database | SQLite (WAL mode, foreign keys) |
| ML / Risk | scikit-learn (Logistic Regression, 70/30 blend) |
| Frontend | React 18, Vite, Tailwind CSS |
| Icons | Lucide React |
| VFX / Animation | HTML5 Canvas particle physics (cursor droplet trail), Tailwind Keyframes |
| Voice | Web Speech API (browser-native, EN/TA/HI) |

---

## Quick Start

### 1. Run the Full Stack App (FastAPI serving compiled React build)
```powershell
# In the project root
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
# Open http://localhost:8000
```

### 2. Frontend Development Mode (Hot Module Replacement)
```powershell
# In frontend/ directory
cd frontend
npm install
npm run dev
# Open http://localhost:5173 (proxies /api to localhost:8000)
```


# Open http://localhost:8000
```

The database is auto-created on first run with **12 synthetic patients** and 7 days of realistic health data.

---

## Project Structure

```
renalwatch/
├── README.md
├── requirements.txt
├── backend/
│   ├── __init__.py
│   ├── main.py          # FastAPI app, API endpoints, static file serving
│   ├── db.py            # SQLite schema, seed data (12 synthetic patients)
│   ├── nutrition.py     # Food-to-nutrient parser (regex-based, IFCT-inspired)
│   ├── risk.py          # Rule-based + ML risk scoring engine
│   ├── safety.py        # Hard-coded emergency detection (en/ta/hi)
│   └── data/
│       └── foods.json   # Indian food nutrient database (~35 items)
└── frontend/
    ├── index.html       # Single-page app shell
    ├── css/
    │   └── style.css    # Responsive styling with risk-level color coding
    └── js/
        ├── app.js       # Main application logic
        └── cursor.js    # UI interaction helpers
```

---

## How It Works

### 🩺 Risk Scoring

Each patient receives a **composite risk score (0–100)** built from two components:

1. **Rule-based scoring (70% weight)** evaluates concrete clinical indicators:
   - **Inter-dialytic weight gain (IDWG)** — ≥4% over dry weight → 30 points
   - **Days since last dialysis** — ≥3 days → 20 points
   - **Daily potassium load** — >2000 mg → 20 points
   - **Blood pressure** — systolic ≥160 → 10 points
   - **Symptoms** — swelling (10 pts), cramps (5 pts), fatigue (5 pts), nausea (3 pts), itching (3 pts)
   - Plus phosphorus and fluid limit checks

2. **ML prediction (30% weight)** — a logistic regression model trained on the synthetic patient data, using features like IDWG%, days since session, potassium load, symptom count, and systolic BP.

The blended score maps to risk levels: **High** (≥55), **Medium** (≥30), **Low** (<30). Every score comes with a plain-language explanation of its top contributing factors.

### 🍽️ Food Parsing

The nutrition engine uses **regex-based natural language parsing** to extract food items from free-text meal descriptions like *"2 idli, 1 bowl sambar, coffee"*:

- Matches against an IFCT-inspired database of ~35 Indian foods
- Supports number words (*one, two, half*), digits, and fractional notation
- Matches longest alias first to avoid ambiguity
- Returns per-item and total potassium, phosphorus, sodium, and fluid

### 🚨 Safety Layer

A **hard-coded safety layer** (no AI, no LLMs) scans symptoms and free-text notes for emergency keywords:

- Triggers on: breathlessness, chest pain, severe weakness, fainting, palpitations
- Keyword matching in **English, Tamil, and Hindi**
- Returns pre-written emergency messages advising the patient to seek immediate medical help
- Structured checkbox symptoms (`breathless`, `chest_pain`, `severe_weakness`) are also caught

> **This is not a substitute for medical judgement.** The safety layer is deliberately rigid and conservative.

---

## ⚠️ Synthetic Data Disclaimer

> [!CAUTION]
> **All patient data in this application is entirely synthetic.** No real patient information is used, stored, or processed. RenalWatch is a **proof-of-concept** and is **not a medical device**. It has not been validated for clinical use and must not be used for real patient care decisions.

---

## Privacy & Responsible AI

- **No real patient data** — the system ships with synthetic data only
- **Local-only storage** — SQLite database stored on the local machine; no cloud services, no telemetry
- **No cloud dependency** — runs fully offline after installation
- **No AI-generated medical advice** — emergency guidance is hard-coded by design
- **Transparent scoring** — every risk score includes human-readable explanations of contributing factors
- **Open source** — full codebase available for audit and review

---

## Future Work

- 🔬 **Real IFCT Integration** — replace illustrative nutrient values with verified IFCT 2017 data
- 🏥 **Clinical Pilot** — partner with nephrologists for validation in a controlled setting
- 🤝 **Dialysis Centre Partnerships** — integrate with centre scheduling and EHR systems
- 📱 **Mobile App** — native Android/iOS app for easier patient adoption
- 📊 **Longitudinal Trends** — multi-week trend analysis and predictive alerting
- 🔔 **Push Notifications** — remind patients to log and alert clinicians proactively

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <em>Built with care for patients and clinicians navigating the challenges of dialysis care.</em>
</p>
