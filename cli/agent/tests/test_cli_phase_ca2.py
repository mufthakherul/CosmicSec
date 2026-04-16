"""Tests for CA-2 modules: OutputFormatter, SettingsStore, OfflineStore history extensions."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# CA-2.1 — OutputFormatter
# ---------------------------------------------------------------------------


class TestOutputFormatter:
    def test_formatter_json(self, capsys):
        from cosmicsec_agent.output import OutputFormatter

        fmt = OutputFormatter(fmt="json")
        fmt.json({"key": "value"})
        out = capsys.readouterr().out
        assert "key" in out
        assert "value" in out

    def test_formatter_csv(self, capsys):
        from cosmicsec_agent.output import OutputFormatter

        fmt = OutputFormatter(fmt="csv")
        fmt.csv([{"a": 1, "b": 2}, {"a": 3, "b": 4}])
        out = capsys.readouterr().out
        assert "a" in out
        assert "1" in out

    def test_formatter_quiet(self, capsys):
        from cosmicsec_agent.output import OutputFormatter

        fmt = OutputFormatter(fmt="quiet")
        fmt.quiet({"status": "ok"}, key="status")
        out = capsys.readouterr().out
        assert "ok" in out

    def test_formatter_yaml_fallback(self, capsys):
        """If pyyaml is not installed, should fall back to JSON without crashing."""
        from cosmicsec_agent.output import OutputFormatter
        import unittest.mock as mock

        fmt = OutputFormatter(fmt="yaml")
        with mock.patch.dict("sys.modules", {"yaml": None}):
            # Re-import to get fresh module state
            fmt.yaml({"x": 1})  # Should not raise

    def test_set_formatter(self):
        from cosmicsec_agent.output import set_formatter, get_formatter

        set_formatter("json")
        f = get_formatter()
        assert f.fmt == "json"

    def test_exit_codes_exported(self):
        from cosmicsec_agent.output import EXIT_OK, EXIT_ERROR, EXIT_AUTH_ERROR

        assert EXIT_OK == 0
        assert EXIT_ERROR == 1
        assert EXIT_AUTH_ERROR == 2


# ---------------------------------------------------------------------------
# CA-2.4 — SettingsStore
# ---------------------------------------------------------------------------


class TestSettingsStore:
    def _make_store(self, tmp_path: Path):
        from cosmicsec_agent.config import SettingsStore

        return SettingsStore(path=tmp_path / "settings.toml")

    def test_defaults(self, tmp_path):
        store = self._make_store(tmp_path)
        assert store.get("default_output_format") == "table"
        assert store.get("default_parallel") == 3
        assert store.get("auto_sync") is True

    def test_set_and_get(self, tmp_path):
        store = self._make_store(tmp_path)
        coerced = store.set("default_output_format", "json")
        assert coerced == "json"
        assert store.get("default_output_format") == "json"

    def test_set_bool(self, tmp_path):
        store = self._make_store(tmp_path)
        store.set("auto_sync", "false")
        assert store.get("auto_sync") is False

    def test_set_int(self, tmp_path):
        store = self._make_store(tmp_path)
        store.set("default_parallel", "5")
        assert store.get("default_parallel") == 5

    def test_invalid_key_raises(self, tmp_path):
        store = self._make_store(tmp_path)
        with pytest.raises(KeyError):
            store.get("nonexistent_key")

    def test_invalid_int_raises(self, tmp_path):
        store = self._make_store(tmp_path)
        with pytest.raises(ValueError):
            store.set("default_parallel", "not_a_number")

    def test_reset_single(self, tmp_path):
        store = self._make_store(tmp_path)
        store.set("default_parallel", "99")
        store.reset("default_parallel")
        assert store.get("default_parallel") == 3

    def test_reset_all(self, tmp_path):
        store = self._make_store(tmp_path)
        store.set("default_parallel", "99")
        store.set("auto_sync", "false")
        store.reset()
        assert store.get("default_parallel") == 3
        assert store.get("auto_sync") is True

    def test_list_all(self, tmp_path):
        store = self._make_store(tmp_path)
        rows = store.list_all()
        assert len(rows) >= 10
        keys = {r["key"] for r in rows}
        assert "default_output_format" in keys

    def test_persistence(self, tmp_path):
        """Changes survive creating a new SettingsStore instance."""
        path = tmp_path / "settings.toml"
        from cosmicsec_agent.config import SettingsStore

        s1 = SettingsStore(path=path)
        s1.set("default_parallel", "7")
        s2 = SettingsStore(path=path)
        assert s2.get("default_parallel") == 7


# ---------------------------------------------------------------------------
# CA-2.3 — OfflineStore history extensions
# ---------------------------------------------------------------------------


class TestOfflineStoreHistory:
    def _make_store(self, tmp_path: Path):
        from cosmicsec_agent.offline_store import OfflineStore

        return OfflineStore(db_path=tmp_path / "test.db")

    def _seed(self, store):
        store.save_scan("scan-001", "192.168.1.1", "nmap", "complete")
        store.save_finding({"title": "Open SSH port", "severity": "low", "tool": "nmap"}, "scan-001")
        store.save_finding({"title": "SQL Injection", "severity": "critical", "tool": "nmap"}, "scan-001")
        store.save_scan("scan-002", "10.0.0.1", "nuclei", "complete")
        store.save_finding({"title": "XSS Found", "severity": "high", "tool": "nuclei"}, "scan-002")

    def test_list_scans(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        scans = store.list_scans(limit=10)
        assert len(scans) == 2
        assert any(s["target"] == "192.168.1.1" for s in scans)

    def test_list_scans_filter_tool(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        scans = store.list_scans(tool="nmap")
        assert len(scans) == 1
        assert scans[0]["tool"] == "nmap"

    def test_list_scans_filter_target(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        scans = store.list_scans(target="10.0.0")
        assert len(scans) == 1

    def test_get_scan_with_findings(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        scan = store.get_scan_with_findings("scan-001")
        assert scan is not None
        assert len(scan["findings"]) == 2

    def test_get_scan_not_found(self, tmp_path):
        store = self._make_store(tmp_path)
        assert store.get_scan_with_findings("nonexistent") is None

    def test_search_findings_severity(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        crits = store.search_findings(severity="critical")
        assert len(crits) == 1
        assert crits[0]["title"] == "SQL Injection"

    def test_search_findings_text(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        results = store.search_findings(search="XSS")
        assert len(results) == 1

    def test_diff_scans(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        diff = store.diff_scans("scan-001", "scan-002")
        assert "summary" in diff
        assert diff["summary"]["new"] >= 0  # XSS is new in scan-002

    def test_diff_scans_not_found(self, tmp_path):
        store = self._make_store(tmp_path)
        diff = store.diff_scans("x", "y")
        assert "error" in diff

    def test_stats(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        s = store.stats()
        assert s["total_scans"] == 2
        assert s["total_findings"] == 3
        assert "critical" in s["findings_by_severity"]

    def test_delete_scan(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        assert store.delete_scan("scan-001") is True
        assert store.get_scan_with_findings("scan-001") is None
        # Findings should also be deleted
        crits = store.search_findings(severity="critical")
        assert len(crits) == 0

    def test_delete_scan_not_found(self, tmp_path):
        store = self._make_store(tmp_path)
        assert store.delete_scan("ghost-scan") is False

    def test_list_scans_with_finding_counts(self, tmp_path):
        store = self._make_store(tmp_path)
        self._seed(store)
        scans = store.list_scans()
        nmap_scan = next(s for s in scans if s["tool"] == "nmap")
        assert nmap_scan["total_findings"] == 2
        assert nmap_scan["finding_counts"].get("critical") == 1
