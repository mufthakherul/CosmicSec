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
        json={"name": "TestOrg", "slug": f"testorg-{secrets.token_urlsafe(4)}", "owner_email": email, "plan": "team"},
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
