"""
db.py – SQLite database layer for RenalWatch.

Manages patient records, daily health logs, meal logs, dialysis sessions
and clinical alerts.  Includes a seed() function that populates 12 synthetic
Indian dialysis patients with realistic 7-day data for demo purposes.
"""

from __future__ import annotations

import json
import os
import random
import shutil
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Database path – stored alongside the backend package (or /tmp on Vercel)
# ---------------------------------------------------------------------------
_PROJ_DB_PATH = Path(__file__).resolve().parent.parent / "renalwatch.db"


def _resolve_db_path() -> Path:
    """Return writable DB path, copying seeded template DB to /tmp on Vercel/serverless."""
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_db = Path("/tmp/renalwatch.db")
        if not tmp_db.exists() and _PROJ_DB_PATH.exists():
            try:
                shutil.copy2(str(_PROJ_DB_PATH), str(tmp_db))
            except Exception:
                pass
        return tmp_db if tmp_db.exists() else _PROJ_DB_PATH
    return _PROJ_DB_PATH


def conn() -> sqlite3.Connection:
    """Return a new SQLite connection with Row factory enabled."""
    db_file = _resolve_db_path()
    c = sqlite3.connect(str(db_file))
    c.row_factory = sqlite3.Row
    try:
        c.execute("PRAGMA journal_mode=WAL")
    except sqlite3.OperationalError:
        try:
            c.execute("PRAGMA journal_mode=DELETE")
        except sqlite3.OperationalError:
            pass
    c.execute("PRAGMA foreign_keys=ON")
    return c


# ---------------------------------------------------------------------------
# Schema creation
# ---------------------------------------------------------------------------

_SCHEMA = """
CREATE TABLE IF NOT EXISTS patients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    age             INTEGER NOT NULL,
    gender          TEXT    NOT NULL,
    dry_weight      REAL    NOT NULL,
    fluid_limit     INTEGER NOT NULL DEFAULT 1000,
    dialysis_schedule TEXT  NOT NULL DEFAULT 'Mon,Wed,Fri',
    last_session    TEXT,           -- ISO date of most recent session
    phone           TEXT,
    password        TEXT    NOT NULL DEFAULT '1234',
    language        TEXT    NOT NULL DEFAULT 'en',
    htn             INTEGER DEFAULT 0,
    dm              INTEGER DEFAULT 0,
    hemo            REAL,
    baseline_pot    REAL,
    synthetic       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pid        INTEGER NOT NULL REFERENCES patients(id),
    day        TEXT    NOT NULL,
    weight     REAL,
    bp_sys     INTEGER,
    bp_dia     INTEGER,
    heart_rate INTEGER DEFAULT 0,
    symptoms   TEXT    DEFAULT '[]',   -- JSON array of strings
    note       TEXT
);

CREATE TABLE IF NOT EXISTS meals (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    pid   INTEGER NOT NULL REFERENCES patients(id),
    day   TEXT    NOT NULL,
    text  TEXT,
    items TEXT    DEFAULT '[]',   -- JSON array of parsed items
    k     INTEGER DEFAULT 0,
    p     INTEGER DEFAULT 0,
    na    INTEGER DEFAULT 0,
    fluid INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dialysis_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pid         INTEGER NOT NULL REFERENCES patients(id),
    date        TEXT    NOT NULL,
    pre_weight  REAL,
    post_weight REAL,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    pid          INTEGER NOT NULL REFERENCES patients(id),
    timestamp    TEXT    NOT NULL,
    type         TEXT    NOT NULL,
    severity     TEXT    NOT NULL DEFAULT 'info',
    message      TEXT,
    acknowledged INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS otps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT    NOT NULL,
    otp        TEXT    NOT NULL,
    expires_at INTEGER NOT NULL,
    verified   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
);
"""

# ---------------------------------------------------------------------------
# Seed data – 12 synthetic Indian patients
# ---------------------------------------------------------------------------

