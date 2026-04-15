import secrets

from fastapi.testclient import TestClient

from services.auth_service.main import app

client = TestClient(app)


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
