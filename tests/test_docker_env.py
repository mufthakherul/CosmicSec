from pathlib import Path


def test_compose_file_exists() -> None:
    compose = Path("docker-compose.yml")
    assert compose.exists(), "docker-compose.yml must exist"


def test_required_services_defined() -> None:
    content = Path("docker-compose.yml").read_text(encoding="utf-8")
    for service in ["api-gateway", "auth-service", "scan-service", "ai-service", "recon-service", "report-service"]:
        assert service in content
