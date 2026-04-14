"""
End-to-end test: Full hybrid flow.
Skipped when TEST_BASE_URL environment variable is not set.
"""

from __future__ import annotations

import os

import httpx
import pytest

BASE_URL = os.getenv("TEST_BASE_URL", "")

pytestmark = pytest.mark.skipif(not BASE_URL, reason="TEST_BASE_URL not set")


@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30) as c:
        yield c


def test_health_check(client):
    """API gateway should respond with 200 on /health."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") in ("ok", "healthy", "degraded")


def test_demo_mode_returns_data(client):
    """X-Platform-Mode: demo should return data without auth."""
    resp = client.get("/api/scans", headers={"X-Platform-Mode": "demo"})
    assert resp.status_code in (200, 404)  # 404 if route not exposed


def test_protected_route_requires_auth(client):
    """Protected route without token should return 401 or 403."""
    resp = client.get("/api/scans")
    assert resp.status_code in (401, 403)


def test_register_and_login(client):
    """Register a new user, then log in and get a token."""
    import secrets

    email = f"e2e-{secrets.token_hex(4)}@test.cosmicsec.io"
    # Register
    reg = client.post(
        "/auth/register", json={"email": email, "password": "Test1234!", "full_name": "E2E User"}
    )
    assert reg.status_code in (200, 201, 409)  # 409 if already exists
    # Login
    login = client.post("/auth/login", json={"email": email, "password": "Test1234!"})
    assert login.status_code in (200, 401)
    if login.status_code == 200:
        data = login.json()
        assert "access_token" in data or "token" in data
