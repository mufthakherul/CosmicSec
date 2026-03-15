"""Helpers for parsing hybrid runtime envelopes from gateway responses."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class RuntimeEnvelope:
    route: str
    mode: str
    degraded: bool
    trace_id: str | None
    route_key: str | None


def parse_runtime_envelope(payload: Dict[str, Any]) -> RuntimeEnvelope:
    runtime = payload.get("_runtime", {})
    contract = payload.get("_contract", {})
    return RuntimeEnvelope(
        route=runtime.get("route", "unknown"),
        mode=runtime.get("mode", "unknown"),
        degraded=bool(contract.get("degraded", False)),
        trace_id=runtime.get("trace_id"),
        route_key=runtime.get("route_key"),
    )


def is_degraded(payload: Dict[str, Any]) -> bool:
    return parse_runtime_envelope(payload).degraded


def assert_not_degraded(payload: Dict[str, Any]) -> None:
    env = parse_runtime_envelope(payload)
    if env.degraded:
        raise RuntimeError(f"Operation degraded via route={env.route} mode={env.mode}")

