"""
note_analyzer.py – Intelligent Clinical Note & Symptom Detection Engine for RenalWatch.

Analyzes free-text input in the "Notes / Anything else to report?" section.
Features:
1. Seamless Ollama (Local LLM) integration for deep conversational clinical understanding.
2. High-performance Clinical NLP fallback engine with zero latency, zero hallucinations,
   and deterministic emergency safety guarantees.
3. Multilingual detection across English, Tamil, and Hindi.
4. Auto-mapping of free-text phrases into structured symptom tags.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.request
import urllib.error
from typing import Any

logger = logging.getLogger(__name__)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT", "4.0"))


# ---------------------------------------------------------------------------
# Structured Symptom Mapping Patterns
# ---------------------------------------------------------------------------

PATTERNS_EMERGENCY = [
    (r"\b(chest\s*pain|chest\s*tight(ness)?|chest\s*pressure|angina)\b", "Chest Pain / Tightness", "chest_pain"),
    (r"\b(breathless|short(ness)?\s*of\s*breath|cannot\s*breathe|trouble\s*breathing|dyspnea)\b", "Severe Breathlessness", "breathless"),
    (r"\b(faint(ed|ing)?|black(ed)?\s*out|passed\s*out|syncope|unconscious|collapsed)\b", "Loss of Consciousness / Syncope", "severe_weakness"),
    (r"\b(palpitation|palpitations|irregular\s*heartbeat|racing\s*heart|heart\s*flutter)\b", "Cardiac Palpitations", "severe_weakness"),
    (r"\b(severe\s*weakness|cannot\s*stand|extreme\s*dizziness|vertigo)\b", "Severe Weakness & Dizziness", "severe_weakness"),
    (r"\b(coughing\s*(pink|blood)|froth\s*in\s*cough)\b", "Suspected Acute Pulmonary Edema", "breathless"),
    # Tamil
    (r"(நெஞ்சு\s*வலி|மார்பு\s*வலி)", "நெஞ்சு வலி (Chest Pain)", "chest_pain"),
    (r"(மூச்சுத்திணறல்|மூச்சு\s*விட\s*முடியவில்லை|மூச்சு\s*திணறல்)", "மூச்சுத்திணறல் (Breathlessness)", "breathless"),
    (r"(மயக்கம்|மயங்கி|சுயநினைவு)", "மயக்கம் (Fainting/Syncope)", "severe_weakness"),
    (r"(படபடப்பு|நெஞ்சு\s*படபடப்பு)", "படபடப்பு (Palpitations)", "severe_weakness"),
    # Hindi
    (r"(छाती\s*में.*दर्द|सीने\s*में.*दर्द|छाती\s*दर्द|सीने\s*दर्द)", "सीने में दर्द (Chest Pain)", "chest_pain"),
    (r"(सांस\s*फूल|सांस\s*लेने\s*में.*तकलीफ|सांस\s*नहीं\s*आ\s*रही)", "सांस फूलना (Breathlessness)", "breathless"),
    (r"(बेहोश|बेहोशी|चक्कर\s*खाकर)", "बेहोशी (Fainting/Syncope)", "severe_weakness"),
    (r"(दिल\s*की\s*धड़कन|घबराहट)", "दिल की धड़कन (Palpitations)", "severe_weakness"),
]

PATTERNS_FLUID = [
    (r"\b(swelling|swollen|edema|puffy|puffiness)\b", "Swelling / Fluid Retention", "swelling"),
    (r"\b(swollen\s*(feet|legs|ankles|face|eyes)|tight\s*(shoes|ring))\b", "Peripheral / Facial Edema", "swelling"),
    (r"\b(lying\s*flat\s*(hard|difficult|cannot)|breathless\s*when\s*lying|orthopnea)\b", "Orthopnea (Fluid in Lungs)", "breathless"),
    (r"\b(drank\s*(too\s*much|extra|excess|lots\s*of)\s*(water|fluid|juice)|thirst(y)?)\b", "Excess Fluid Intake Reported", None),
    (r"\b(weight\s*(jumped|shot\s*up|increased|gained))\b", "Rapid Interdialytic Weight Gain", None),
    # Tamil
    (r"(கால்\s*வீக்கம்|முக\s*வீக்கம்|வீக்கம்)", "கால்/முக வீக்கம் (Edema)", "swelling"),
    (r"(படுக்க\s*முடியவில்லை|படுக்கும்போது\s*மூச்சு)", "படுக்கும்போது மூச்சுத்திணறல் (Orthopnea)", "breathless"),
    # Hindi
    (r"(पैरों\s*में\s*सूजन|चेहरे\s*पर\s*सूजन|सूजन)", "पैरों/चेहरे में सूजन (Edema)", "swelling"),
]

PATTERNS_POTASSIUM = [
    (r"\b(coconut\s*water|tender\s*coconut|elaneer|nariyal\s*pani)\b", "High-Potassium Intake (Coconut Water)", None),
    (r"\b(banana|plantain|mango|citrus|orange\s*juice|dry\s*fruits|dates|raisins)\b", "High-Potassium Food Ingestion", None),
    (r"\b(tingling|numbness|pins\s*and\s*needles)\s*(in\s*(fingers|hands|feet|lips|mouth))?\b", "Paresthesia / Hyperkalemia Warning Sign", "severe_weakness"),
    (r"\b(heavy\s*legs|muscle\s*heaviness|cannot\s*lift\s*legs)\b", "Neuromuscular Hyperkalemia Signal", "severe_weakness"),
    # Tamil
    (r"(இளநீர்|வாழைப்பழம்)", "அதிக பொட்டாசியம் உணவு (Coconut Water/Banana)", None),
    (r"(மரமரப்பு|ஊசி\s*குத்துவது\s*போல)", "மரமரப்பு (Tingling/Hyperkalemia Sign)", "severe_weakness"),
    # Hindi
    (r"(नारियल\s*पानी|केला)", "उच्च पोटैशियम आहार (Coconut Water/Banana)", None),
    (r"(झनझनाहट|हाथ\s*सुन्न)", "हाथ पैरों में झनझनाहट (Tingling/Numbness)", "severe_weakness"),
]

PATTERNS_HYPOTENSION_CRAMPS = [
    (r"\b(cramp|cramps|cramping|muscle\s*spasm)\b", "Muscle Cramps (Post-Dialysis / Ultrafiltration)", "cramps"),
    (r"\b(dizzy|dizziness|lightheaded|head\s*spinning)\b", "Post-Dialysis Hypotension / Dizziness", "severe_weakness"),
    (r"\b(low\s*bp|bp\s*(dropped|fell)|hypotension)\b", "Reported Low Blood Pressure", None),
    (r"\b(washed\s*out|drained|exhausted|shivering|chills)\b", "Post-Dialysis Fatigue / Washed Out", "fatigue"),
    # Tamil
    (r"(தசை\s*பிடிப்பு|கால்\s*பிடிப்பு)", "தசை பிடிப்பு (Muscle Cramps)", "cramps"),
    (r"(தலைசுற்றல்|மயக்கம்\s*வருவது\s*போல்)", "தலைசுற்றல் (Dizziness)", "severe_weakness"),
    # Hindi
    (r"(मांसपेशियों\s*में\s*ऐंठन|पिंडलियों\s*में\s*खिंचाव)", "मांसपेशियों में ऐंठन (Cramps)", "cramps"),
    (r"(सिर\s*घूमना|चक्कर\s*आना)", "चक्कर आना (Dizziness)", "severe_weakness"),
]

PATTERNS_FISTULA = [
    (r"\b(fistula|av\s*fistula|dialysis\s*arm|graft|catheter|central\s*line)\b", "Vascular Access (Fistula/Catheter) Mentioned", None),
    (r"\b(no\s*thrill|(buzz(ing)?|vibration)\s*(has\s*)?stopped|stopped\s*(buzz(ing)?|vibrat(ing|ion)))\b", "🚨 Fistula Thrill Stopped (Vascular Emergency)", None),
    (r"\b(fistula\s*(bleed(ing)?|leak(ing)?|burst))\b", "🚨 Fistula Bleeding (Emergency Pressure Required)", None),
    (r"\b(arm\s*(red|warm|hot|pain|swollen)|discharge\s*from\s*(fistula|line))\b", "Possible Fistula Infection / Phlebitis", None),
]

PATTERNS_UREMIC = [
    (r"\b(itch|itching|pruritus|scratching|dry\s*skin)\b", "Uremic Pruritus / Phosphorus Elevation", "itching"),
    (r"\b(nausea|vomit(ing)?|throw(ing)?\s*up|queasy)\b", "Nausea / GI Distress", "nausea"),
    (r"\b(metallic\s*taste|loss\s*of\s*appetite|food\s*tastes\s*bad)\b", "Uremic Dysgeusia / Anorexia", "nausea"),
    (r"\b(missed\s*(binder|bp\s*pill|medicine|tablet|meds))\b", "Missed Nephrology Medication", None),
]


# ---------------------------------------------------------------------------
# Clinical NLP Fallback Engine
# ---------------------------------------------------------------------------

def clinical_nlp_analyze(text: str, lang: str = "en") -> dict[str, Any]:
    """Deterministic, zero-latency clinical symptom and risk extractor."""
    clean_text = text.strip()
    if not clean_text:
        return {
            "text": "",
            "emergency": False,
            "urgency": "info",
            "category": "general",
            "detected_symptoms": [],
            "auto_symptom_tags": [],
            "clinical_insight": "No symptoms or complaints reported in the note.",
            "recommended_action": "Continue following your prescribed fluid allowance and medication schedule.",
            "engine": "clinical_nlp",
        }

    detected_items = []
    auto_tags = set()
    is_emergency = False
    is_warning = False
    category = "general"

    # 1. Check Fistula emergencies first
    for pattern, label, tag in PATTERNS_FISTULA:
        if re.search(pattern, clean_text, re.IGNORECASE):
            detected_items.append(label)
            category = "fistula"
            if "🚨" in label or "stopped" in label.lower() or "bleed" in label.lower():
                is_emergency = True
            else:
                is_warning = True

    # 2. Check Red-Flag Cardiac & Respiratory Emergencies
    for pattern, label, tag in PATTERNS_EMERGENCY:
        if re.search(pattern, clean_text, re.IGNORECASE):
            detected_items.append(label)
            is_emergency = True
            category = "emergency_cardiorespiratory"
            if tag:
                auto_tags.add(tag)

    # 3. Check Fluid Retention & Orthopnea
    for pattern, label, tag in PATTERNS_FLUID:
        if re.search(pattern, clean_text, re.IGNORECASE):
            detected_items.append(label)
            if category == "general":
                category = "fluid_overload"
            if "Orthopnea" in label:
                is_emergency = True
            else:
                is_warning = True
            if tag:
                auto_tags.add(tag)

    # 4. Check Potassium Spikes & Neuromuscular
    for pattern, label, tag in PATTERNS_POTASSIUM:
        if re.search(pattern, clean_text, re.IGNORECASE):
            detected_items.append(label)
            if category == "general":
                category = "hyperkalemia"
            is_warning = True
            if "Tingling" in label or "Neuromuscular" in label:
                is_warning = True
            if tag:
                auto_tags.add(tag)

    # 5. Check Hypotension & Muscle Cramps
    for pattern, label, tag in PATTERNS_HYPOTENSION_CRAMPS:
        if re.search(pattern, clean_text, re.IGNORECASE):
            detected_items.append(label)
            if category == "general":
                category = "hypotension_cramps"
            is_warning = True
            if tag:
                auto_tags.add(tag)

    # 6. Check Uremic / Other
    for pattern, label, tag in PATTERNS_UREMIC:
        if re.search(pattern, clean_text, re.IGNORECASE):
            detected_items.append(label)
            if category == "general":
                category = "uremic_lifestyle"
            if tag:
                auto_tags.add(tag)

    # Deduplicate detected items
    unique_detected = []
    for it in detected_items:
        if it not in unique_detected:
            unique_detected.append(it)

    # Determine Urgency
    if is_emergency:
        urgency = "critical"
    elif is_warning:
        urgency = "warning"
    elif unique_detected:
        urgency = "info"
    else:
        urgency = "info"
        unique_detected = ["Self-reported health note recorded"]

    # Generate Explainable Patient Guidance based on findings
    insight, action = generate_clinical_guidance(category, unique_detected, urgency, lang)

    return {
        "text": clean_text,
        "emergency": is_emergency,
        "urgency": urgency,
        "category": category,
        "detected_symptoms": unique_detected,
        "auto_symptom_tags": list(auto_tags),
        "clinical_insight": insight,
        "recommended_action": action,
        "engine": "clinical_nlp",
    }


def generate_clinical_guidance(
    category: str,
    symptoms: list[str],
    urgency: str,
    lang: str = "en",
) -> tuple[str, str]:
    """Produce concise, medically responsible patient guidance without hallucination."""
    if urgency == "critical":
        if lang == "ta":
            return (
                "🚨 அவசர எச்சரிக்கை: உயிருக்கு ஆபத்தான தீவிர அறிகுறிகள் கண்டறியப்பட்டன (நெஞ்சு வலி / மூச்சுத்திணறல் / மயக்கம் / பிஸ்டுலா கோளாறு).",
                "உடனடியாக உங்கள் டயாலிசிஸ் மையம் அல்லது 108 அவசர சிகிச்சைப் பிரிவைத் தொடர்பு கொள்ளுங்கள். அடுத்த அமர்வு வரை காத்திருக்க வேண்டாம்!"
            )
        elif lang == "hi":
            return (
                "🚨 आपातकालीन चेतावनी: गंभीर एवं खतरनाक लक्षण पाए गए हैं (सीने में दर्द / सांस लेने में गंभीर तकलीफ / बेहोशी)।",
                "तुरंत अपने डायलिसिस केंद्र या आपातकालीन अस्पताल (108) से संपर्क करें। अगले डायलिसिस सत्र का इंतज़ार न करें!"
            )
        else:
            return (
                "🚨 CRITICAL RED-FLAG: Severe, potentially life-threatening signals detected (Chest pain, acute breathlessness, orthopnea, or fistula compromise).",
                "Contact your nephrologist, dialysis unit, or emergency medical services (108/911) IMMEDIATELY. Do not wait for your next routine dialysis session."
            )

    if category == "fluid_overload":
        return (
            "⚠️ Fluid retention indicators detected (Edema or shortness of breath when lying flat). This suggests interdialytic fluid accumulation.",
            "Strictly stop extra fluid intake. Elevate swollen legs above heart level while resting. Inform your care team so they can adjust your ultrafiltration target."
        )

    if category == "hyperkalemia":
        return (
            "⚠️ High potassium risk identified (Coconut water, high-K fruits, or peripheral tingling). In dialysis patients, potassium cannot be cleared and may cause cardiac arrhythmias.",
            "Avoid all coconut water, bananas, fruit juices, and raw salad until your next session. If muscle weakness or heart flutters develop, seek emergency care immediately."
        )

    if category == "fistula":
        return (
            "⚠️ Vascular access observation noted. Your AV fistula or catheter is your lifeline for dialysis treatment.",
            "Check for the continuous buzzing vibration ('thrill') with your fingers. Never sleep on this arm or allow BP cuffs on it. If the thrill has stopped, notify your center immediately."
        )

    if category == "hypotension_cramps":
        return (
            "ℹ️ Post-dialysis fatigue or cramping observed. This frequently occurs when target dry weight is exceeded or ultrafiltration rate was high.",
            "Rest quietly with feet slightly elevated. Do NOT drink large amounts of water to treat cramps without consulting your nurse. Gently stretch the affected muscle."
        )

    if category == "uremic_lifestyle":
        return (
            "ℹ️ Uremic or medication observations recorded (itching, nausea, or missed binder).",
            "Keep skin moisturized with unscented emollients. Take phosphorus binders strictly with the first bite of meals. Review persistent nausea with your nephrologist."
        )

    return (
        "ℹ️ Daily observation logged for your dialysis care team.",
        "Maintain your prescribed fluid limit and adhere to your hemodialysis treatment schedule."
    )


# ---------------------------------------------------------------------------
# Ollama Local LLM Integration
# ---------------------------------------------------------------------------

def check_ollama_available() -> dict[str, Any]:
    """Check if Ollama server is responding at OLLAMA_HOST."""
    try:
        req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags", headers={"User-Agent": "RenalWatch/1.0"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name", "") for m in data.get("models", [])]
                return {
                    "available": True,
                    "host": OLLAMA_HOST,
                    "models": models,
                    "default_model": OLLAMA_DEFAULT_MODEL if OLLAMA_DEFAULT_MODEL in models else (models[0] if models else "none"),
                }
    except Exception as e:
        logger.debug("Ollama not reachable: %s", e)

    return {
        "available": False,
        "host": OLLAMA_HOST,
        "models": [],
        "default_model": None,
    }


def ollama_analyze_note(text: str, lang: str = "en") -> dict[str, Any] | None:
    """Query local Ollama instance to analyze the patient's note. Returns None on failure."""
    status = check_ollama_available()
    if not status["available"]:
        return None

    model = status["default_model"] or OLLAMA_DEFAULT_MODEL

    system_prompt = (
        "You are an expert Nephrology Clinical AI Assistant for hemodialysis patients with End-Stage Renal Disease (ESRD). "
        "Analyze the patient's daily self-reported free-text note. "
        "Return strictly valid JSON with no markdown and no backticks. "
        "Format schema: "
        "{"
        "  \"emergency\": boolean (true if severe chest pain, breathless, syncope, fistula stopped thrill, severe palpitation),"
        "  \"urgency\": \"critical\" | \"warning\" | \"info\","
        "  \"category\": \"fluid_overload\" | \"hyperkalemia\" | \"hypotension_cramps\" | \"fistula\" | \"uremic_lifestyle\" | \"general\","
        "  \"detected_symptoms\": [\"Short list of detected complaints\"],"
        "  \"auto_symptom_tags\": [subset of \"swelling\", \"cramps\", \"fatigue\", \"nausea\", \"itching\", \"breathless\", \"chest_pain\", \"severe_weakness\"],"
        "  \"clinical_insight\": \"1-2 empathetic explainable sentences for dialysis patient\","
        "  \"recommended_action\": \"1 specific instruction what to do right now\""
        "}"
    )

    user_payload = {
        "model": model,
        "prompt": f"Patient's Note (Language: {lang}): \"{text}\"\nRespond with JSON only:",
        "system": system_prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "top_p": 0.9,
        },
    }

    try:
        req_data = json.dumps(user_payload).encode("utf-8")
        req = urllib.request.Request(
            f"{OLLAMA_HOST}/api/generate",
            data=req_data,
            headers={"Content-Type": "application/json", "User-Agent": "RenalWatch/1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT_SECONDS) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode("utf-8"))
                response_text = body.get("response", "").strip()
                # Parse JSON
                parsed = json.loads(response_text)
                parsed["text"] = text
                parsed["engine"] = f"ollama ({model})"

                # Safety Firewall Guarantee: Hard red-flags MUST stay critical even if LLM missed
                nlp_check = clinical_nlp_analyze(text, lang)
                if nlp_check["emergency"]:
                    parsed["emergency"] = True
                    parsed["urgency"] = "critical"
                    for tag in nlp_check["auto_symptom_tags"]:
                        if tag not in parsed.get("auto_symptom_tags", []):
                            parsed.setdefault("auto_symptom_tags", []).append(tag)

                return parsed
    except Exception as err:
        logger.warning("Ollama call failed or timed out: %s; falling back to Clinical NLP", err)
        return None


# ---------------------------------------------------------------------------
# Master Entry Point
# ---------------------------------------------------------------------------

def analyze_patient_note(text: str, lang: str = "en") -> dict[str, Any]:
    """Analyze a patient note using Ollama if available, otherwise Clinical NLP."""
    clean = (text or "").strip()
    if not clean:
        return clinical_nlp_analyze("", lang)

    # Try Ollama first
    ollama_res = ollama_analyze_note(clean, lang)
    if ollama_res is not None:
        return ollama_res

    # Deterministic fallback
    return clinical_nlp_analyze(clean, lang)
