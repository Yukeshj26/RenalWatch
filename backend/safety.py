"""
safety.py – Emergency / red-flag detection layer for RenalWatch.

All advisory text is hard-coded (no AI-generated advice). Supports English,
Tamil (ta) and Hindi (hi).
"""

from __future__ import annotations
from typing import Optional

# ---------------------------------------------------------------------------
# Red-flag keywords – emergency terms a patient might type in free-text notes
# ---------------------------------------------------------------------------
RED_FLAGS: list[str] = [
    # English
    "breathless", "breathlessness", "chest pain", "chest tightness",
    "severe weakness", "fainted", "fainting", "palpitation", "palpitations",
    "unconscious", "collapsed", "cannot breathe", "difficulty breathing",
    # Tamil
    "மூச்சுத்திணறல்",   # breathlessness
    "நெஞ்சு வலி",       # chest pain
    "மயக்கம்",           # fainting / unconscious
    "படபடப்பு",          # palpitation
    "கடுமையான சோர்வு",  # severe weakness
    # Hindi
    "सांस फूलना",        # breathlessness
    "छाती में दर्द",      # chest pain
    "बेहोश",             # unconscious / fainted
    "धड़कन",             # palpitation
    "गंभीर कमजोरी",     # severe weakness
]

# ---------------------------------------------------------------------------
# Structured symptom-checkbox values that are always emergencies
# ---------------------------------------------------------------------------
STRUCTURED_EMERGENCIES: set[str] = {
    "breathless",
    "chest_pain",
    "severe_weakness",
}

# ---------------------------------------------------------------------------
# Hard-coded emergency messages per language
# ---------------------------------------------------------------------------
EMERGENCY_MESSAGES: dict[str, str] = {
    "en": (
        "⚠️ EMERGENCY: One or more serious symptoms detected. "
        "Please contact your nephrologist or visit the nearest hospital "
        "immediately. Do NOT wait for your next scheduled session."
    ),
    "ta": (
        "⚠️ அவசரநிலை: தீவிர அறிகுறிகள் கண்டறியப்பட்டன. "
        "உடனடியாக உங்கள் சிறுநீரக மருத்துவரை தொடர்புகொள்ளுங்கள் "
        "அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லுங்கள்."
    ),
    "hi": (
        "⚠️ आपातकाल: गंभीर लक्षण पाए गए हैं। "
        "कृपया तुरंत अपने नेफ्रोलॉजिस्ट से संपर्क करें "
        "या निकटतम अस्पताल जाएँ। अगले सत्र का इंतज़ार न करें।"
    ),
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def check(
    symptoms: list[str] | None = None,
    note: str | None = None,
    lang: str = "en",
) -> dict:
    """Check symptoms and free-text note for emergency red flags.

    Returns:
        {
            "emergency": bool,
            "message": str | None   – localised advisory if emergency
        }
    """
    symptoms = symptoms or []
    note = (note or "").lower().strip()
    lang = lang if lang in EMERGENCY_MESSAGES else "en"

    # 1. Check structured symptom checkboxes
    if STRUCTURED_EMERGENCIES & set(symptoms):
        return {"emergency": True, "message": EMERGENCY_MESSAGES[lang]}

    # 2. Scan free-text note for red-flag keywords
    if note:
        for flag in RED_FLAGS:
            if flag.lower() in note:
                return {"emergency": True, "message": EMERGENCY_MESSAGES[lang]}

    return {"emergency": False, "message": None}
