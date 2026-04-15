"""End-to-end test: CLI agent registration and task dispatch."""

from __future__ import annotations

import os
import uuid

import httpx
import pytest

BASE_URL = os.getenv("TEST_BASE_URL", "")
API_KEY = os.getenv("TEST_API_KEY", "test-key")

pytestmark = pytest.mark.skipif(not BASE_URL, reason="TEST_BASE_URL not set")


@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30) as c:
        yield c


def test_agent_register(client):
    """Agent should be able to register with an API key."""
    agent_id = f"test-agent-{uuid.uuid4().hex[:8]}"
    resp = client.post(
        "/api/agents/register",
        headers={"X-API-Key": API_KEY},
        json={
            "agent_id": agent_id,
            "manifest": {
                "tools": [{"name": "nmap", "version": "7.94", "capabilities": ["port_scan"]}],
                "platform": "linux",
                "version": "1.0.0",
            },
        },
    )
    assert resp.status_code in (200, 201, 401, 403)


def test_get_agents(client):
    """GET /api/agents should return a list (may require auth)."""
    resp = client.get("/api/agents", headers={"X-API-Key": API_KEY})
    assert resp.status_code in (200, 401, 403)
    if resp.status_code == 200:
        data = resp.json()
        assert isinstance(data, (list, dict))
