"""CosmicSec CLI — CA-2.1 Global Output Formatter.

Supports table (Rich), json, yaml, csv, and quiet formats.
Auto-detects TTY: defaults to json when stdout is not a terminal.
"""

from __future__ import annotations

import csv
import io
import json
import os
import sys
from typing import Any

from rich.console import Console
from rich.table import Table

_console = Console()
_err_console = Console(stderr=True)

# Exit-code constants (CA-2.1)
EXIT_OK = 0
EXIT_ERROR = 1
EXIT_AUTH_ERROR = 2
EXIT_NETWORK_ERROR = 3
EXIT_TOOL_NOT_FOUND = 4
EXIT_SCAN_ERROR = 5


def _is_tty() -> bool:
    return sys.stdout.isatty()


def _default_format() -> str:
    return "table" if _is_tty() else "json"


def _no_color() -> bool:
    return not _is_tty() or os.getenv("NO_COLOR") is not None


class OutputFormatter:
    """Universal output formatter — respects global ``--output`` / ``--no-color`` flags."""

    def __init__(
        self,
        fmt: str | None = None,
        no_color: bool = False,
        verbose: int = 0,
    ) -> None:
        self.fmt = fmt or _default_format()
        self.no_color = no_color or _no_color()
        self.verbose = verbose
        self._console = Console(highlight=not self.no_color)

    # ------------------------------------------------------------------
    # Public: render methods
    # ------------------------------------------------------------------

    def table(
        self,
        data: list[dict[str, Any]],
        columns: list[str] | None = None,
        title: str = "",
    ) -> None:
        """Render *data* as a Rich table."""
        if not data:
            self._console.print("[yellow]No data.[/yellow]")
            return
        cols = columns or list(data[0].keys())
        t = Table(title=title, show_header=True, header_style="bold magenta")
        for col in cols:
            t.add_column(col, style="cyan")
        for row in data:
            t.add_row(*[str(row.get(c, "")) for c in cols])
        self._console.print(t)

    def json(self, data: Any) -> None:  # noqa: A003
        """Pretty-print *data* as JSON."""
        self._console.print_json(json.dumps(data, indent=2, default=str))

    def yaml(self, data: Any) -> None:
        """Render *data* as YAML. Falls back to JSON if pyyaml is not installed."""
        try:
            import yaml  # type: ignore[import-untyped]

            self._console.print(yaml.dump(data, allow_unicode=True, default_flow_style=False))
        except ImportError:
            _err_console.print("[yellow]pyyaml not installed — falling back to JSON.[/yellow]")
            self.json(data)

    def csv(self, data: list[dict[str, Any]], columns: list[str] | None = None) -> None:  # noqa: A003
        """Render *data* as CSV to stdout."""
        if not data:
            return
        cols = columns or list(data[0].keys())
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        print(buf.getvalue(), end="")

    def quiet(self, data: Any, key: str | None = None) -> None:
        """Print a single value — useful for scripting."""
        if isinstance(data, dict):
            val = data.get(key or "") if key else json.dumps(data, default=str)
        elif isinstance(data, list):
            val = "\n".join(str(item.get(key, item) if isinstance(item, dict) else item) for item in data)
        else:
            val = str(data)
        print(val)

    # ------------------------------------------------------------------
    # Dispatch: render in configured format
    # ------------------------------------------------------------------

    def render(
        self,
        data: Any,
        *,
        columns: list[str] | None = None,
        title: str = "",
        quiet_key: str | None = None,
    ) -> None:
        """Render *data* in the configured format."""
        fmt = self.fmt
        if fmt == "json":
            self.json(data)
        elif fmt == "yaml":
            self.yaml(data)
        elif fmt == "csv":
            rows = data if isinstance(data, list) else [data]
            self.csv(rows, columns=columns)
        elif fmt == "quiet":
            self.quiet(data, key=quiet_key)
        else:
            # Default: table
            rows = data if isinstance(data, list) else [data]
            self.table(rows, columns=columns, title=title)

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    def success(self, message: str) -> None:
        if self.fmt not in ("quiet",):
            self._console.print(f"[green]✅ {message}[/green]")

    def error(self, message: str) -> None:
        _err_console.print(f"[red]❌ {message}[/red]")

    def info(self, message: str) -> None:
        if self.verbose >= 1 and self.fmt not in ("quiet",):
            self._console.print(f"[dim]{message}[/dim]")

    def warn(self, message: str) -> None:
        if self.fmt not in ("quiet",):
            _err_console.print(f"[yellow]⚠  {message}[/yellow]")


# Shared singleton (updated by global callback with parsed options)
_FORMATTER: OutputFormatter | None = None


def get_formatter(
    fmt: str | None = None,
    no_color: bool = False,
    verbose: int = 0,
) -> OutputFormatter:
    """Return (or create) the shared formatter for the current invocation."""
    global _FORMATTER
    if _FORMATTER is None or fmt is not None:
        _FORMATTER = OutputFormatter(fmt=fmt, no_color=no_color, verbose=verbose)
    return _FORMATTER


def set_formatter(fmt: str, no_color: bool = False, verbose: int = 0) -> None:
    """Called from the Typer global callback to configure the shared formatter."""
    global _FORMATTER
    _FORMATTER = OutputFormatter(fmt=fmt, no_color=no_color, verbose=verbose)
