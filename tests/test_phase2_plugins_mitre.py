"""Phase 2 — tests for the plugin SDK (PluginBase, PluginLoader, mitre_attack)."""
import pytest

from plugins.sdk.base import PluginBase, PluginContext, PluginMetadata, PluginResult
from plugins.sdk.loader import PluginLoader, PluginValidationError
from services.ai_service.mitre_attack import map_to_attack, map_multiple


# ---------------------------------------------------------------------------
# Plugin SDK tests
# ---------------------------------------------------------------------------

class _GoodPlugin(PluginBase):
    def metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="good_plugin",
            version="0.1.0",
            description="A test plugin",
            author="test",
            tags=["test"],
        )

    def run(self, context: PluginContext) -> PluginResult:
        return PluginResult(
            success=True,
            data={"target": context.target},
            findings=[{"title": "Test finding", "severity": "info"}],
        )


class _BadPlugin:
    """Intentionally does NOT subclass PluginBase."""
    pass


def test_plugin_base_metadata() -> None:
    plugin = _GoodPlugin()
    meta = plugin.metadata()
    assert meta.name == "good_plugin"
    assert meta.version == "0.1.0"


def test_plugin_base_run() -> None:
    plugin = _GoodPlugin()
    ctx = PluginContext(target="example.com")
    result = plugin.run(ctx)
    assert result.success is True
    assert result.data["target"] == "example.com"
    assert len(result.findings) == 1


def test_plugin_loader_register_and_run() -> None:
    loader = PluginLoader()
    name = loader.register(_GoodPlugin)
    assert name == "good_plugin"

    ctx = PluginContext(target="test.local", scan_id="scan-001", user="admin")
    result = loader.run("good_plugin", ctx)
    assert result.success is True


def test_plugin_loader_missing_plugin() -> None:
    loader = PluginLoader()
    result = loader.run("nonexistent", PluginContext(target="x"))
    assert result.success is False
    assert "not found" in result.errors[0]


def test_plugin_loader_disable_enable() -> None:
    loader = PluginLoader()
    loader.register(_GoodPlugin)
    assert loader.disable("good_plugin") is True
    result = loader.run("good_plugin", PluginContext(target="x"))
    assert result.success is False
    assert loader.enable("good_plugin") is True
    result = loader.run("good_plugin", PluginContext(target="x"))
    assert result.success is True


def test_plugin_loader_list_plugins() -> None:
    loader = PluginLoader()
    loader.register(_GoodPlugin)
    plugins = loader.list_plugins()
    assert any(p["name"] == "good_plugin" for p in plugins)


def test_plugin_validation_error_non_base() -> None:
    loader = PluginLoader()
    with pytest.raises((PluginValidationError, TypeError, AttributeError)):
        loader.register(_BadPlugin)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# MITRE ATT&CK correlation tests
# ---------------------------------------------------------------------------

def test_mitre_sql_injection() -> None:
    result = map_to_attack("SQL injection found in login endpoint")
    assert result["technique_id"] == "T1190"
    assert "sql" in result["technique_name"].lower() or "exploit" in result["technique_name"].lower()


def test_mitre_ssrf() -> None:
    result = map_to_attack("SSRF via webhook URL parameter")
    assert "T1090" in result["technique_id"] or "ssrf" in result["technique_name"].lower() or "proxy" in result["technique_name"].lower()


def test_mitre_brute_force() -> None:
    result = map_to_attack("Brute force attack on admin login")
    assert result["technique_id"] == "T1110"


def test_mitre_unknown() -> None:
    result = map_to_attack("some very obscure custom finding xyz123")
    assert result["technique_id"] == "T0000"


def test_mitre_map_multiple() -> None:
    findings = ["SQL Injection", "Brute Force", "Open Redirect"]
    results = map_multiple(findings)
    assert len(results) == 3
    for r in results:
        assert "finding" in r
        assert "technique_id" in r
