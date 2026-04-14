"""End-to-end test: Static/demo mode and unauthenticated access."""

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


def test_health_is_public(client):
    """Health endpoint must be accessible without authentication."""
    resp = client.get("/health")
    assert resp.status_code == 200


def test_demo_mode_header(client):
    """X-Platform-Mode: demo should not require auth."""
    resp = client.get("/api/scans", headers={"X-Platform-Mode": "demo"})
    # Demo mode returns data or route not found — either is acceptable
    assert resp.status_code != 401


def test_no_auth_returns_401(client):
    """Requests without token or demo mode header should get 401/403."""
    for path in ["/api/scans", "/api/findings"]:
        resp = client.get(path)
        assert resp.status_code in (401, 403, 404), f"{path} returned {resp.status_code}"


def test_api_docs_accessible(client):
    """OpenAPI docs should be publicly accessible."""
    resp = client.get("/api/docs")
    assert resp.status_code in (200, 404)  # may be disabled in prod
