"""
main.py – FastAPI application for the RenalWatch dialysis patient monitor.

Exposes a REST API for the frontend dashboard and handles all business logic
by composing the db, risk, nutrition and safety modules.
"""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional
import secrets
import time

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend import db, risk, nutrition, safety, note_analyzer, sms

# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class NoteAnalyzeBody(BaseModel):
    text: str = ""
    lang: str = "en"
    patient_id: Optional[int] = None

class LogBody(BaseModel):
    weight: float
    bp_sys: int
    bp_dia: int
    heart_rate: int = 0
    symptoms: list[str] = Field(default_factory=list)
    note: str = ""
    lang: str = "en"


class MealBody(BaseModel):
    text: str
    lang: str = "en"
    save: bool = True


class SessionBody(BaseModel):
    pre_weight: Optional[float] = None
    post_weight: Optional[float] = None
    notes: str = ""


class RegisterBody(BaseModel):
    name: str
    age: int
    gender: str = "M"
    dry_weight: float
    fluid_limit: int = 1000
    dialysis_schedule: str = "Mon,Wed,Fri"
    phone: str
    password: str
    language: str = "en"


class SendOtpBody(BaseModel):
    phone: str


class VerifyOtpBody(BaseModel):
    phone: str
    otp: str


class LoginBody(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    staff_id: Optional[str] = None
    password: Optional[str] = None
    role: str = "patient"



# ---------------------------------------------------------------------------
# App lifecycle – init DB + train ML model at startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise the database and train the ML risk model on startup."""
    db.init()
    risk.train_model()
    yield


app = FastAPI(
    title="RenalWatch API",
    description="Dialysis patient monitoring and risk assessment",
    version="1.0.0",
    lifespan=lifespan,
)

# Static files directory
_FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# ---------------------------------------------------------------------------
# Helper: compute full patient state
# ---------------------------------------------------------------------------

def patient_state(pid: int) -> dict:
    """Aggregate everything the front-end needs for a single patient."""
    c = db.conn()
    try:
        row = c.execute("SELECT * FROM patients WHERE id = ?", (pid,)).fetchone()
        if not row:
            raise HTTPException(404, f"Patient {pid} not found")
        pat = dict(row)

        today_str = date.today().isoformat()

        # Days since last dialysis session
        last_session = pat.get("last_session")
        if last_session:
            try:
                days_since = (date.today() - date.fromisoformat(last_session)).days
            except ValueError:
                days_since = 0
        else:
            days_since = 999

        # 7-day weight history
        seven_days_ago = (date.today() - timedelta(days=6)).isoformat()
        weight_rows = c.execute(
            "SELECT day, weight, bp_sys, bp_dia, heart_rate, symptoms "
            "FROM logs WHERE pid = ? AND day >= ? ORDER BY day",
            (pid, seven_days_ago),
        ).fetchall()
        weight_history = [dict(r) for r in weight_rows]

        # Parse symptoms JSON in weight history
        for wh in weight_history:
            if isinstance(wh.get("symptoms"), str):
                try:
                    wh["symptoms"] = json.loads(wh["symptoms"])
                except (json.JSONDecodeError, TypeError):
                    wh["symptoms"] = []

        # Latest log (today's or most recent)
        latest_log = c.execute(
            "SELECT * FROM logs WHERE pid = ? ORDER BY day DESC, id DESC LIMIT 1",
            (pid,),
        ).fetchone()

        current_weight = pat["dry_weight"]
        bp_sys, bp_dia = 120, 80
        heart_rate = 72
        symptoms: list[str] = []
        note = ""
        if latest_log:
            current_weight = latest_log["weight"] or pat["dry_weight"]
            bp_sys = latest_log["bp_sys"] or 120
            bp_dia = latest_log["bp_dia"] or 80
            heart_rate = latest_log["heart_rate"] or 72
            try:
                symptoms = json.loads(latest_log["symptoms"] or "[]")
            except (json.JSONDecodeError, TypeError):
                symptoms = []
            note = latest_log["note"] or ""

        # Today's nutrient totals from meals
        meal_rows = c.execute(
            "SELECT k, p, na, fluid FROM meals WHERE pid = ? AND day = ?",
            (pid, today_str),
        ).fetchall()
        k_today = sum(m["k"] for m in meal_rows)
        p_today = sum(m["p"] for m in meal_rows)
        na_today = sum(m["na"] for m in meal_rows)
        fluid_today = sum(m["fluid"] for m in meal_rows)

        # Recent 10 meals
        recent_meals = c.execute(
            "SELECT id, day, text, items, k, p, na, fluid "
            "FROM meals WHERE pid = ? ORDER BY day DESC, id DESC LIMIT 10",
            (pid,),
        ).fetchall()
        meals_list = []
        for m in recent_meals:
            md = dict(m)
            if isinstance(md.get("items"), str):
                try:
                    md["items"] = json.loads(md["items"])
                except (json.JSONDecodeError, TypeError):
                    md["items"] = []
            meals_list.append(md)

        # Dialysis session info
        sessions = c.execute(
            "SELECT * FROM dialysis_sessions WHERE pid = ? ORDER BY date DESC LIMIT 5",
            (pid,),
        ).fetchall()
        sessions_list = [dict(s) for s in sessions]

        # Risk assessment
        risk_result = risk.assess(
            weight=current_weight,
            dry_weight=pat["dry_weight"],
            days_since=days_since,
            k_today=k_today,
            p_today=p_today,
            fluid_today=fluid_today,
            fluid_limit=pat["fluid_limit"],
            symptoms=symptoms,
            bp_sys=bp_sys,
            bp_dia=bp_dia,
        )

        return {
            **pat,
            "days_since_session": days_since,
            "current_weight": current_weight,
            "bp_sys": bp_sys,
            "bp_dia": bp_dia,
            "heart_rate": heart_rate,
            "symptoms": symptoms,
            "weight_history": weight_history,
            "nutrients_today": {
                "k": k_today, "p": p_today, "na": na_today, "fluid": fluid_today,
            },
            "recent_meals": meals_list,
            "sessions": sessions_list,
            "risk": risk_result,
        }
    finally:
        c.close()


# ---------------------------------------------------------------------------
# Authentication & Registration Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/auth/otp/send")
def send_otp(body: SendOtpBody):
    """Generate and dispatch a real carrier SMS OTP to the patient's mobile number."""
    if not body.phone or len(body.phone.strip()) < 8:
        raise HTTPException(400, "A valid 10-digit mobile number is required")

    phone_clean = sms.clean_phone(body.phone)
    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = int(time.time()) + 300  # 5 minutes validity
    now_iso = datetime.utcnow().isoformat()

    c = db.conn()
    try:
        # Clear out unverified OTPs for this phone
        c.execute("DELETE FROM otps WHERE phone = ? AND verified = 0", (phone_clean,))
        c.execute(
            """INSERT INTO otps (phone, otp, expires_at, verified, created_at)
               VALUES (?, ?, ?, 0, ?)""",
            (phone_clean, otp_code, expires_at, now_iso),
        )
        c.commit()
    finally:
        c.close()

    # Dispatch via live carrier gateway
    delivery_status = sms.send_carrier_sms(phone_clean, otp_code)
    return delivery_status


@app.post("/api/auth/otp/verify")
def verify_otp(body: VerifyOtpBody):
    """Verify the 6-digit SMS OTP."""
    if not body.phone or not body.otp:
        raise HTTPException(400, "Mobile number and OTP code are required")

    phone_clean = sms.clean_phone(body.phone)
    otp_clean = body.otp.strip()
    now_ts = int(time.time())

    c = db.conn()
    try:
        row = c.execute(
            """SELECT id, expires_at, verified FROM otps
               WHERE phone = ? AND otp = ?
               ORDER BY id DESC LIMIT 1""",
            (phone_clean, otp_clean),
        ).fetchone()

        if not row:
            raise HTTPException(400, "Invalid OTP code entered. Please check and try again.")

        if row["expires_at"] < now_ts:
            raise HTTPException(400, "OTP code has expired. Please request a new code.")

        # Mark OTP as successfully verified
        c.execute("UPDATE otps SET verified = 1 WHERE id = ?", (row["id"],))
        c.commit()

        return {
            "ok": True,
            "verified": True,
            "phone": phone_clean,
            "message": "Mobile number verified successfully",
        }
    finally:
        c.close()


@app.post("/api/auth/register")
def register(body: RegisterBody):
    """Register a new patient and create baseline clinical profile."""
    c = db.conn()
    try:
        phone_clean = sms.clean_phone(body.phone)
        existing = c.execute("SELECT id FROM patients WHERE phone = ?", (phone_clean,)).fetchone()
        if existing:
            raise HTTPException(400, "This phone number is already registered")

        # Verify that this mobile number has a recently verified OTP (last 15 mins)
        now_ts = int(time.time())
        verified_otp = c.execute(
            """SELECT id FROM otps
               WHERE phone = ? AND verified = 1 AND expires_at >= ?
               ORDER BY id DESC LIMIT 1""",
            (phone_clean, now_ts - 900),
        ).fetchone()

        if not verified_otp:
            raise HTTPException(
                400,
                "Mobile number must be verified with OTP before registration."
            )

        today_str = date.today().isoformat()
        c.execute(
            """INSERT INTO patients
               (name, age, gender, dry_weight, fluid_limit, dialysis_schedule,
                last_session, phone, password, language, synthetic)
               VALUES (?,?,?,?,?,?,?,?,?,?,0)""",
            (body.name.strip(), body.age, body.gender.upper(), body.dry_weight,
             body.fluid_limit, body.dialysis_schedule, today_str,
             phone_clean, body.password, body.language),
        )
        pid = c.execute("SELECT last_insert_rowid()").fetchone()[0]

        # Insert initial baseline log
        c.execute(
            """INSERT INTO logs
               (pid, day, weight, bp_sys, bp_dia, heart_rate, symptoms, note)
               VALUES (?,?,?,?,?,?,?,?)""",
            (pid, today_str, body.dry_weight, 120, 80, 72, "[]", "Initial baseline registration"),
        )
        c.commit()
    finally:
        c.close()

    state = patient_state(pid)
    return {"ok": True, "role": "patient", "patient": state}


@app.post("/api/auth/login")
def login(body: LoginBody):
    """Login as a patient or clinic management."""
    if body.role in ["clinician", "clinic"]:
        if not body.password or not body.password.strip():
            raise HTTPException(400, "Clinic Access Key / Passcode is required")

        # Check against CLINIC_ACCESS_KEY if configured in environment
        clinic_key = os.getenv("CLINIC_ACCESS_KEY")
        if clinic_key and body.password.strip() != clinic_key:
            raise HTTPException(401, "Invalid Clinic Access Key")

        staff_display = body.staff_id or body.email or "Care Team Clinician"
        return {
            "ok": True,
            "role": "clinician",
            "name": staff_display,
            "message": "Welcome to the Clinic Management Portal",
        }

    if not body.phone or not body.phone.strip():
        raise HTTPException(400, "Phone number or patient name required")

    if not body.password or not body.password.strip():
        raise HTTPException(400, "Password or PIN required")

    c = db.conn()
    try:
        phone_clean = body.phone.strip()
        row = c.execute(
            "SELECT * FROM patients WHERE phone = ? OR phone LIKE ? OR name LIKE ?",
            (phone_clean, f"%{phone_clean}%", f"%{phone_clean}%"),
        ).fetchone()

        if not row:
            raise HTTPException(401, "No patient found with that phone number or name")

        pat = dict(row)
        # Check password against stored patient password
        if pat.get("password") and pat["password"] != body.password.strip():
            raise HTTPException(401, "Incorrect password or PIN")

        state = patient_state(pat["id"])
        return {"ok": True, "role": "patient", "patient": state}
    finally:
        c.close()


@app.get("/api/patients/{pid}/dashboard")
def get_patient_dashboard(pid: int):
    """Personalized patient health overview with targets and compliance."""
    state = patient_state(pid)
    pat = state

    # Next session calculation
    today_dt = date.today()
    schedule_days = [s.strip() for s in pat.get("dialysis_schedule", "Mon,Wed,Fri").split(",")]
    day_abbrs = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today_abbr = day_abbrs[today_dt.weekday()]

    if today_abbr in schedule_days:
        next_session_text = "Today"
    else:
        found = None
        for i in range(1, 8):
            d = today_dt + timedelta(days=i)
            if day_abbrs[d.weekday()] in schedule_days:
                found = f"in {i} day{'s' if i > 1 else ''} ({day_abbrs[d.weekday()]})"
                break
        next_session_text = found or "Scheduled this week"

    # Compliance checks
    k_today = pat["nutrients_today"]["k"]
    fluid_today = pat["nutrients_today"]["fluid"]
    fluid_limit = pat["fluid_limit"]
    idwg_pct = pat["risk"]["idwg_pct"]

    compliance = {
        "fluid_ok": fluid_today <= fluid_limit,
        "potassium_ok": k_today <= 2000,
        "weight_ok": idwg_pct < 4.0,
    }

    return {
        "patient": {
            "id": pat["id"],
            "name": pat["name"],
            "age": pat["age"],
            "gender": pat["gender"],
            "dry_weight": pat["dry_weight"],
            "current_weight": pat["current_weight"],
            "fluid_limit": pat["fluid_limit"],
            "dialysis_schedule": pat["dialysis_schedule"],
            "last_session": pat["last_session"],
            "phone": pat["phone"],
            "language": pat["language"],
        },
        "days_since_session": pat["days_since_session"],
        "next_session": next_session_text,
        "risk": pat["risk"],
        "nutrients_today": pat["nutrients_today"],
        "weight_history": pat["weight_history"],
        "recent_meals": pat["recent_meals"],
        "compliance": compliance,
    }


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/patients")
def list_patients():
    """Return all patients with risk scores, sorted by score descending."""
    c = db.conn()
    try:
        rows = c.execute("SELECT id FROM patients").fetchall()
    finally:
        c.close()

    patients = []
    for row in rows:
        state = patient_state(row["id"])
        patients.append({
            "id": state["id"],
            "name": state["name"],
            "age": state["age"],
            "gender": state["gender"],
            "days_since_session": state["days_since_session"],
            "score": state["risk"]["score"],
            "level": state["risk"]["level"],
            "summary": state["risk"]["summary"],
            "factors": state["risk"]["factors"],
        })

    # Sort by risk score descending
    patients.sort(key=lambda p: p["score"], reverse=True)
    return patients


@app.get("/api/patients/{pid}")
def get_patient(pid: int):
    """Full patient detail with weight history, nutrients, risk and meals."""
    return patient_state(pid)


@app.post("/api/patients/{pid}/logs")
def post_log(pid: int, body: LogBody):
    """Record a daily health log entry and return risk + safety assessment."""
    c = db.conn()
    try:
        # Verify patient exists
        pat = c.execute("SELECT * FROM patients WHERE id = ?", (pid,)).fetchone()
        if not pat:
            raise HTTPException(404, f"Patient {pid} not found")

        today_str = date.today().isoformat()
        c.execute(
            """INSERT INTO logs
               (pid, day, weight, bp_sys, bp_dia, heart_rate, symptoms, note)
               VALUES (?,?,?,?,?,?,?,?)""",
            (pid, today_str, body.weight, body.bp_sys, body.bp_dia,
             body.heart_rate, json.dumps(body.symptoms), body.note),
        )
        c.commit()
    finally:
        c.close()

    # Safety check & AI Note Analysis
    safety_result = safety.check(body.symptoms, body.note, body.lang)
    note_analysis = note_analyzer.analyze_patient_note(body.note, body.lang) if body.note else None

    # Escalate safety if note analysis detects emergency
    if note_analysis and note_analysis.get("emergency"):
        safety_result["emergency"] = True
        if not safety_result.get("message"):
            safety_result["message"] = note_analysis.get("recommended_action") or note_analysis.get("clinical_insight")

    # Create alert if emergency detected
    if safety_result["emergency"]:
        c = db.conn()
        try:
            c.execute(
                """INSERT INTO alerts
                   (pid, timestamp, type, severity, message, acknowledged)
                   VALUES (?,?,?,?,?,0)""",
                (pid, datetime.now().isoformat(), "emergency", "critical",
                 safety_result["message"]),
            )
            c.commit()
        finally:
            c.close()

    # Updated risk
    state = patient_state(pid)
    return {
        "risk": state["risk"],
        "safety": safety_result,
        "note_analysis": note_analysis,
    }


@app.post("/api/notes/analyze")
def api_analyze_note(body: NoteAnalyzeBody):
    """Analyze a patient's free-text note using Ollama (if available) or Clinical NLP."""
    return note_analyzer.analyze_patient_note(body.text, body.lang)


@app.get("/api/notes/ollama-status")
def api_ollama_status():
    """Check whether local Ollama LLM is reachable and list available models."""
    return note_analyzer.check_ollama_available()


@app.post("/api/patients/{pid}/meals")
def post_meal(pid: int, body: MealBody):
    """Parse a meal description, optionally save it, return nutrients + risk."""
    c = db.conn()
    try:
        pat = c.execute("SELECT * FROM patients WHERE id = ?", (pid,)).fetchone()
        if not pat:
            raise HTTPException(404, f"Patient {pid} not found")
        fluid_limit = pat["fluid_limit"]
    finally:
        c.close()

    # Analyse the meal text
    result = nutrition.analyze(body.text)
    advisory = nutrition.nutrient_advice(result["total"], fluid_limit)

    # Optionally persist
    if body.save:
        today_str = date.today().isoformat()
        c = db.conn()
        try:
            c.execute(
                """INSERT INTO meals (pid, day, text, items, k, p, na, fluid)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (pid, today_str, body.text, json.dumps(result["items"]),
                 result["total"]["k"], result["total"]["p"],
                 result["total"]["na"], result["total"]["fluid"]),
            )
            c.commit()
        finally:
            c.close()

    # Safety check on the note (meal text may contain keywords)
    safety_result = safety.check(note=body.text, lang=body.lang)

    # Updated risk
    state = patient_state(pid)

    return {
        "items": result["items"],
        "total": result["total"],
        "advisory": advisory,
        "safety": safety_result,
        "risk": state["risk"],
    }


@app.post("/api/patients/{pid}/session")
def mark_session(pid: int, body: SessionBody = SessionBody()):
    """Mark a dialysis session as completed today and return updated risk."""
    c = db.conn()
    try:
        pat = c.execute("SELECT * FROM patients WHERE id = ?", (pid,)).fetchone()
        if not pat:
            raise HTTPException(404, f"Patient {pid} not found")

        today_str = date.today().isoformat()

        # Record the session
        pre_w = body.pre_weight
        post_w = body.post_weight or pat["dry_weight"]
        c.execute(
            """INSERT INTO dialysis_sessions
               (pid, date, pre_weight, post_weight, notes)
               VALUES (?,?,?,?,?)""",
            (pid, today_str, pre_w, post_w, body.notes),
        )

        # Update last_session date on the patient
        c.execute(
            "UPDATE patients SET last_session = ? WHERE id = ?",
            (today_str, pid),
        )
        c.commit()
    finally:
        c.close()

    state = patient_state(pid)
    return {"risk": state["risk"]}


@app.get("/api/stats")
def get_stats():
    """Aggregate statistics across all patients."""
    c = db.conn()
    try:
        rows = c.execute("SELECT id FROM patients").fetchall()
    finally:
        c.close()

    total = len(rows)
    high = medium = low = 0
    idwg_sum = 0.0

    for row in rows:
        state = patient_state(row["id"])
        level = state["risk"]["level"]
        if level == "high":
            high += 1
        elif level == "medium":
            medium += 1
        else:
            low += 1
        idwg_sum += state["risk"]["idwg_pct"]

    return {
        "total_patients": total,
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low,
        "avg_idwg": round(idwg_sum / total, 1) if total else 0.0,
    }


@app.get("/api/patients/{pid}/alerts")
def get_alerts(pid: int):
    """Return all unacknowledged alerts for a patient."""
    c = db.conn()
    try:
        rows = c.execute(
            "SELECT * FROM alerts WHERE pid = ? AND acknowledged = 0 "
            "ORDER BY timestamp DESC",
            (pid,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        c.close()


@app.post("/api/patients/{pid}/alerts/{aid}/ack")
def acknowledge_alert(pid: int, aid: int):
    """Acknowledge (dismiss) an alert."""
    c = db.conn()
    try:
        result = c.execute(
            "UPDATE alerts SET acknowledged = 1 WHERE id = ? AND pid = ?",
            (aid, pid),
        )
        if result.rowcount == 0:
            raise HTTPException(404, f"Alert {aid} not found for patient {pid}")
        c.commit()
        return {"ok": True}
    finally:
        c.close()


# Mount frontend static files at root AFTER all API routes
_FRONTEND_DIST = _FRONTEND_DIR / "dist"
_SERVE_DIR = _FRONTEND_DIST if _FRONTEND_DIST.is_dir() else _FRONTEND_DIR

if _SERVE_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_SERVE_DIR), html=True), name="frontend")


