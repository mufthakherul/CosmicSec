"""Tests for Phase R.5 — White-label middleware and branding endpoints."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.api_gateway.white_label import (
    WhiteLabelMiddleware,
    get_branding,
    mount_branding_routes,
    to_css_variables,
    update_branding,
)

# ---------------------------------------------------------------------------
# Unit tests for branding helpers
# ---------------------------------------------------------------------------


def test_default_branding_present():
    branding = get_branding("default")
    assert "primary_color" in branding
    assert branding["name"] == "CosmicSec"


def test_update_and_retrieve_branding():
    update_branding("test-org", {"name": "TestCorp", "primary_color": "#ff0000"})
    branding = get_branding("test-org")
    assert branding["name"] == "TestCorp"
    assert branding["primary_color"] == "#ff0000"


def test_update_branding_merges_with_defaults():
    update_branding("merge-org", {"primary_color": "#00ff00"})
    branding = get_branding("merge-org")
    assert branding["primary_color"] == "#00ff00"
    assert "accent_color" in branding  # from defaults


def test_unknown_slug_falls_back_to_default():
    branding = get_branding("completely-unknown-org-xyz")
    assert branding["name"] == "CosmicSec"


def test_css_variables_generation():
    css = to_css_variables({"primary_color": "#6366f1", "accent_color": "#06b6d4"})
    assert ":root {" in css
    assert "--color-primary: #6366f1;" in css
    assert "--color-accent: #06b6d4;" in css
    assert "}" in css


def test_css_variables_partial_branding():
    css = to_css_variables({"primary_color": "#abc123"})
    assert "--color-primary: #abc123;" in css
    # No accent line when not provided
    assert "--color-accent" not in css


# ---------------------------------------------------------------------------
# Integration: branding endpoint and middleware header injection
# ---------------------------------------------------------------------------

# Create a minimal test app with the middleware and routes
_test_app = FastAPI()
_test_app.add_middleware(WhiteLabelMiddleware)
mount_branding_routes(_test_app)


@_test_app.get("/ping")
async def ping():
    return {"pong": True}


_client = TestClient(_test_app)


def test_branding_endpoint_default():
    resp = _client.get("/api/branding/default")
    assert resp.status_code == 200
    data = resp.json()
    assert data["org_slug"] == "default"
    assert "branding" in data
    assert "css_variables" in data
    assert ":root {" in data["css_variables"]
    assert "theme" in data


def test_branding_endpoint_unknown_falls_back():
    resp = _client.get("/api/branding/unknown-org-abc")
    assert resp.status_code == 200
    data = resp.json()
    assert data["org_slug"] == "unknown-org-abc"
    # Should still return valid branding (defaults)
    assert data["branding"]["name"] == "CosmicSec"


def test_middleware_injects_branding_headers():
    resp = _client.get("/ping", headers={"X-Org-Slug": "default"})
    assert resp.status_code == 200
    assert "X-Org-Name" in resp.headers
    assert "X-Primary-Color" in resp.headers
    assert "X-Logo-URL" in resp.headers


def test_middleware_works_without_org_header():
    resp = _client.get("/ping")
    assert resp.status_code == 200
    assert resp.headers.get("X-Org-Name") == "CosmicSec"


def test_put_branding_updates_store():
    resp = _client.put(
        "/api/branding/my-brand-org",
        json={"name": "BrandedCorp", "primary_color": "#abcdef"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["branding"]["name"] == "BrandedCorp"

    # Verify GET now returns updated data
    get_resp = _client.get("/api/branding/my-brand-org")
    assert get_resp.json()["branding"]["name"] == "BrandedCorp"
