from fastapi.testclient import TestClient

from plugins.registry import app


client = TestClient(app)


def test_official_plugins_are_registered() -> None:
    response = client.get("/plugins")
    assert response.status_code == 200
    names = {plugin["name"] for plugin in response.json()["plugins"]}
    assert "official-nmap" in names
    assert "official-metasploit-bridge" in names
    assert "official-jira" in names
    assert "official-slack" in names
    assert "official-report-template" in names
