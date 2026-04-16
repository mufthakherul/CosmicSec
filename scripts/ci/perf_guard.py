#!/usr/bin/env python
"""Simple CI performance guard with baseline comparison."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


def _measure_service_import_ms() -> float:
    started = time.perf_counter()
    proc = subprocess.run(
        [sys.executable, "-c", "import services.scan_service.main"],  # noqa: S603
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "Service import benchmark failed")
    return (time.perf_counter() - started) * 1000


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--max-regression", type=float, default=10.0)
    args = parser.parse_args()

    baseline_path = Path(args.baseline)
    if not baseline_path.exists():
        raise FileNotFoundError(f"Baseline file not found: {baseline_path}")
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    baseline_ms = float(baseline.get("scan_service_import_ms", 0))
    if baseline_ms <= 0:
        raise ValueError("Baseline must include a positive scan_service_import_ms")

    current_ms = _measure_service_import_ms()
    regression = ((current_ms - baseline_ms) / baseline_ms) * 100
    print(
        json.dumps(
            {
                "baseline_ms": round(baseline_ms, 2),
                "current_ms": round(current_ms, 2),
                "regression_pct": round(regression, 2),
                "allowed_regression_pct": args.max_regression,
            },
            indent=2,
        )
    )
    if regression > args.max_regression:
        print(
            f"Performance regression exceeded threshold: {regression:.2f}% > {args.max_regression:.2f}%",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