_PATIENTS: list[dict] = [
    {"name": "Arun K",      "age": 45, "gender": "M", "dry_weight": 68.0, "fluid_limit": 1000, "schedule": "Mon,Wed,Fri", "phone": "+91-9876500001", "lang": "en"},
    {"name": "Meena S",     "age": 58, "gender": "F", "dry_weight": 55.0, "fluid_limit":  800, "schedule": "Mon,Wed,Fri", "phone": "+91-9876500002", "lang": "ta"},
    {"name": "Rajan P",     "age": 62, "gender": "M", "dry_weight": 72.0, "fluid_limit": 1000, "schedule": "Tue,Thu,Sat", "phone": "+91-9876500003", "lang": "en"},
    {"name": "Lakshmi V",   "age": 52, "gender": "F", "dry_weight": 54.0, "fluid_limit":  900, "schedule": "Mon,Wed,Fri", "phone": "+91-9876500004", "lang": "ta"},
    {"name": "Imran A",     "age": 48, "gender": "M", "dry_weight": 78.0, "fluid_limit": 1200, "schedule": "Tue,Thu,Sat", "phone": "+91-9876500005", "lang": "hi"},
    {"name": "Divya R",     "age": 38, "gender": "F", "dry_weight": 52.0, "fluid_limit":  800, "schedule": "Mon,Wed,Fri", "phone": "+91-9876500006", "lang": "en"},
    {"name": "Suresh M",    "age": 65, "gender": "M", "dry_weight": 75.0, "fluid_limit": 1100, "schedule": "Tue,Thu,Sat", "phone": "+91-9876500007", "lang": "ta"},
    {"name": "Kavitha N",   "age": 42, "gender": "F", "dry_weight": 58.0, "fluid_limit":  900, "schedule": "Mon,Wed,Fri", "phone": "+91-9876500008", "lang": "en"},
    {"name": "Joseph T",    "age": 70, "gender": "M", "dry_weight": 66.0, "fluid_limit": 1000, "schedule": "Tue,Thu,Sat", "phone": "+91-9876500009", "lang": "en"},
    {"name": "Priya D",     "age": 39, "gender": "F", "dry_weight": 56.0, "fluid_limit":  800, "schedule": "Mon,Wed,Fri", "phone": "+91-9876500010", "lang": "ta"},
    {"name": "Ganesh B",    "age": 72, "gender": "M", "dry_weight": 70.0, "fluid_limit": 1000, "schedule": "Tue,Thu,Sat", "phone": "+91-9876500011", "lang": "hi"},
    {"name": "Fathima Z",   "age": 55, "gender": "F", "dry_weight": 60.0, "fluid_limit":  900, "schedule": "Mon,Wed,Fri", "phone": "+91-9876500012", "lang": "en"},
]

# Risk profiles control how aggressive the synthetic data is
_RISK_PROFILES = [
    # (index, profile) – high, medium, or low
    (0,  "high"),    # Arun K     – heavy weight gain, many symptoms
    (1,  "high"),    # Meena S    – poor compliance
    (2,  "medium"),  # Rajan P
    (3,  "low"),     # Lakshmi V  – well controlled
    (4,  "high"),    # Imran A    – heavy, high BP
    (5,  "low"),     # Divya R    – young, compliant
    (6,  "medium"),  # Suresh M
    (7,  "low"),     # Kavitha N
    (8,  "high"),    # Joseph T   – elderly, high risk
    (9,  "low"),     # Priya D
    (10, "medium"),  # Ganesh B
    (11, "medium"),  # Fathima Z
]

_SYMPTOM_POOL_HIGH   = ["swelling", "cramps", "fatigue", "nausea", "itching"]
_SYMPTOM_POOL_MEDIUM = ["cramps", "fatigue", "itching"]
_SYMPTOM_POOL_LOW: list[str] = []

# Day-name abbreviation mapping
_DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _day_abbr(d: date) -> str:
    return _DAY_ABBR[d.weekday()]


def _is_session_day(d: date, schedule: str) -> bool:
    """Check whether *d* falls on a scheduled dialysis day."""
    return _day_abbr(d) in schedule.split(",")


