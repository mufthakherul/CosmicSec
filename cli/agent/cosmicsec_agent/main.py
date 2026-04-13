"""CosmicSec Agent CLI — main entry point (Typer + Rich)."""
from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

app = typer.Typer(
    name="cosmicsec-agent",
    help="CosmicSec local agent — discover tools, run scans, stream findings to cloud.",
    add_completion=False,
)
offline_app = typer.Typer(help="Offline data management commands.")
app.add_typer(offline_app, name="offline")

console = Console()

_CONFIG_DIR = Path.home() / ".cosmicsec"
_CONFIG_FILE = _CONFIG_DIR / "config.json"


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _load_config() -> dict:
    if _CONFIG_FILE.exists():
        return json.loads(_CONFIG_FILE.read_text())
    return {}


def _save_config(cfg: dict) -> None:
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    _CONFIG_FILE.write_text(json.dumps(cfg, indent=2))


# ---------------------------------------------------------------------------
# discover
# ---------------------------------------------------------------------------

@app.command()
def discover() -> None:
    """List all security tools installed on this machine."""
    from .tool_registry import ToolRegistry

    registry = ToolRegistry()
    with Progress(SpinnerColumn(), TextColumn("[bold cyan]Discovering tools…"), transient=True):
        tools = registry.discover()

    if not tools:
        console.print("[yellow]No supported security tools found on PATH.[/yellow]")
        raise typer.Exit(0)

    table = Table(title="Discovered Security Tools", show_header=True, header_style="bold magenta")
    table.add_column("Tool", style="cyan", no_wrap=True)
    table.add_column("Path", style="dim")
    table.add_column("Version", style="green")
    table.add_column("Capabilities", style="white")

    for t in tools:
        table.add_row(t.name, t.path, t.version, ", ".join(t.capabilities))

    console.print(table)


# ---------------------------------------------------------------------------
# scan
# ---------------------------------------------------------------------------

@app.command()
def scan(
    target: str = typer.Option(..., "--target", "-t", help="Target host or IP"),
    tool: Optional[str] = typer.Option(None, "--tool", help="Tool name to run"),
    flags: str = typer.Option("", "--flags", help="Extra flags to pass to the tool"),
    output_format: str = typer.Option("text", "--output-format", help="xml or text"),
    all_tools: bool = typer.Option(False, "--all", help="Run all available tools"),
) -> None:
    """Run a security scan against *target*."""
    from .executor import run_tool_complete
    from .offline_store import OfflineStore
    from .parsers import GobusterParser, NiktoParser, NmapParser, NucleiParser
    from .tool_registry import ToolRegistry

    if not tool and not all_tools:
        console.print("[red]Specify --tool <name> or --all.[/red]")
        raise typer.Exit(1)

    registry = ToolRegistry()
    discovered = {t.name: t for t in registry.discover()}
    store = OfflineStore()

    _PARSERS = {
        "nmap": NmapParser(),
        "nikto": NiktoParser(),
        "nuclei": NucleiParser(),
        "gobuster": GobusterParser(),
    }

    tools_to_run = list(discovered.values()) if all_tools else []
    if tool:
        if tool not in discovered:
            console.print(f"[red]Tool '{tool}' not found on PATH.[/red]")
            raise typer.Exit(1)
        tools_to_run = [discovered[tool]]

    for tool_info in tools_to_run:
        scan_id = str(uuid.uuid4())
        store.save_scan(scan_id, target, tool_info.name, "running")
        console.print(f"\n[bold cyan]Running {tool_info.name} against {target}…[/bold cyan]")

        extra_args = flags.split() if flags else []
        if output_format == "xml" and tool_info.name == "nmap":
            extra_args = ["-oX", "-"] + extra_args

        result = asyncio.run(
            run_tool_complete(tool_info.path, extra_args + [target])
        )

        store.update_scan_status(scan_id, "complete" if result.exit_code == 0 else "error")

        parser = _PARSERS.get(tool_info.name)
        if parser:
            output_to_parse = result.stdout if output_format != "xml" else result.stdout
            findings = parser.parse(output_to_parse)
        else:
            findings = []

        for f in findings:
            store.save_finding(f, scan_id)

        _display_findings(findings, tool_info.name, target)

        if result.exit_code != 0:
            console.print(f"[yellow]Tool exited with code {result.exit_code}[/yellow]")

    console.print("\n[green]Scan complete. Results saved to offline store.[/green]")


def _display_findings(findings: list[dict], tool_name: str, target: str) -> None:
    if not findings:
        console.print(f"[dim]No findings from {tool_name} against {target}.[/dim]")
        return

    _SEVERITY_STYLES = {
        "critical": "bold red",
        "high": "red",
        "medium": "yellow",
        "low": "blue",
        "info": "dim",
    }

    table = Table(title=f"{tool_name} findings — {target}", show_header=True, header_style="bold")
    table.add_column("Severity", style="bold", no_wrap=True)
    table.add_column("Title")
    table.add_column("Evidence", style="dim")

    for f in findings:
        sev = f.get("severity", "info")
        style = _SEVERITY_STYLES.get(sev, "")
        table.add_row(f"[{style}]{sev.upper()}[/{style}]", f.get("title", ""), f.get("evidence", ""))

    console.print(table)


