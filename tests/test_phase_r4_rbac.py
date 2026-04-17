"""Tests for Phase R.4 — Advanced RBAC engine and API endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from services.auth_service.rbac_engine import (
    can_user,
    check_permission,
    create_custom_role,
    delete_custom_role,
    list_roles,
)

# ---------------------------------------------------------------------------
# Unit tests for rbac_engine
# ---------------------------------------------------------------------------


def test_admin_wildcard_grants_all():
    assert check_permission("admin", "scan", "read") is True
    assert check_permission("admin", "scan", "delete") is True
    assert check_permission("admin", "compliance", "manage") is True


def test_viewer_read_only():
    assert check_permission("viewer", "scan", "read") is True
    assert check_permission("viewer", "scan", "write") is False
    assert check_permission("viewer", "finding", "read") is True
    assert check_permission("viewer", "finding", "delete") is False


def test_soc_analyst_permissions():
    assert check_permission("soc_analyst", "scan", "write") is True
    assert check_permission("soc_analyst", "recon", "write") is True
    assert check_permission("soc_analyst", "ai", "read") is True
    assert check_permission("soc_analyst", "member", "invite") is False


def test_auditor_read_only_extended():
    assert check_permission("auditor", "compliance", "read") is True
    assert check_permission("auditor", "audit_log", "read") is True
    assert check_permission("auditor", "scan", "write") is False


def test_pentester_permissions():
    assert check_permission("pentester", "scan", "execute") is True
    assert check_permission("pentester", "bugbounty", "submit") is True
    assert check_permission("pentester", "report", "write") is False


def test_unknown_role_grants_nothing():
    assert check_permission("nonexistent_role", "scan", "read") is False


def test_custom_role_create_and_check():
    create_custom_role(
        "test_custom_reader",
        description="Test only",
        permissions=[("scan", "read"), ("report", "read")],
        org_id="org-test-rbac",
    )
    assert (
        check_permission(
            "test_custom_reader",
            "scan",
            "read",
            custom_roles={
                "test_custom_reader": {
                    "permissions": [["scan", "read"], ["report", "read"]],
                    "inherits": [],
                }
            },
        )
        is True
    )


def test_custom_role_cannot_override_builtin():
    import pytest

    with pytest.raises(ValueError, match="built-in"):
        create_custom_role(
            "admin",
            description="Bad override",
            permissions=[("*", "*")],
        )


def test_list_roles_includes_builtin():
    roles = list_roles()
    names = {r["name"] for r in roles}
    assert "admin" in names
    assert "viewer" in names
    assert "auditor" in names
    assert "pentester" in names


def test_delete_custom_role():
    create_custom_role(
        "delete_me",
        description="Temp",
        permissions=[("scan", "read")],
        org_id="org-delete-test",
    )
    result = delete_custom_role("delete_me", org_id="org-delete-test")
    assert result is True

    # Second delete returns False
    result2 = delete_custom_role("delete_me", org_id="org-delete-test")
    assert result2 is False


def test_can_user_helper():
    result = can_user("admin", "scan", "delete")
    assert result["allowed"] is True
    assert result["reason"] == "permission_granted"

    result2 = can_user("viewer", "scan", "delete")
    assert result2["allowed"] is False
    assert result2["reason"] == "permission_denied"


# ---------------------------------------------------------------------------
# API endpoint tests for RBAC routes in auth service
# ---------------------------------------------------------------------------

from services.auth_service.main import app as auth_app

auth_client = TestClient(auth_app)


def test_auth_service_health():
    resp = auth_client.get("/health")
    assert resp.status_code == 200


def test_rbac_roles_requires_auth():
    resp = auth_client.get("/rbac/roles")
    assert resp.status_code in (401, 403)


def test_rbac_check_requires_auth():
    resp = auth_client.post(
        "/rbac/check",
        json={"role": "admin", "resource": "scan", "action": "read"},
    )
    assert resp.status_code in (401, 403)


def test_rbac_matrix_requires_auth():
    resp = auth_client.get("/rbac/matrix")
    assert resp.status_code in (401, 403)