def seed(c: sqlite3.Connection) -> None:
    """Populate the database with 12 synthetic patients + 7 days of data.
    
    Demographic parameters (age, comorbidities, hemoglobin, baseline potassium)
    are sampled from empirical distributions in backend/data/cohort_params.json
    (derived from the public UCI CKD dataset) with a fixed random seed (42)
    for clinical realism and deterministic reproducibility. All clinical records
    remain 100% synthetic personas with no real patient data.
    """
    random.seed(42)
    today = date.today()

    # Load empirical cohort parameters (with robust fallback)
    cohort_params_file = Path(__file__).resolve().parent / "data" / "cohort_params.json"
    c_dist = {}
    c_prop = {}
    if cohort_params_file.is_file():
        try:
            with open(cohort_params_file, "r", encoding="utf-8") as f:
                params_data = json.load(f)
                c_dist = params_data.get("continuous_distributions", {})
                c_prop = params_data.get("categorical_proportions", {})
        except Exception:
            pass

    # Fallback to empirical UCI adult CKD values if JSON is unavailable
    age_mean = c_dist.get("age", {}).get("mean", 57.77)
    age_std  = c_dist.get("age", {}).get("std", 12.79)
    age_min  = max(18, int(c_dist.get("age", {}).get("min", 19.0)))
    age_max  = int(c_dist.get("age", {}).get("max", 90.0))

    htn_rate = c_prop.get("htn", {}).get("positive_rate", 0.6239)
    dm_rate  = c_prop.get("dm", {}).get("positive_rate", 0.5796)

    hemo_mean = c_dist.get("hemo", {}).get("mean", 10.60)
    hemo_std  = c_dist.get("hemo", {}).get("std", 2.16)
    hemo_min  = float(c_dist.get("hemo", {}).get("min", 3.10))
    hemo_max  = float(c_dist.get("hemo", {}).get("max", 16.10))

    pot_mean = c_dist.get("pot", {}).get("mean", 4.45)
    pot_std  = c_dist.get("pot", {}).get("std", 0.88)
    pot_min  = float(c_dist.get("pot", {}).get("min", 2.50))
    pot_max  = float(c_dist.get("pot", {}).get("max", 7.60))

    for idx, pat in enumerate(_PATIENTS):
        profile = dict(_RISK_PROFILES)[idx]

        # Sample clinical parameters from UCI CKD distributions, strictly clipped to observed min/max
        sampled_age = int(round(random.gauss(age_mean, age_std)))
        sampled_age = max(age_min, min(age_max, sampled_age))

        sampled_htn = 1 if random.random() < htn_rate else 0
        sampled_dm = 1 if random.random() < dm_rate else 0

        sampled_hemo = round(random.gauss(hemo_mean, hemo_std), 1)
        sampled_hemo = max(hemo_min, min(hemo_max, sampled_hemo))

        sampled_pot = round(random.gauss(pot_mean, pot_std), 1)
        sampled_pot = max(pot_min, min(pot_max, sampled_pot))

        # --- Insert patient -------------------------------------------------
        # Determine last_session: for high-risk patients, make it 3+ days ago
        # to simulate a missed session. For low-risk, yesterday or today.
        schedule = pat["schedule"]
        # Walk backwards from today to find the most-recent session day
        if profile == "high":
            # Last session was 3–4 days ago
            last_sess = today - timedelta(days=random.choice([3, 4]))
        elif profile == "medium":
            last_sess = today - timedelta(days=2)
        else:
            last_sess = today - timedelta(days=1)

        c.execute(
            """INSERT INTO patients
               (name, age, gender, dry_weight, fluid_limit,
                dialysis_schedule, last_session, phone, password, language,
                htn, dm, hemo, baseline_pot, synthetic)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)""",
            (pat["name"], sampled_age, pat["gender"], pat["dry_weight"],
             pat["fluid_limit"], schedule, last_sess.isoformat(),
             pat["phone"], "1234", pat["lang"],
             sampled_htn, sampled_dm, sampled_hemo, sampled_pot),
        )
        pid = c.execute("SELECT last_insert_rowid()").fetchone()[0]

        # --- Generate 7 days of logs ----------------------------------------
        dry_w = pat["dry_weight"]
        current_weight = dry_w  # resets after each dialysis session

        for day_offset in range(6, -1, -1):       # day 6 (oldest) → 0 (today)
            d = today - timedelta(days=day_offset)
            day_str = d.isoformat()

            # Simulate dialysis: weight resets to near dry weight on session day
            if _is_session_day(d, schedule) and d <= last_sess:
                current_weight = dry_w + random.uniform(0.0, 0.3)
                # Record a dialysis session
                c.execute(
                    """INSERT INTO dialysis_sessions
                       (pid, date, pre_weight, post_weight, notes)
                       VALUES (?,?,?,?,?)""",
                    (pid, day_str,
                     round(current_weight + random.uniform(0.5, 1.5), 1),
                     round(current_weight, 1),
                     "Routine session"),
                )
            else:
                # Weight gain between sessions
                if profile == "high":
                    gain = random.uniform(0.6, 1.2)      # aggressive gain
                elif profile == "medium":
                    gain = random.uniform(0.3, 0.7)
                else:
                    gain = random.uniform(0.1, 0.3)
                current_weight += gain

            # BP generation
            if profile == "high":
                bp_sys = random.randint(150, 175)
                bp_dia = random.randint(90, 105)
            elif profile == "medium":
                bp_sys = random.randint(135, 155)
                bp_dia = random.randint(82, 95)
            else:
                bp_sys = random.randint(118, 138)
                bp_dia = random.randint(70, 85)

            heart_rate = random.randint(68, 98)

            # Symptoms
            if profile == "high":
                symptoms = random.sample(
                    _SYMPTOM_POOL_HIGH,
                    k=random.randint(2, 4),
                )
            elif profile == "medium":
                symptoms = random.sample(
                    _SYMPTOM_POOL_MEDIUM,
                    k=random.randint(0, 2),
                )
            else:
                symptoms = []

            c.execute(
                """INSERT INTO logs
                   (pid, day, weight, bp_sys, bp_dia, heart_rate, symptoms, note)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (pid, day_str, round(current_weight, 1),
                 bp_sys, bp_dia, heart_rate,
                 json.dumps(symptoms), ""),
            )

            # --- Meals for the day ------------------------------------------
            # Generate 1-2 meals per day with varying potassium load
            meal_templates = {
                "high": [
                    ("2 bananas and coconut water with dal and rice",
                     [("banana", 2), ("coconut water", 1), ("dal", 1), ("rice", 1)]),
                    ("potato curry with 3 chapati and buttermilk",
                     [("potato curry", 1), ("chapati", 3), ("buttermilk", 1)]),
                ],
                "medium": [
                    ("2 idli with sambar and coffee",
                     [("idli", 2), ("sambar", 1), ("coffee", 1)]),
                    ("rice with dal and curd",
                     [("rice", 1), ("dal", 1), ("curd", 1)]),
                ],
                "low": [
                    ("2 idli with chutney and tea",
                     [("idli", 2), ("tomato chutney", 1), ("tea", 1)]),
                    ("rice with egg white and rasam",
                     [("rice", 1), ("egg white", 1), ("rasam", 1)]),
                ],
            }

            templates = meal_templates[profile]
            meal_text, meal_items_raw = random.choice(templates)
            # Compute nutrients
            from backend.nutrition import FOOD_DB  # safe – same process
            total_k, total_p, total_na, total_fluid = 0, 0, 0, 0
            items_json = []
            for food_name, qty in meal_items_raw:
                info = FOOD_DB.get(food_name, {})
                ik = info.get("k", 0) * qty
                ip = info.get("p", 0) * qty
                ina = info.get("na", 0) * qty
                ifl = info.get("fluid", 0) * qty
                total_k += ik; total_p += ip; total_na += ina; total_fluid += ifl
                items_json.append({
                    "food": food_name, "qty": qty, "unit": info.get("unit", ""),
                    "k": ik, "p": ip, "na": ina, "fluid": ifl,
                })
            c.execute(
                """INSERT INTO meals (pid, day, text, items, k, p, na, fluid)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (pid, day_str, meal_text, json.dumps(items_json),
                 total_k, total_p, total_na, total_fluid),
            )

        # --- Alerts for high-risk patients -----------------------------------
        if profile == "high":
            c.execute(
                """INSERT INTO alerts
                   (pid, timestamp, type, severity, message, acknowledged)
                   VALUES (?,?,?,?,?,0)""",
                (pid, datetime.now().isoformat(), "high_idwg",
                 "warning",
                 f"{pat['name']}: Weight gain exceeds 4% of dry weight. "
                 "Review fluid and diet compliance."),
            )

    c.commit()


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------

def init() -> None:
    """Create tables (if needed) and seed the database when empty."""
    c = conn()
    try:
        c.executescript(_SCHEMA)
        # Migrate optional columns if missing in an existing database
        for col_stmt in [
            "ALTER TABLE patients ADD COLUMN password TEXT DEFAULT '1234'",
            "ALTER TABLE patients ADD COLUMN htn INTEGER DEFAULT 0",
            "ALTER TABLE patients ADD COLUMN dm INTEGER DEFAULT 0",
            "ALTER TABLE patients ADD COLUMN hemo REAL",
            "ALTER TABLE patients ADD COLUMN baseline_pot REAL",
        ]:
            try:
                c.execute(col_stmt)
                c.commit()
            except sqlite3.OperationalError:
                pass  # Already exists
        # Only seed if no patients exist yet
        count = c.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
        if count == 0:
            seed(c)
    finally:
        c.close()
