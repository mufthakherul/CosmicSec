"""
Tests for services/common/events.py — NATS event bus Python module.
"""
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def reset_nats_client():
    """Reset the cached NATS client between tests."""
    import services.common.events as ev_module

    ev_module._nats_client = None
    yield
    ev_module._nats_client = None


class TestPublishFallback:
    """When COSMICSEC_USE_NATS is false (default) all publishes are no-ops."""

    def test_use_nats_flag_defaults_false(self, monkeypatch):
        monkeypatch.delenv("COSMICSEC_USE_NATS", raising=False)
        import importlib

        import services.common.events as ev_module

        importlib.reload(ev_module)
        assert ev_module._USE_NATS is False

    @pytest.mark.asyncio
    async def test_publish_noop_when_disabled(self, monkeypatch):
        """publish() should not raise and should produce no side effects."""
        monkeypatch.setenv("COSMICSEC_USE_NATS", "false")
        import importlib

        import services.common.events as ev_module

        importlib.reload(ev_module)
        # Should complete without raising
        await ev_module.publish("test.subject", {"key": "value"})

    @pytest.mark.asyncio
    async def test_subscribe_returns_none_when_disabled(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_NATS", "false")
        import importlib

        import services.common.events as ev_module

        importlib.reload(ev_module)

        async def handler(subject, data):
            pass

        result = await ev_module.subscribe("test.subject", handler)
        assert result is None


class TestPublishWithNATSEnabled:
    """When NATS is enabled, publish delegates to the nats-py client."""

    @pytest.mark.asyncio
    async def test_publish_calls_nats_publish(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_NATS", "true")
        import importlib

        import services.common.events as ev_module

        importlib.reload(ev_module)

        mock_nc = AsyncMock()
        mock_nc.publish = AsyncMock()
        ev_module._nats_client = mock_nc

        await ev_module.publish("cosmicsec.scan.started", {"scan_id": "scan-1"})
        mock_nc.publish.assert_called_once()
        call_args = mock_nc.publish.call_args
        assert call_args[0][0] == "cosmicsec.scan.started"
        payload = json.loads(call_args[0][1])
        assert payload["scan_id"] == "scan-1"

    @pytest.mark.asyncio
    async def test_publish_survives_nats_error(self, monkeypatch):
        """Publish must not raise even when NATS client errors."""
        monkeypatch.setenv("COSMICSEC_USE_NATS", "true")
        import importlib

        import services.common.events as ev_module

        importlib.reload(ev_module)

        mock_nc = AsyncMock()
        mock_nc.publish = AsyncMock(side_effect=Exception("NATS unavailable"))
        ev_module._nats_client = mock_nc

        # Should not raise
        await ev_module.publish("cosmicsec.test", {"data": 1})


class TestSubjectConstants:
    """Verify that all expected subject constants are defined."""

    def test_scan_subjects_defined(self):
        from services.common.events import (
            SUBJECT_SCAN_COMPLETED,
            SUBJECT_SCAN_FAILED,
            SUBJECT_SCAN_STARTED,
        )

        assert SUBJECT_SCAN_STARTED == "cosmicsec.scan.started"
        assert SUBJECT_SCAN_COMPLETED == "cosmicsec.scan.completed"
        assert SUBJECT_SCAN_FAILED == "cosmicsec.scan.failed"

    def test_finding_subjects_defined(self):
        from services.common.events import (
            SUBJECT_FINDING_CREATED,
            SUBJECT_FINDING_CRITICAL,
        )

        assert "finding" in SUBJECT_FINDING_CREATED
        assert "finding" in SUBJECT_FINDING_CRITICAL

    def test_alert_subject_defined(self):
        from services.common.events import SUBJECT_ALERT_TRIGGERED

        assert "alert" in SUBJECT_ALERT_TRIGGERED


class TestCloseFunction:
    """close() should drain the NATS client when one is cached."""

    @pytest.mark.asyncio
    async def test_close_drains_client(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_NATS", "true")
        import importlib

        import services.common.events as ev_module

        importlib.reload(ev_module)

        mock_nc = AsyncMock()
        mock_nc.drain = AsyncMock()
        ev_module._nats_client = mock_nc

        await ev_module.close()
        mock_nc.drain.assert_called_once()
        assert ev_module._nats_client is None

    @pytest.mark.asyncio
    async def test_close_noop_when_no_client(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_NATS", "false")
        import importlib

        import services.common.events as ev_module

        importlib.reload(ev_module)
        ev_module._nats_client = None

        # Should not raise
        await ev_module.close()
