"""
Tests for services/api_gateway/ingest_bridge.py — Rust ingest engine bridge.
"""

from unittest.mock import AsyncMock, patch

import pytest


class TestIngestBridgeFallback:
    """When COSMICSEC_USE_RUST_INGEST is false all calls fall through to Python."""

    @pytest.mark.asyncio
    async def test_returns_python_fallback_when_flag_disabled(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_RUST_INGEST", "false")
        import importlib

        import services.api_gateway.ingest_bridge as bridge

        importlib.reload(bridge)

        result = await bridge.ingest_batch(
            tool="nmap",
            raw_data=b"<xml/>",
            scan_id="scan-001",
        )
        assert result["routed_to"] == "python_fallback"
        assert isinstance(result["findings"], list)

    @pytest.mark.asyncio
    async def test_returns_python_fallback_when_engine_unhealthy(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_RUST_INGEST", "true")
        import importlib

        import services.api_gateway.ingest_bridge as bridge

        importlib.reload(bridge)

        with patch.object(bridge, "check_rust_ingest_health", new=AsyncMock(return_value=False)):
            result = await bridge.ingest_batch(
                tool="nuclei",
                raw_data=b'{"template":"sqli"}',
                scan_id="scan-002",
            )
        assert result["routed_to"] == "python_fallback"


class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_health_check_returns_false_when_unreachable(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_RUST_INGEST", "true")
        import importlib

        import services.api_gateway.ingest_bridge as bridge

        importlib.reload(bridge)

        # Override health URL to something definitely unreachable
        bridge._INGEST_HEALTH_URL = "http://127.0.0.1:19999/health"

        healthy = await bridge.check_rust_ingest_health()
        assert healthy is False

    @pytest.mark.asyncio
    async def test_health_check_returns_true_on_200(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_RUST_INGEST", "true")
        import importlib

        import services.api_gateway.ingest_bridge as bridge

        importlib.reload(bridge)

        mock_response = AsyncMock()
        mock_response.status_code = 200

        with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_response)):
            healthy = await bridge.check_rust_ingest_health()
        assert healthy is True


class TestFeatureFlagValues:
    @pytest.mark.parametrize(
        "flag_value,expected",
        [
            ("true", True),
            ("1", True),
            ("yes", True),
            ("false", False),
            ("0", False),
            ("no", False),
        ],
    )
    def test_flag_parsing(self, monkeypatch, flag_value, expected):
        monkeypatch.setenv("COSMICSEC_USE_RUST_INGEST", flag_value)
        import importlib

        import services.api_gateway.ingest_bridge as bridge

        importlib.reload(bridge)
        assert bridge._USE_RUST_INGEST is expected


class TestGrpcRouting:
    @pytest.mark.asyncio
    async def test_routes_to_rust_with_generated_stub(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_RUST_INGEST", "true")
        import importlib

        import services.api_gateway.ingest_bridge as bridge

        importlib.reload(bridge)

        class FakePb2:
            TOOL_UNKNOWN = 0
            TOOL_NMAP = 1

            @staticmethod
            def IngestRequest(**kwargs):
                return type("Req", (), kwargs)

        class FakeStub:
            last_request = None

            def IngestBatch(self, request, timeout=30):
                self.last_request = request
                return type(
                    "Resp",
                    (),
                    {
                        "job_id": "job-123",
                        "scan_id": request.scan_id,
                        "findings_parsed": 5,
                        "findings_inserted": 5,
                        "parse_errors": 0,
                        "duration_ms": 12.5,
                        "error_messages": [],
                    },
                )

        fake_stub = FakeStub()
        with (
            patch.object(bridge, "check_rust_ingest_health", new=AsyncMock(return_value=True)),
            patch.object(bridge, "_get_grpc_stub", return_value=(fake_stub, FakePb2)),
        ):
            result = await bridge.ingest_batch("nmap", b"<xml/>", "scan-abc")

        assert result["routed_to"] == "rust"
        assert result["stats"]["findings_parsed"] == 5
        assert fake_stub.last_request.tool == FakePb2.TOOL_NMAP

    @pytest.mark.asyncio
    async def test_unknown_tool_maps_to_unknown_enum(self, monkeypatch):
        monkeypatch.setenv("COSMICSEC_USE_RUST_INGEST", "true")
        import importlib

        import services.api_gateway.ingest_bridge as bridge

        importlib.reload(bridge)

        class FakePb2:
            TOOL_UNKNOWN = 0

            @staticmethod
            def IngestRequest(**kwargs):
                return type("Req", (), kwargs)

        class FakeStub:
            last_request = None

            def IngestBatch(self, request, timeout=30):
                self.last_request = request
                return type(
                    "Resp",
                    (),
                    {
                        "job_id": "job-123",
                        "scan_id": request.scan_id,
                        "findings_parsed": 0,
                        "findings_inserted": 0,
                        "parse_errors": 1,
                        "duration_ms": 2.0,
                        "error_messages": ["unsupported tool"],
                    },
                )

        fake_stub = FakeStub()
        with (
            patch.object(bridge, "check_rust_ingest_health", new=AsyncMock(return_value=True)),
            patch.object(bridge, "_get_grpc_stub", return_value=(fake_stub, FakePb2)),
        ):
            result = await bridge.ingest_batch("not-a-real-tool", b"{}", "scan-xyz")

        assert result["routed_to"] == "rust"
        assert fake_stub.last_request.tool == FakePb2.TOOL_UNKNOWN
