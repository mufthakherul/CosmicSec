"""Tests for the notification service channels and config lifecycle."""

from __future__ import annotations

import httpx
from fastapi.testclient import TestClient

from services.notification_service import main as notification_service_main

client = TestClient(notification_service_main.app)


def _reset_state() -> None:
    notification_service_main._configs = []
    notification_service_main._metrics["notifications_sent_total"] = 0
    notification_service_main._metrics["notification_errors_total"] = 0
    notification_service_main._metrics["notification_configs_total"] = 0


def setup_function() -> None:
    _reset_state()


def test_notification_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "notification"


def test_create_and_list_notification_config() -> None:
    payload = {
        "channel": "webhook",
        "name": "ops-webhook",
        "config": {"url": "https://example.org/webhook"},
    }
    created = client.post("/notify/config", json=payload)
    assert created.status_code == 200
    config_id = created.json()["id"]

    listed = client.get("/notify/configs")
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) == 1
    assert body[0]["id"] == config_id
    assert body[0]["channel"] == "webhook"


def test_delete_notification_config() -> None:
    created = client.post(
        "/notify/config",
        json={
            "channel": "webhook",
            "name": "delete-me",
            "config": {"url": "https://example.org/hook"},
        },
    )
    config_id = created.json()["id"]

    deleted = client.delete(f"/notify/configs/{config_id}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] == config_id
    assert client.get("/notify/configs").json() == []


def test_delete_unknown_config_returns_404() -> None:
    response = client.delete("/notify/configs/does-not-exist")
    assert response.status_code == 404


def test_send_notification_filters_channels(monkeypatch) -> None:
    calls: list[dict] = []

    def fake_request(
        method: str, url: str, json: dict, headers: dict | None = None, timeout: int = 10
    ) -> object:
        calls.append(
            {"method": method, "url": url, "json": json, "headers": headers or {}, "timeout": timeout}
        )
        return object()

    monkeypatch.setattr("services.notification_service.main.httpx.request", fake_request)
    client.post(
        "/notify/config",
        json={"channel": "webhook", "name": "w", "config": {"url": "https://example.org/webhook"}},
    )
    client.post(
        "/notify/config",
        json={
            "channel": "slack",
            "name": "s",
            "config": {"webhook_url": "https://example.org/slack"},
        },
    )

    response = client.post(
        "/notify/send",
        json={
            "event_type": "scan_completed",
            "payload": {"scan_id": "a1"},
            "channels": ["webhook"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 1
    assert len(calls) == 1
    assert calls[0]["method"] == "POST"
    assert calls[0]["url"] == "https://example.org/webhook"


def test_send_notification_records_delivery_error(monkeypatch) -> None:
    def fake_post(url: str, json: dict, timeout: int) -> object:
        raise httpx.HTTPError("delivery failed")

    monkeypatch.setattr("services.notification_service.main.httpx.post", fake_post)
    created = client.post(
        "/notify/config",
        json={
            "channel": "slack",
            "name": "fail",
            "config": {"webhook_url": "https://example.org/slack"},
        },
    )
    config_id = created.json()["id"]

    response = client.post(
        "/notify/send",
        json={"event_type": "alert", "payload": {"severity": "high"}, "channels": ["slack"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 0
    assert data["errors"] == [
        {"id": config_id, "channel": "slack", "error": "delivery failed"}
    ]


def test_test_notification_success_for_webhook(monkeypatch) -> None:
    def fake_post(url: str, json: dict, timeout: int) -> object:
        return object()

    monkeypatch.setattr("services.notification_service.main.httpx.post", fake_post)
    created = client.post(
        "/notify/config",
        json={
            "channel": "webhook",
            "name": "test",
            "config": {"url": "https://example.org/webhook"},
        },
    )
    config_id = created.json()["id"]

    response = client.post("/notify/test", json={"config_id": config_id, "message": "ping"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["config_id"] == config_id


def test_test_notification_unknown_config_returns_404() -> None:
    response = client.post("/notify/test", json={"config_id": "missing", "message": "ping"})
    assert response.status_code == 404


def test_metrics_endpoint_reflects_counters(monkeypatch) -> None:
    def fake_post(url: str, json: dict, timeout: int) -> object:
        return object()

    monkeypatch.setattr("services.notification_service.main.httpx.post", fake_post)
    client.post(
        "/notify/config",
        json={
            "channel": "webhook",
            "name": "metric",
            "config": {"url": "https://example.org/webhook"},
        },
    )
    client.post(
        "/notify/send",
        json={"event_type": "scan_done", "payload": {"id": "1"}, "channels": ["webhook"]},
    )

    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    text = metrics.text
    assert "notifications_sent_total 1" in text
    assert "notification_errors_total 0" in text
    assert "notification_configs_total 1" in text
