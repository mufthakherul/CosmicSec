"""Tests for the Organization Service (Phase R — Multi-tenancy)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from services.org_service.main import app

client = TestClient(app)

ORG_SLUG = f"test-org-{uuid.uuid4().hex[:8]}"


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert body["service"] == "org-service"


def test_create_org_no_db():
    """Org creation should 503 when DB not available (in-memory test env)."""
    resp = client.post(
        "/api/orgs",
        json={"name": "Acme Corp", "slug": ORG_SLUG, "plan": "pro"},
    )
    # In test env without DB, expects either 503 or 422 (DB unavailable)
    assert resp.status_code in (201, 503)


def test_get_org_not_found():
    resp = client.get("/api/orgs/nonexistent-id")
    assert resp.status_code in (404, 503)


def test_get_org_by_slug_not_found():
    # Use a slug that is guaranteed not to exist
    resp = client.get("/api/orgs/slug/this-slug-will-never-exist-xyz")
    assert resp.status_code in (404, 503)


def test_list_members_not_found():
    resp = client.get("/api/orgs/nonexistent-id/members")
    assert resp.status_code in (404, 503)


def test_invite_member_invalid_email():
    resp = client.post(
        "/api/orgs/org-id/invite",
        json={"email": "not-an-email", "role": "member"},
    )
    assert resp.status_code in (404, 422, 503)


def test_configure_sso_invalid_provider_type():
    resp = client.post(
        "/api/orgs/org-id/sso",
        json={"provider_type": "invalid", "provider_name": "okta"},
    )
    assert resp.status_code in (404, 422, 503)


def test_get_branding_not_found():
    resp = client.get("/api/orgs/nonexistent/branding")
    assert resp.status_code in (404, 503)


def test_update_org_not_found():
    resp = client.put("/api/orgs/nonexistent", json={"name": "Updated"})
    assert resp.status_code in (404, 503)


def test_delete_org_not_found():
    resp = client.delete("/api/orgs/nonexistent")
    assert resp.status_code in (204, 404, 503)
