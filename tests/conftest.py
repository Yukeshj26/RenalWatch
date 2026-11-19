"""
Test fixtures and configuration for RenalWatch test suite.
"""

import os
import pytest
from fastapi.testclient import TestClient

from backend.main import app
import backend.db as db


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Provide an isolated SQLite database for each test and seed it."""
    test_db_file = str(tmp_path / "test_renalwatch.db")
    monkeypatch.setenv("DATABASE_PATH", test_db_file)
    db.init()
    yield test_db_file


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)