# ---------------------------------------------------------------------------
# connect
# ---------------------------------------------------------------------------

@app.command()
def connect(
    server: str = typer.Option(..., "--server", help="WebSocket server URL"),
    api_key: str = typer.Option(..., "--api-key", help="API key for authentication"),
) -> None:
    """Register this agent and enter streaming mode."""
    from .offline_store import OfflineStore
    from .stream import AgentStreamClient
    from .tool_registry import ToolRegistry

    cfg = _load_config()
    agent_id = cfg.get("agent_id") or str(uuid.uuid4())
    cfg.update({"server": server, "api_key": api_key, "agent_id": agent_id})
    _save_config(cfg)

    registry = ToolRegistry()
    manifest = registry.to_manifest()
    store = OfflineStore()
    client = AgentStreamClient(server, api_key, agent_id, store)

    console.print(f"[bold cyan]Connecting to {server} as agent {agent_id}…[/bold cyan]")

    async def _run() -> None:
        # First: register agent with server via REST
        http_base = server.replace("ws://", "http://").replace("wss://", "https://")
        import httpx
        try:
            async with httpx.AsyncClient() as http_client:
                reg_resp = await http_client.post(
                    f"{http_base}/api/agents/register",
                    json={"manifest": manifest, "agent_id": agent_id},
                    headers={"X-API-Key": api_key},
                    timeout=10.0,
                )
                if reg_resp.status_code == 200:
                    reg_data = reg_resp.json()
                    # Server may assign a canonical agent_id
                    canonical_id = reg_data.get("agent_id", agent_id)
                    if canonical_id != agent_id:
                        cfg["agent_id"] = canonical_id
                        _save_config(cfg)
                    console.print(f"[green]Registered with server. Agent ID: {canonical_id}[/green]")
                else:
                    console.print(f"[yellow]Registration returned {reg_resp.status_code} — continuing anyway.[/yellow]")
        except Exception as exc:
            console.print(f"[yellow]Could not reach registration endpoint: {exc}[/yellow]")

        # Then: open WebSocket + immediately send manifest
        await client.connect()
        await client._send_raw({"type": "manifest", "payload": manifest})
        console.print("[green]Connected! Streaming mode active. Press Ctrl+C to exit.[/green]")
        console.print(f"Tool manifest sent: {len(manifest['tools'])} tool(s).")
        async for task in client.receive_tasks():
            console.print(f"[bold yellow]Received task:[/bold yellow] {task}")

    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        console.print("\n[yellow]Disconnected.[/yellow]")


# ---------------------------------------------------------------------------
# offline export
# ---------------------------------------------------------------------------

@offline_app.command("export")
def offline_export(
    fmt: str = typer.Option("json", "--format", help="Output format: json or csv"),
    output_file: str = typer.Option("findings.json", "--output-file", help="Output file path"),
) -> None:
    """Export offline findings to a file."""
    from .offline_store import OfflineStore

    store = OfflineStore()
    if fmt == "csv":
        if not output_file.endswith(".csv"):
            output_file = output_file.rsplit(".", 1)[0] + ".csv"
        store.export_csv(output_file)
    else:
        if not output_file.endswith(".json"):
            output_file = output_file.rsplit(".", 1)[0] + ".json"
        store.export_json(output_file)
    console.print(f"[green]Exported findings to {output_file}[/green]")


# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------

@app.command()
def status() -> None:
    """Show installed tools and current connection status."""
    from .offline_store import OfflineStore
    from .tool_registry import ToolRegistry

    cfg = _load_config()
    registry = ToolRegistry()
    tools = registry.discover()
    store = OfflineStore()
    unsynced = store.get_unsynced_findings()

    console.print(f"\n[bold]CosmicSec Agent Status[/bold]")
    console.print(f"  Config: {_CONFIG_FILE}")
    console.print(f"  Agent ID: {cfg.get('agent_id', '[dim]not registered[/dim]')}")
    console.print(f"  Server: {cfg.get('server', '[dim]not configured[/dim]')}")
    console.print(f"  Tools available: {len(tools)}")
    console.print(f"  Unsynced findings: {len(unsynced)}")

    if tools:
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Tool")
        table.add_column("Path")
        table.add_column("Version")
        for t in tools:
            table.add_row(t.name, t.path, t.version)
        console.print(table)
    else:
        console.print("[yellow]No supported tools found on PATH.[/yellow]")


if __name__ == "__main__":
    app()
