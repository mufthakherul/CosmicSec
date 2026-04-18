from fastapi.testclient import TestClient

from services.egress_service.main import app

client = TestClient(app)


def test_egress_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"


def test_onion_strategy_rejected_without_tor() -> None:
    response = client.post(
        "/strategy/resolve",
        json={"target_url": "http://exampleonion1234567890.onion"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "rejected"


def test_strategy_ok_without_proxy() -> None:
    response = client.post(
        "/strategy/resolve",
        json={"target_url": "https://example.com", "client_profile": "desktop_firefox"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["strategy"]["profile"] == "desktop_firefox"


def test_auto_mode_enables_tor_for_onion(monkeypatch) -> None:
    monkeypatch.setenv("COSMICSEC_GLOBAL_TOR_PROXY_URL", "socks5://tor-proxy:9050")
    response = client.post(
        "/strategy/resolve",
        json={"target_url": "http://exampleonion1234567890.onion", "tor_mode": "auto"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["strategy"]["tor_enabled"] is True


def test_auto_mode_keeps_tor_off_for_non_onion(monkeypatch) -> None:
    monkeypatch.setenv("COSMICSEC_GLOBAL_TOR_PROXY_URL", "socks5://tor-proxy:9050")
    response = client.post(
        "/strategy/resolve",
        json={"target_url": "https://example.com", "tor_mode": "auto"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["strategy"]["tor_enabled"] is False
