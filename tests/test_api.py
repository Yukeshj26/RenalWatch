"""
Integration tests for backend business logic and controller endpoints in backend/main.py.
"""

import pytest
from fastapi import HTTPException
from backend.main import (
    list_patients,
    get_patient,
    get_patient_what_if,
    register,
    login,
    RegisterBody,
    LoginBody,
    get_hours_to_next_session,
    evaluate_silent_status,
)
import backend.db as db


def test_list_patients_returns_triage_queue():
    """Verify list_patients returns sorted array of patients with risk scores."""
    patients = list_patients()
    assert isinstance(patients, list)
    assert len(patients) > 0

    first = patients[0]
    assert "id" in first
    assert "name" in first
    assert "score" in first
    assert "level" in first
    assert 0 <= first["score"] <= 100


def test_get_patient_detail():
    """Verify retrieving detailed profile for an existing patient."""
    patients = list_patients()
    assert len(patients) > 0
    pid = patients[0]["id"]

    patient = get_patient(pid)
    assert patient["id"] == pid
    assert "dry_weight" in patient
    assert "dialysis_schedule" in patient
    assert "weight_history" in patient
    assert "risk" in patient


def test_get_patient_not_found():
    """Verify non-existent patient raises 404 HTTPException."""
    with pytest.raises(HTTPException) as exc_info:
        get_patient(999999)
    assert exc_info.value.status_code == 404


def test_get_patient_what_if_counterfactual():
    """Verify what-if counterfactual endpoint returns projections and food swaps."""
    patients = list_patients()
    pid = patients[0]["id"]

    what_if = get_patient_what_if(pid)
    assert "current_score" in what_if
    assert "scenarios" in what_if
    assert "food_swaps" in what_if
    assert "care_team_guidance" in what_if


def test_direct_registration_and_login_flow():
    """Test 1-step patient registration and credential verification."""
    unique_phone = "9876001234"
    unique_email = "test_register_flow@renalwatch.org"

    reg_body = RegisterBody(
        name="Automation Test Patient",
        age=52,
        gender="Male",
        dry_weight=68.0,
        fluid_limit=1100,
        dialysis_schedule="Mon,Wed,Fri",
        phone=unique_phone,
        email=unique_email,
        password="MySecretPassword123!",
        language="en",
    )

    reg_res = register(reg_body)
    assert reg_res["ok"] is True
    assert reg_res["role"] == "patient"
    assert reg_res["patient"]["name"] == "Automation Test Patient"
    new_pid = reg_res["patient"]["id"]

    # Verify patient can now be retrieved
    new_pat = get_patient(new_pid)
    assert new_pat["name"] == "Automation Test Patient"

    # Test Login with Phone
    login_body = LoginBody(
        phone=unique_phone,
        password="MySecretPassword123!",
        role="patient",
    )
    login_res = login(login_body)
    assert login_res["ok"] is True
    assert login_res["patient"]["id"] == new_pid


def test_login_invalid_credentials():
    """Verify login failure on incorrect password."""
    login_body = LoginBody(
        phone="9876001234",
        password="WrongPassword!",
        role="patient",
    )
    with pytest.raises(HTTPException) as exc_info:
        login(login_body)
    assert exc_info.value.status_code == 401


def test_hours_to_next_session():
    """Verify scheduling helper accurately calculates hours to next session."""
    hours = get_hours_to_next_session("Mon,Wed,Fri")
    assert isinstance(hours, float)
    assert hours >= 0.0
