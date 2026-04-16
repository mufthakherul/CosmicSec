"""SQLite-backed local CLI audit logging."""

from __future__ import annotations

import csv
import json
import os
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path


def _config_dir() -> Path:
    override = os.getenv("COSMICSEC_CONFIG_DIR")
    return Path(override).expanduser() if override else Path.home() / ".cosmicsec"


_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS cli_audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    profile TEXT,
    target TEXT,
    detail TEXT,
    success INTEGER NOT NULL
)
"""


class AuditLogStore:
    def __init__(self) -> None:
        base = _config_dir()
        base.mkdir(parents=True, exist_ok=True)
        self._db_path = base / "audit.db"
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(_CREATE_TABLE)
            conn.commit()

    def log(
        self,
        action: str,
        *,
        profile: str | None = None,
        target: str | None = None,
        detail: str | None = None,
        success: bool = True,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO cli_audit_log (id, timestamp, action, profile, target, detail, success)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    datetime.now(tz=UTC).isoformat(),
                    action,
                    profile,
                    target,
                    detail,
                    1 if success else 0,
                ),
            )
            conn.commit()

    def list(self, *, limit: int = 20, since: str | None = None, action: str | None = None) -> list[dict]:
        query = "SELECT * FROM cli_audit_log"
        clauses = []
        params: list = []

        if since:
            clauses.append("timestamp >= ?")
            params.append(since)
        if action:
            clauses.append("action = ?")
            params.append(action)

        if clauses:
            query += " WHERE " + " AND ".join(clauses)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(max(1, limit))

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

    def clear(self, *, before: str | None = None) -> int:
        with self._connect() as conn:
            if before:
                cur = conn.execute("DELETE FROM cli_audit_log WHERE timestamp < ?", (before,))
            else:
                cur = conn.execute("DELETE FROM cli_audit_log")
            conn.commit()
            return cur.rowcount

    def export(self, *, fmt: str, output_file: str) -> str:
        rows = self.list(limit=100000)
        if fmt == "csv":
            with open(output_file, "w", encoding="utf-8", newline="") as handle:
                if rows:
                    writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
                    writer.writeheader()
                    for row in rows:
                        writer.writerow(row)
                else:
                    handle.write("")
        else:
            with open(output_file, "w", encoding="utf-8") as handle:
                json.dump(rows, handle, indent=2)
        return output_file
