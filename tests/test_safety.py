"""
Unit tests for backend/safety.py (Deterministic Clinical Safety Firewall).
"""

from backend.safety import check, EMERGENCY_MESSAGES


def test_safety_firewall_benign_symptoms():
    """Verify that non-emergency symptoms do not trigger red flags."""
    res = check(symptoms=["fatigue", "itching"], note="feeling slightly tired", lang="en")
    assert res["emergency"] is False
    assert res["message"] is None


def test_safety_firewall_english_keywords():
    """Verify emergency interception for English free-text keywords."""
    res = check(symptoms=[], note="Patient has severe chest pain and breathlessness", lang="en")
    assert res["emergency"] is True
    assert res["message"] == EMERGENCY_MESSAGES["en"]


def test_safety_firewall_structured_emergencies():
    """Verify emergency interception for structured symptom checkboxes."""
    res = check(symptoms=["breathless"], note="Normal day otherwise", lang="en")
    assert res["emergency"] is True
    assert "EMERGENCY" in res["message"]


def test_safety_firewall_tamil_localization():
    """Verify emergency detection and Tamil message delivery."""
    res = check(symptoms=[], note="நோயாளிக்கு கடுமையான நெஞ்சு வலி உள்ளது", lang="ta")
    assert res["emergency"] is True
    assert res["message"] == EMERGENCY_MESSAGES["ta"]


def test_safety_firewall_hindi_localization():
    """Verify emergency detection and Hindi message delivery."""
    res = check(symptoms=[], note="मुझे सांस फूलना और बेचैनी महसूस हो रही है", lang="hi")
    assert res["emergency"] is True
    assert res["message"] == EMERGENCY_MESSAGES["hi"]


def test_safety_firewall_empty_inputs():
    """Verify handling of None/empty inputs without raising exceptions."""
    res = check(symptoms=None, note=None, lang="en")
    assert res["emergency"] is False
    assert res["message"] is None
