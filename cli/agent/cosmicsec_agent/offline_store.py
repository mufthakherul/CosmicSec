"""Offline SQLite store for scan results and findings when the agent is disconnected."""

from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path


_DB_DIR = Path.home() / ".cosmicsec"
_DB_PATH = _DB_DIR / "offline.db"

_CREATE_SCANS = """
CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    target TEXT NOT NULL,
    tool TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
)
"""

_CREATE_FINDINGS = """
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL REFERENCES scans(id),
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    evidence TEXT,
    tool TEXT,
    target TEXT,
    timestamp TEXT,
    synced INTEGER NOT NULL DEFAULT 0
)
"""


class OfflineStore:
    """SQLite-backed store for offline scan data and findings.

    The database lives at ``~/.cosmicsec/offline.db``.
    """

    def __init__(self, db_path: Path | None = None) -> None:
        self._db_path = db_path or _DB_PATH
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def init_db(self) -> None:
        """Create database tables if they do not exist."""
        with self._connect() as conn:
            conn.execute(_CREATE_SCANS)
            conn.execute(_CREATE_FINDINGS)
            conn.commit()

    def save_scan(self, scan_id: str, target: str, tool: str, status: str) -> None:
        """Persist a new scan record."""
        from datetime import datetime, timezone

        created_at = datetime.now(tz=timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO scans (id, target, tool, status, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (scan_id, target, tool, status, created_at),
            )
            conn.commit()

    def update_scan_status(self, scan_id: str, status: str) -> None:
        """Update the status of an existing scan."""
        with self._connect() as conn:
            conn.execute(
                "UPDATE scans SET status = ? WHERE id = ?",
                (status, scan_id),
            )
            conn.commit()

    def save_finding(self, finding: dict, scan_id: str) -> None:
        """Persist a finding associated with *scan_id*."""
        import uuid

        finding_id = finding.get("id") or str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO findings
                    (id, scan_id, title, severity, description, evidence, tool, target, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    finding_id,
                    scan_id,
                    finding.get("title", ""),
                    finding.get("severity", "info"),
                    finding.get("description", ""),
                    finding.get("evidence", ""),
                    finding.get("tool", ""),
                    finding.get("target", ""),
                    finding.get("timestamp", ""),
                ),
            )
            conn.commit()

    def get_unsynced_findings(self) -> list[dict]:
        """Return all findings that have not yet been synced to the server."""
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM findings WHERE synced = 0").fetchall()
        return [dict(row) for row in rows]

    def mark_synced(self, finding_ids: list[str]) -> None:
        """Mark the given finding IDs as synced."""
        if not finding_ids:
            return
        placeholders = ",".join("?" for _ in finding_ids)
        with self._connect() as conn:
            conn.execute(
                f"UPDATE findings SET synced = 1 WHERE id IN ({placeholders})",
                finding_ids,
            )
            conn.commit()

    def export_json(self, output_path: str) -> None:
        """Export all findings to a JSON file at *output_path*."""
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM findings").fetchall()
        data = [dict(row) for row in rows]
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)

    def export_csv(self, output_path: str) -> None:
        """Export all findings to a CSV file at *output_path*."""
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM findings").fetchall()
        if not rows:
            with open(output_path, "w", newline="", encoding="utf-8") as fh:
                fh.write("")
            return
        fieldnames = list(dict(rows[0]).keys())
        with open(output_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            for row in rows:
                writer.writerow(dict(row))
