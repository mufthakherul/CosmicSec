import secrets

from fastapi.testclient import TestClient

from services.auth_service.main import app

client = TestClient(app)


def _unique_email() -> str:
    return f"testuser+{secrets.token_urlsafe(6)}@example.com"


def _register(email: str, password: str = "StrongPass123!", role: str = "user") -> dict:
    resp = client.post(
        "/register",
        json={"email": email, "password": password, "full_name": "Test User", "role": role},
    )
    return resp.json()


def _login(email: str, password: str = "StrongPass123!") -> dict:
    resp = client.post("/login", json={"email": email, "password": password})
    return resp.json()


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_verify_endpoint_with_invalid_token() -> None:
    response = client.get("/verify", params={"token": "invalid-token"})
    assert response.status_code == 200
    assert response.json()["valid"] is False


def test_org_creation_and_retention_update() -> None:
    email = f"admin+{secrets.token_urlsafe(4)}@example.com"
    password = "StrongPass123!"

    # Register and login
    client.post(
        "/register",
        json={"email": email, "password": password, "full_name": "Admin User", "role": "admin"},
    )

    login_resp = client.post(
        "/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Create organization
    org_resp = client.post(
        "/orgs",
        headers=headers,
        json={
            "name": "TestOrg",
            "slug": f"testorg-{secrets.token_urlsafe(4)}",
            "owner_email": email,
            "plan": "team",
        },
    )
    assert org_resp.status_code == 201
    org_id = org_resp.json()["org_id"]

    # Update retention policy for org
    retention_resp = client.post(
        f"/orgs/{org_id}/retention",
        headers=headers,
        json={"days": 7},
    )
    assert retention_resp.status_code == 200
    assert retention_resp.json()["retention_days"] == 7

    # Fetch retention policy
    get_retention = client.get(f"/orgs/{org_id}/retention", headers=headers)
    assert get_retention.status_code == 200
    assert get_retention.json()["retention_days"] == 7

    # Billing customer
    customer_resp = client.post(
        f"/orgs/{org_id}/billing/customer",
        headers=headers,
        json={"billing_email": email, "provider": "stripe"},
    )
    assert customer_resp.status_code == 200
    assert customer_resp.json()["customer"]["provider"] == "stripe"

    # Subscription and invoicing
    sub_resp = client.post(
        f"/orgs/{org_id}/billing/subscription",
        headers=headers,
        json={"plan": "enterprise", "status": "active"},
    )
    assert sub_resp.status_code == 200
    assert sub_resp.json()["subscription"]["plan"] == "enterprise"

    invoice_resp = client.post(
        f"/orgs/{org_id}/billing/invoices",
        headers=headers,
        json={"amount_cents": 25000, "currency": "usd", "description": "Quarterly platform usage"},
    )
    assert invoice_resp.status_code == 200
    assert invoice_resp.json()["invoice"]["amount_cents"] == 25000

    billing_state = client.get(f"/orgs/{org_id}/billing", headers=headers)
    assert billing_state.status_code == 200
    assert billing_state.json()["billing"]["subscription"]["plan"] == "enterprise"

    # Security enhancements
    secret_resp = client.post(
        f"/orgs/{org_id}/security/secrets",
        headers=headers,
        json={"name": "db_password", "value": "s3cret", "engine": "vault"},
    )
    assert secret_resp.status_code == 200
    assert secret_resp.json()["stored"] is True

    encrypt_resp = client.post(
        f"/orgs/{org_id}/security/field-encryption/encrypt",
        headers=headers,
        json={"value": "pii@example.com"},
    )
    assert encrypt_resp.status_code == 200
    encrypted = encrypt_resp.json()["encrypted_value"]

    decrypt_resp = client.post(
        f"/orgs/{org_id}/security/field-encryption/decrypt",
        headers=headers,
        json={"value": encrypted},
    )
    assert decrypt_resp.status_code == 200
    assert decrypt_resp.json()["decrypted_value"] == "pii@example.com"

    policy_resp = client.get(f"/orgs/{org_id}/security/policies", headers=headers)
    assert policy_resp.status_code == 200
    assert len(policy_resp.json()["policies"]) >= 3

    scan_resp = client.post(
        f"/orgs/{org_id}/security/scan",
        headers=headers,
        json={"target": "org-assets", "controls": ["mfa", "rbac"]},
    )
    assert scan_resp.status_code == 200
    assert scan_resp.json()["summary"]["failed"] == 0

    residency_set = client.post(
        f"/orgs/{org_id}/compliance/data-residency",
        headers=headers,
        json={"region": "eu-central-1", "storage_class": "encrypted"},
    )
    assert residency_set.status_code == 200
    assert residency_set.json()["data_residency"]["region"] == "eu-central-1"

    residency_get = client.get(f"/orgs/{org_id}/compliance/data-residency", headers=headers)
    assert residency_get.status_code == 200
    assert residency_get.json()["data_residency"]["storage_class"] == "encrypted"


# ---------------------------------------------------------------------------
# Phase O: expanded auth service tests
# ---------------------------------------------------------------------------


def test_register_new_user() -> None:
    email = _unique_email()
    resp = client.post(
        "/register",
        json={"email": email, "password": "StrongPass123!", "full_name": "Alice", "role": "user"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == email
    assert "user_id" in body


def test_register_duplicate_email_rejected() -> None:
    email = _unique_email()
    _register(email)
    dup = client.post(
        "/register",
        json={"email": email, "password": "StrongPass123!", "full_name": "Alice", "role": "user"},
    )
    assert dup.status_code == 400
    assert "already" in dup.json()["detail"].lower()


def test_login_returns_tokens() -> None:
    email = _unique_email()
    _register(email)
    resp = client.post("/login", json={"email": email, "password": "StrongPass123!"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password_returns_401() -> None:
    email = _unique_email()
    _register(email)
    resp = client.post("/login", json={"email": email, "password": "WrongPassword!"})
    assert resp.status_code == 401


def test_login_nonexistent_user_returns_401() -> None:
    resp = client.post("/login", json={"email": "nobody@test.example.com", "password": "Pass123!"})
    assert resp.status_code == 401


def test_verify_valid_token() -> None:
    email = _unique_email()
    _register(email)
    token = _login(email)["access_token"]
    resp = client.get("/verify", params={"token": token})
    assert resp.status_code == 200
    assert resp.json()["valid"] is True
    assert resp.json()["email"] == email


def test_me_endpoint_requires_auth() -> None:
    resp = client.get("/me")
    assert resp.status_code in (401, 422)


def test_me_endpoint_returns_user_info() -> None:
    email = _unique_email()
    _register(email)
    token = _login(email)["access_token"]
    resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == email


def test_logout_returns_success() -> None:
    email = _unique_email()
    _register(email)
    token = _login(email)["access_token"]
    resp = client.post("/logout", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "logged out" in resp.json()["message"].lower()


def test_refresh_token_returns_new_access_token() -> None:
    email = _unique_email()
    _register(email)
    login_data = _login(email)
    refresh_token = login_data["refresh_token"]
    resp = client.post("/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_refresh_invalid_token_returns_401() -> None:
    resp = client.post("/refresh", json={"refresh_token": "not-a-valid-jwt"})
    assert resp.status_code == 401


def test_oauth_start_google() -> None:
    resp = client.post("/oauth2/google")
    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "google"
    assert "authorize_url" in body
    assert "accounts.google.com" in body["authorize_url"]


def test_oauth_start_github() -> None:
    resp = client.post("/oauth2/github")
    assert resp.status_code == 200
    assert resp.json()["provider"] == "github"


def test_oauth_start_invalid_provider() -> None:
    resp = client.post("/oauth2/unknown_provider")
    assert resp.status_code == 400


def test_org_sso_discovery_by_slug() -> None:
    email = f"admin+{secrets.token_urlsafe(4)}@example.com"
    password = "StrongPass123!"
    slug = f"acme-{secrets.token_urlsafe(3).lower()}"

    client.post(
        "/register",
        json={"email": email, "password": password, "full_name": "Org Admin", "role": "admin"},
    )
    login_resp = client.post("/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_org_resp = client.post(
        "/orgs",
        headers=headers,
        json={"name": "Acme Security", "slug": slug, "owner_email": email, "plan": "enterprise"},
    )
    assert create_org_resp.status_code == 201

    configure_sso_resp = client.post(
        f"/orgs/{create_org_resp.json()['org_id']}/sso",
        headers=headers,
        json={"provider": "microsoft", "enabled": True, "client_id": "ms-client-test"},
    )
    assert configure_sso_resp.status_code == 200

    discovery_resp = client.get(f"/orgs/slug/{slug}/sso")
    assert discovery_resp.status_code == 200
    payload = discovery_resp.json()
    assert payload["organization_slug"] == slug
    assert payload["provider"] == "microsoft"
    assert "authorization_url" in payload


def test_gdpr_export_returns_user_data() -> None:
    email = _unique_email()
    _register(email)
    resp = client.get("/gdpr/export", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "user" in body
    assert body["user"]["email"] == email


def test_gdpr_export_unknown_email_returns_404() -> None:
    resp = client.get("/gdpr/export", params={"email": "ghost@test.example.com"})
    assert resp.status_code == 404


def test_gdpr_delete_removes_user() -> None:
    email = _unique_email()
    _register(email)
    del_resp = client.delete("/gdpr/delete", params={"email": email})
    assert del_resp.status_code == 200
    # After deletion, login should fail
    login_resp = client.post("/login", json={"email": email, "password": "StrongPass123!"})
    assert login_resp.status_code == 401
