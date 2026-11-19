# 💧 RenalWatch

**AI-Assisted Early-Warning Dialysis Companion for End-Stage Renal Disease (ESRD)**

[![Production Live](https://img.shields.io/badge/Vercel-Production%20Live-black?style=flat&logo=vercel)](https://github.com/Yukeshj26/RenalWatch)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?style=flat&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Database](https://img.shields.io/badge/Database-SQLite%20WAL-003B57?style=flat&logo=sqlite)](https://sqlite.org)
[![Safety](https://img.shields.io/badge/Safety-Deterministic%20Firewall-red?style=flat)](https://github.com/Yukeshj26/RenalWatch)

---

## 📌 Executive Summary

For end-stage renal disease (ESRD) patients undergoing maintenance hemodialysis, the majority of emergency department admissions and cardiac mortalities occur during the **interdialytic period** — particularly the long 3-day weekend gap. Patients face severe fluid overload, acute pulmonary edema, and lethal hyperkalemia (potassium spikes) with little or no early warning.

**RenalWatch** bridges the critical interdialytic gap by connecting patients and clinical nephrology care teams through a dual-role digital platform:

- **Patient Portal**: Daily 1-minute vitals check-in, target dry weight monitoring, interactive weight sparklines, collapsible itemized food logs, and an interactive **table-based meal nutrient tracker** grounded in the Indian Food Composition Tables (IFCT).
- **Clinic Management Dashboard**: Urgency-ranked patient triage queue (0–100 risk score) with quantified clinical badges, 7-day lab trend sparklines, and session tracking for timely telephone outreach.
- **Deterministic Safety Firewall**: A hard-coded, zero-hallucination safety detector that immediately intercepts red-flag symptoms (breathlessness, chest pain, syncope, fistula thrill loss) and triggers emergency medical protocols in English, Tamil, and Hindi without passing through generative AI text models.

---

## 🎯 Key Capabilities & Architectural Pillars

| Capability | Technical Implementation | Clinical Value |
| :--- | :--- | :--- |
| 🛡️ **Role-Based Authentication** | Secure role gateway for **Dialysis Patients** vs **Clinic Management** | Ensures private self-monitoring for patients and cohort-wide triage for nephrology care teams. |
| 📱 **Real Carrier SMS OTP** | Fast2SMS & Twilio carrier gateways + cryptographic 6-digit OTP verification | Guarantees authentic patient phone verification before clinical profile activation. |
| 🥗 **Table-Based Food Entry** | Interactive table with food item, quantity, serving unit, and quick presets | Replaces ambiguous text sentences with precise, itemized dietary tracking. |
| 🍽️ **IFCT Food-to-Nutrient Engine** | Grounded in 98+ staple foods from Indian Food Composition Tables | Accurately calculates Potassium (K), Phosphorus (P), Sodium (Na), and Fluid load. |
| ⚖️ **Interdialytic Risk Engine** | Blended 70% rule-based scoring + 30% calibrated Logistic Regression ($0.000000$ variance) | Zero-dependency mathematical sigmoid inference ($~15$ MB lambda bundle vs 260 MB scikit-learn). |
| 📋 **Collapsible Food Intake Log** | Clean, hidden-by-default table that expands on user click | Keeps the daily dashboard uncluttered while providing full itemized audit logs. |
| 📊 **Quantified Health Status** | Structured vitals table with measured quantities and safe baselines | Displays IDWG%, dry weight variance, BP stages, resting pulse, and fluid limits. |
| 🚨 **Deterministic Safety Firewall** | Regex-based multilingual symptom matching (English, Tamil, Hindi) | Eliminates AI hallucination risk; delivers immediate emergency clinical directives. |
| 🎤 **Multilingual Voice Note NLP** | Web Speech API speech-to-text + clinical NLP note analyzer | Captures patient feedback in English, தமிழ் (Tamil), and हिन्दी (Hindi). |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RENALWATCH CLIENT (VITE + REACT)                 │
├──────────────────────────────────┬──────────────────────────────────────┤
│          RoleGateway.jsx         │  Patient Portal vs Clinic Selection  │
├──────────────────────────────────┼──────────────────────────────────────┤
│   PersonalizedPatientPortal.jsx   │  Vitals, IDWG%, Gauges, Collapsible  │
│                                  │  Food Intake Table with Quantities   │
├──────────────────────────────────┼──────────────────────────────────────┤
│     ClinicianDashboard.jsx       │  Urgency Queue (0–100), Triage Badges│
├──────────────────────────────────┼──────────────────────────────────────┤
│       FoodCheckModal.jsx         │  Table Form for Adding Meals (Units) │
├──────────────────────────────────┼──────────────────────────────────────┤
│       LogHealthModal.jsx         │  Daily Check-in + Multilingual NLP   │
└─────────────────┬────────────────┴──────────────────────────────────────┘
                  │  HTTP / REST (Proxy: /api/* -> Port 8000)
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI ASGI SERVER                             │
│                  (Standalone Uvicorn or Vercel Serverless)              │
├──────────────────────────────────┬──────────────────────────────────────┤
│         backend/main.py          │  REST Endpoints, Sessions, Triage    │
├──────────────────────────────────┼──────────────────────────────────────┤
│         backend/risk.py          │  Mathematical Logistic Regression    │
│                                  │  z = -27.21 + 1.94(IDWG) + ...       │
├──────────────────────────────────┼──────────────────────────────────────┤
│       backend/nutrition.py       │  IFCT Indian Nutrient Parser         │
├──────────────────────────────────┼──────────────────────────────────────┤
│     backend/note_analyzer.py     │  Multilingual Clinical NLP Analyzer  │
├──────────────────────────────────┼──────────────────────────────────────┤
│        backend/safety.py         │  Deterministic Red-Flag Firewall     │
└─────────────────┬────────────────┴──────────────────────────────────────┘
                  │  WAL Mode SQLite
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              SQLITE DATABASE (renalwatch.db / /tmp in serverless)       │
│    Tables: patients · logs · meals · dialysis_sessions · alerts         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Mathematical Risk Formulation

RenalWatch assesses clinical urgency using a dual-engine algorithm:

$$Score_{\text{Composite}} = 0.70 \times Score_{\text{Rule}} + 0.30 \times (P_{\text{ML}} \times 100)$$

### 1. Rule-Based Scoring ($70\%$ Weight)
Evaluates concrete clinical indicators:
- **Interdialytic Weight Gain (IDWG%)**:
  $$\text{IDWG\%} = \frac{\text{Current Weight} - \text{Dry Weight}}{\text{Dry Weight}} \times 100$$
  - $\text{IDWG\%} \ge 4.0\% \implies +30\text{ pts}$
  - $\text{IDWG\%} \ge 2.0\% \implies +10\text{ pts}$
- **Interdialytic Gap**: $\ge 3\text{ days since last session} \implies +20\text{ pts}$
- **Potassium Load**: $> 2,000\text{ mg/day} \implies +20\text{ pts}$
- **Blood Pressure**: Systolic $\ge 160\text{ mmHg} \implies +10\text{ pts}$; Systolic $\ge 140\text{ mmHg} \implies +5\text{ pts}$
- **Reported Symptoms**: Swelling ($+10$), Cramps ($+5$), Fatigue ($+5$), Nausea ($+3$), Itching ($+3$)

### 2. Zero-Dependency ML Logistic Regression ($30\%$ Weight)
To ensure sub-second cold starts on serverless platforms (e.g. Vercel / AWS Lambda) without the massive $>240\text{ MB}$ footprint of `scipy` and `scikit-learn`, RenalWatch executes pure mathematical inference:

$$z = -27.2132 + 1.9443 \cdot (\text{IDWG\%}) + 1.5264 \cdot (\text{Days}) + 0.003217 \cdot K + 2.7862 \cdot (\text{Symptoms}) + 0.05721 \cdot (\text{BP}_{\text{sys}})$$

$$P(\text{High Risk}) = \frac{1}{1 + e^{-z}}$$

> **Validation Note:** Verified side-by-side against Scikit-Learn across all test cohorts with **$0.000000$ difference**.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3.4, Lucide React, HTML5 Canvas VFX |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic v2 |
| **Database** | SQLite3 (WAL mode, Foreign Keys, Serverless `/tmp` Auto-Migration) |
| **Dietary Grounding** | Indian Food Composition Tables (IFCT) |
| **Speech & NLP** | Web Speech API, Regex Clinical NLP, optional local Ollama LLM integration |
| **Deployment** | Vercel Serverless Function (`api/index.py`) + Local Dev Server |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+ (Python 3.12 recommended)
- **Git**

---

### Option A: Run Locally in Development Mode (Recommended)

#### 1. Clone the Repository
```bash
git clone https://github.com/Yukeshj26/RenalWatch.git
cd RenalWatch
```

#### 2. Start the Backend API (Terminal 1)
```powershell
# Install Python dependencies (lightweight, ~15 MB total)
pip install -r requirements.txt

# (Optional) Configure Real Carrier SMS Gateway for Live OTPs
# Indian Numbers: Fast2SMS API key (https://fast2sms.com)
$env:FAST2SMS_API_KEY="your_fast2sms_api_key_here"

# International / Twilio:
# $env:TWILIO_ACCOUNT_SID="your_twilio_sid"
# $env:TWILIO_AUTH_TOKEN="your_twilio_token"
# $env:TWILIO_PHONE_NUMBER="+1234567890"

# Run the FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
*API will be available at [http://localhost:8000](http://localhost:8000), Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs).*
> **Note on OTPs:** When carrier keys are configured, real SMS messages are dispatched via Fast2SMS / Twilio. In sandbox / dev mode without keys, RenalWatch logs the OTP and displays a convenient quick-fill button directly in the registration modal for seamless testing.

#### 3. Start the Frontend Client (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
*Frontend will open at **[http://localhost:5173](http://localhost:5173)** and automatically proxy `/api/*` requests to port 8000.*

---

### Option B: Build for Production

```powershell
cd frontend
npm run build
```
The compiled single-page application will be output to `frontend/dist/`.

---

## 📁 Repository Structure

```
RenalWatch/
├── README.md                          # Comprehensive documentation
├── requirements.txt                   # Minimal Python dependencies (FastAPI, Uvicorn, Pydantic)
├── vercel.json                        # Vercel serverless builds and SPA rewrites
├── api/
│   └── index.py                       # Serverless ASGI entrypoint for Vercel
├── backend/
│   ├── main.py                        # FastAPI routes, auth gateway, and patient state
│   ├── sms.py                         # Live carrier SMS gateway (Fast2SMS, Twilio, 2Factor)
│   ├── db.py                          # SQLite connection, WAL mode, schema & seed data
│   ├── risk.py                        # Deterministic rule engine + Sigmoid ML inference
│   ├── nutrition.py                   # IFCT meal analyzer and nutrient calculators
│   ├── note_analyzer.py               # Multilingual clinical NLP symptom extraction
│   ├── safety.py                      # Deterministic clinical emergency firewall
│   └── data/
│       └── foods.json                 # IFCT-verified Indian staple foods database
└── frontend/
    ├── package.json                   # React 18, Vite, Tailwind CSS dependencies
    ├── vite.config.js                 # Dev server configuration with /api proxy
    ├── index.html                     # HTML5 SPA container
    └── src/
        ├── main.jsx                   # React root mount
        ├── App.jsx                    # Root app state, modal orchestrator, navigation
        ├── index.css                  # Tailwind styles and medical color system
        └── components/
            ├── RoleGateway.jsx        # Role selection entry (Patient vs Clinic Management)
            ├── PersonalizedPatientPortal.jsx # Patient health metrics, sparkline, collapsible food log
            ├── ClinicianDashboard.jsx # Central triage priority queue with quantified badges
            ├── FoodCheckModal.jsx     # Interactive table form for meal addition & quantities
            ├── LogHealthModal.jsx     # Daily health logging modal with multilingual speech capture
            ├── PatientDetailModal.jsx # Clinician patient chart deep dive with collapsible meals
            ├── LoginModal.jsx         # Credential sign-in modal
            ├── RegisterModal.jsx      # New dialysis patient registration modal
            ├── SafetyModal.jsx        # Clinical emergency protocols (EN / TA / HI)
            ├── AboutModal.jsx         # Architectural pillar overview
            └── CursorTrail.jsx        # Subtle fluid particle canvas effect
```

---

## 🔒 Safety & Medical Disclaimer

> [!CAUTION]
> **RenalWatch is a technology demonstration and clinical decision-support proof of concept.**
> - All patient records included in this repository are **100% synthetic**. No real Protected Health Information (PHI) is used or stored.
> - RenalWatch is **not a certified medical device** and is not intended to replace formal clinical assessment, hospital admission, or physician judgment.
> - Life-threatening symptoms (e.g., severe breathlessness, chest pain, syncope, cessation of vascular access thrill) must always be escalated to emergency medical services immediately.

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
