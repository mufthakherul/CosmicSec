"""Phase 2 — tests for the real-time collaboration service."""
from fastapi.testclient import TestClient

from services.collab_service.main import app

client = TestClient(app)


def test_collab_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "collab"


def test_collab_list_rooms_empty() -> None:
    response = client.get("/rooms")
    assert response.status_code == 200
    assert "rooms" in response.json()


def test_collab_post_and_get_messages() -> None:
    room_id = "test-room-1"
    # Post a message via REST
    response = client.post(
        f"/rooms/{room_id}/messages",
        json={"username": "alice", "text": "Hello @bob this is a test"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "sent"

    # Retrieve messages
    response = client.get(f"/rooms/{room_id}/messages")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["messages"][0]["username"] == "alice"
    assert "bob" in data["messages"][0]["mentions"]


def test_collab_presence() -> None:
    room_id = "test-room-presence"
    # Presence should report empty before any connection
    response = client.get(f"/rooms/{room_id}/presence")
    assert response.status_code == 200
    assert "present_users" in response.json()


def test_collab_scan_state_update() -> None:
    room_id = "test-room-scan"
    response = client.post(
        f"/rooms/{room_id}/scan-state",
        json={"status": "running", "progress": 42, "findings_count": 3, "updated_by": "eve"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"]["progress"] == 42
    assert data["state"]["status"] == "running"


def test_collab_activity_feed() -> None:
    response = client.get("/activity-feed")
    assert response.status_code == 200
    assert "feed" in response.json()
