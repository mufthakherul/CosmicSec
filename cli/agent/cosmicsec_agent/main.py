"""CosmicSec Agent CLI — main entry point (Typer + Rich).

Supports three execution modes:
  • **static**  — Registry-only tool execution (fast, offline, deterministic)
  • **dynamic** — AI-powered planning and execution (like GitHub Copilot CLI)
  • **hybrid**  — AI planning with static fallback (default, recommended)
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

app = typer.Typer(
    name="cosmicsec-agent",
    help=(
        "CosmicSec Agent — AI-powered security command center.\n\n"
        "Modes: static (registry-only), dynamic (AI-planned), hybrid (default).\n\n"
        "Quick start:\n"
        '  cosmicsec-agent run "scan 192.168.1.1 with nmap"\n'
        "  cosmicsec-agent discover\n"
        "  cosmicsec-agent scan -t 192.168.1.1 --tool nmap"
    ),
    add_completion=False,
)
offline_app = typer.Typer(help="Offline data management commands.")
app.add_typer(offline_app, name="offline")

mode_app = typer.Typer(help="Execution mode management.")
app.add_typer(mode_app, name="mode")
auth_app = typer.Typer(help="Authentication commands.")
app.add_typer(auth_app, name="auth")
profile_app = typer.Typer(help="Profile/workspace management commands.")
app.add_typer(profile_app, name="profile")
audit_app = typer.Typer(help="Audit trail commands.")
app.add_typer(audit_app, name="audit")

console = Console()
_active_profile: str | None = None

_CONFIG_DIR = Path(os.getenv("COSMICSEC_CONFIG_DIR", str(Path.home() / ".cosmicsec")))
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


def _resolve_profile() -> str:
    from .profiles import ProfileStore

    if _active_profile:
        return _active_profile
    return ProfileStore().get_active_profile()


def _audit(
    action: str,
    *,
    profile: str | None = None,
    target: str | None = None,
    detail: str | None = None,
    success: bool = True,
) -> None:
    from .audit_log import AuditLogStore

    try:
        AuditLogStore().log(
            action,
            profile=profile or _resolve_profile(),
            target=target,
            detail=detail,
            success=success,
        )
    except Exception:
        return


@app.callback()
def app_callback(
    profile: Optional[str] = typer.Option(None, "--profile", help="Profile name override"),
) -> None:
    """Global CLI options."""
    global _active_profile
    from .credential_store import CredentialStore
    from .profiles import ProfileStore

    _active_profile = profile or ProfileStore().get_active_profile()
    CredentialStore().migrate_legacy_config(_CONFIG_FILE)


# ---------------------------------------------------------------------------
# discover
# ---------------------------------------------------------------------------


@app.command()
def discover() -> None:
    """List all security tools installed on this machine.

    \b
    Shows tools from both the static registry and any dynamically
    discovered tools. Use with --json for machine-readable output.
    """
    from .tool_registry import ToolRegistry

    registry = ToolRegistry()
    with Progress(SpinnerColumn(), TextColumn("[bold cyan]Discovering tools…"), transient=True):
        tools = registry.discover()

    if not tools:
        console.print("[yellow]No supported security tools found on PATH.[/yellow]")
        _audit("discover", success=True)
        raise typer.Exit(0)

    table = Table(title="Discovered Security Tools", show_header=True, header_style="bold magenta")
    table.add_column("Tool", style="cyan", no_wrap=True)
    table.add_column("Path", style="dim")
    table.add_column("Version", style="green")
    table.add_column("Capabilities", style="white")

    for t in tools:
        table.add_row(t.name, t.path, t.version, ", ".join(t.capabilities))

    console.print(table)
    _audit("discover", detail=f"tools={len(tools)}", success=True)


# ---------------------------------------------------------------------------
# run (hybrid engine — the core new command)
# ---------------------------------------------------------------------------


@app.command()
def run(
    instruction: str = typer.Argument(..., help="Natural language instruction to execute"),
    mode: str = typer.Option(
        "hybrid",
        "--mode",
        "-m",
        help="Execution mode: static, dynamic, or hybrid (default)",
    ),
    dry_run: bool = typer.Option(False, "--dry-run", help="Plan only, do not execute"),
    quiet: bool = typer.Option(False, "--quiet", "-q", help="Minimal output (for scripting)"),
) -> None:
    """Execute a natural language security instruction using the hybrid engine.

    The hybrid engine combines AI-powered dynamic planning with the static tool
    registry for reliable, intelligent execution.

    \b
    Examples:
      cosmicsec-agent run "scan 192.168.1.1 with nmap"
      cosmicsec-agent run "check my network then analyze the results" --mode hybrid
      cosmicsec-agent run "run nuclei on example.com" --mode static
      cosmicsec-agent run "test the web app and generate a report" --dry-run
    """
    from .hybrid_engine import ExecutionMode, HybridEngine

    mode_map = {
        "static": ExecutionMode.STATIC,
        "dynamic": ExecutionMode.DYNAMIC,
        "hybrid": ExecutionMode.HYBRID,
    }
    exec_mode = mode_map.get(mode.lower())
    if exec_mode is None:
        console.print(f"[red]Invalid mode '{mode}'. Use: static, dynamic, or hybrid.[/red]")
        _audit("run", detail=f"invalid_mode={mode}", success=False)
        raise typer.Exit(1)

    cfg = _load_config()
    engine = HybridEngine(mode=exec_mode, config=cfg)

    if not quiet:
        console.print(
            f"\n[bold cyan]🚀 CosmicSec Hybrid Engine[/bold cyan] "
            f"[dim]({exec_mode.value} mode)[/dim]"
        )
        console.print(f"[dim]Instruction: {instruction}[/dim]\n")

    result = asyncio.run(engine.execute(instruction, interactive=not quiet, dry_run=dry_run))

    if dry_run:
        if not quiet:
            console.print("[yellow]Dry run — no commands were executed.[/yellow]")
        _audit("run", detail="dry_run", success=True)
        raise typer.Exit(0)

    if not result.success:
        _audit("run", detail="execution_failed", success=False)
        raise typer.Exit(1)
    _audit("run", success=True)


# ---------------------------------------------------------------------------
# plan (show execution plan without running)
# ---------------------------------------------------------------------------


@app.command()
def plan(
    instruction: str = typer.Argument(..., help="Natural language instruction to plan"),
    mode: str = typer.Option("hybrid", "--mode", "-m", help="Planning mode"),
    output_format: str = typer.Option("table", "--output-format", "-o", help="table or json"),
) -> None:
    """Show the execution plan for an instruction without executing it.

    Useful for previewing what the hybrid engine would do.

    \b
    Examples:
      cosmicsec-agent plan "scan 10.0.0.0/24 with all tools"
      cosmicsec-agent plan "check for sql injection on example.com" -o json
    """
    from .hybrid_engine import ExecutionMode, HybridEngine

    mode_map = {
        "static": ExecutionMode.STATIC,
        "dynamic": ExecutionMode.DYNAMIC,
        "hybrid": ExecutionMode.HYBRID,
    }
    exec_mode = mode_map.get(mode.lower(), ExecutionMode.HYBRID)

    cfg = _load_config()
    engine = HybridEngine(mode=exec_mode, config=cfg)

    execution_plan = asyncio.run(engine.plan(instruction))

    if output_format == "json":
        console.print_json(json.dumps(execution_plan.to_dict(), indent=2))
    else:
        engine._display_plan(execution_plan)
    _audit("plan", success=True)


# ---------------------------------------------------------------------------
# auth + profile + audit
# ---------------------------------------------------------------------------


@auth_app.command("login")
def auth_login(
    server: Optional[str] = typer.Option(None, "--server", help="Server URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="API key"),
    token: Optional[str] = typer.Option(None, "--token", help="Access token"),
    refresh_token: Optional[str] = typer.Option(None, "--refresh-token", help="Refresh token"),
    org_id: Optional[str] = typer.Option(None, "--org-id", help="Organization ID"),
) -> None:
    """Login using API key or access token."""
    from .auth import AuthManager

    profile = _resolve_profile()
    resolved_server = server or typer.prompt("Server URL", default="http://localhost:8000")
    if not api_key and not token:
        method = typer.prompt("Auth method (api_key/token)", default="api_key").strip().lower()
        if method == "token":
            token = typer.prompt("Access token", hide_input=True)
            refresh_token = refresh_token or typer.prompt(
                "Refresh token (optional)", default="", show_default=False
            )
            refresh_token = refresh_token or None
        else:
            api_key = typer.prompt("API key", hide_input=True)

    manager = AuthManager()
    result = manager.login(
        profile=profile,
        server_url=resolved_server,
        api_key=api_key,
        access_token=token,
        refresh_token=refresh_token,
        org_id=org_id,
    )
    _audit("login", profile=profile, target=resolved_server, success=True)
    console.print(f"[green]✅ Logged in on profile '{profile}'.[/green]")
    console.print(result)


@auth_app.command("logout")
def auth_logout(
    force: bool = typer.Option(False, "--force", help="Skip confirmation"),
) -> None:
    """Clear stored credentials for the active profile."""
    from .auth import AuthManager

    profile = _resolve_profile()
    if not force and not typer.confirm(f"Logout profile '{profile}'?"):
        raise typer.Exit(0)
    AuthManager().logout(profile)
    _audit("logout", profile=profile, success=True)
    console.print(f"[green]Logged out profile '{profile}'.[/green]")


@auth_app.command("status")
def auth_status() -> None:
    """Show authentication status for the active profile."""
    from .auth import AuthManager

    profile = _resolve_profile()
    status = AuthManager().status(profile)
    _audit("auth_status", profile=profile, success=True)
    console.print_json(json.dumps(status, indent=2))


@auth_app.command("refresh")
def auth_refresh() -> None:
    """Refresh access token using refresh token."""
    from .auth import AuthManager

    profile = _resolve_profile()
    try:
        result = AuthManager().refresh(profile)
        _audit("auth_refresh", profile=profile, success=True)
        console.print_json(json.dumps(result, indent=2))
    except Exception as exc:
        _audit("auth_refresh", profile=profile, detail=str(exc), success=False)
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc


@profile_app.command("list")
def profile_list() -> None:
    """List configured profiles."""
    from .profiles import ProfileStore

    profiles = ProfileStore().list_profiles()
    _audit("profile_list", success=True)
    if not profiles:
        console.print("[yellow]No profiles configured.[/yellow]")
        raise typer.Exit(0)
    table = Table(title="CosmicSec Profiles", show_header=True, header_style="bold magenta")
    table.add_column("Name", style="cyan")
    table.add_column("Active")
    table.add_column("Server")
    table.add_column("Auth")
    for row in profiles:
        table.add_row(
            row["name"],
            "✅" if row.get("active") else "",
            row.get("server_url", ""),
            row.get("auth_method", ""),
        )
    console.print(table)


@profile_app.command("add")
def profile_add(
    name: str = typer.Argument(..., help="Profile name"),
    server: Optional[str] = typer.Option(None, "--server", help="Server URL"),
    org_id: Optional[str] = typer.Option(None, "--org-id", help="Organization ID"),
) -> None:
    """Create or update a profile."""
    from .profiles import ProfileStore

    server_url = server or typer.prompt("Server URL", default="http://localhost:8000")
    profile = ProfileStore().upsert_profile(name, server_url=server_url, org_id=org_id)
    _audit("profile_add", profile=name, target=server_url, success=True)
    console.print_json(json.dumps(profile, indent=2))


@profile_app.command("use")
def profile_use(
    name: str = typer.Argument(..., help="Profile name"),
) -> None:
    """Set active profile."""
    from .profiles import ProfileStore

    store = ProfileStore()
    try:
        store.set_active_profile(name)
    except ValueError as exc:
        _audit("profile_switch", profile=name, detail=str(exc), success=False)
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc
    _audit("profile_switch", profile=name, success=True)
    console.print(f"[green]Active profile set to '{name}'.[/green]")


@profile_app.command("delete")
def profile_delete(
    name: str = typer.Argument(..., help="Profile name"),
    force: bool = typer.Option(False, "--force", help="Skip confirmation"),
) -> None:
    """Delete a profile and its stored credentials."""
    from .credential_store import CredentialStore
    from .profiles import ProfileStore

    if not force and not typer.confirm(f"Delete profile '{name}'?"):
        raise typer.Exit(0)
    deleted = ProfileStore().delete_profile(name)
    if not deleted:
        console.print(f"[red]Profile '{name}' not found.[/red]")
        raise typer.Exit(1)
    creds = CredentialStore()
    for key in ("api_key", "access_token", "refresh_token", "server_url", "org_id"):
        creds.delete(name, key)
    _audit("profile_delete", profile=name, success=True)
    console.print(f"[green]Deleted profile '{name}'.[/green]")


@profile_app.command("show")
def profile_show(name: Optional[str] = typer.Argument(None, help="Profile name")) -> None:
    """Show profile details."""
    from .profiles import ProfileStore

    resolved = name or _resolve_profile()
    profile = ProfileStore().get_profile(resolved)
    if not profile:
        console.print(f"[red]Profile '{resolved}' not found.[/red]")
        raise typer.Exit(1)
    _audit("profile_show", profile=resolved, success=True)
    console.print_json(json.dumps(profile, indent=2))


@audit_app.command("list")
def audit_list(
    limit: int = typer.Option(20, "--limit", help="Max entries"),
    since: Optional[str] = typer.Option(None, "--since", help="ISO timestamp filter"),
    action: Optional[str] = typer.Option(None, "--action", help="Action filter"),
) -> None:
    """List local CLI audit events."""
    from .audit_log import AuditLogStore

    rows = AuditLogStore().list(limit=limit, since=since, action=action)
    console.print_json(json.dumps(rows, indent=2))


@audit_app.command("export")
def audit_export(
    fmt: str = typer.Option("json", "--format", help="json or csv"),
    output: str = typer.Option("cosmicsec-audit.json", "--output", help="Output file"),
) -> None:
    """Export audit trail to file."""
    from .audit_log import AuditLogStore

    out = AuditLogStore().export(fmt=fmt, output_file=output)
    console.print(f"[green]Audit exported to {out}[/green]")


@audit_app.command("clear")
def audit_clear(
    before: Optional[str] = typer.Option(None, "--before", help="Delete records before timestamp"),
    force: bool = typer.Option(False, "--force", help="Skip confirmation"),
) -> None:
    """Clear audit trail entries."""
    from .audit_log import AuditLogStore

    if not force and not typer.confirm("Clear matching audit records?"):
        raise typer.Exit(0)
    deleted = AuditLogStore().clear(before=before)
    console.print(f"[green]Removed {deleted} audit event(s).[/green]")


# ---------------------------------------------------------------------------
# mode show / mode set
# ---------------------------------------------------------------------------


@mode_app.command("show")
def mode_show() -> None:
    """Show the current default execution mode."""
    cfg = _load_config()
    current = cfg.get("execution_mode", "hybrid")
    console.print(f"[bold]Current execution mode:[/bold] [cyan]{current}[/cyan]")
    console.print()
    console.print("[dim]Available modes:[/dim]")
    console.print("  [blue]static[/blue]   — Registry-only (fast, offline, deterministic)")
    console.print("  [green]dynamic[/green]  — AI-powered planning (like GitHub Copilot CLI)")
    console.print("  [magenta]hybrid[/magenta]   — AI + static fallback (recommended)")
    _audit("mode_show", success=True)


@mode_app.command("set")
def mode_set(
    mode: str = typer.Argument(..., help="Mode to set: static, dynamic, or hybrid"),
) -> None:
    """Set the default execution mode."""
    valid = {"static", "dynamic", "hybrid"}
    if mode.lower() not in valid:
        console.print(f"[red]Invalid mode '{mode}'. Use: {', '.join(valid)}[/red]")
        _audit("mode_set", detail=f"invalid_mode={mode}", success=False)
        raise typer.Exit(1)
    cfg = _load_config()
    cfg["execution_mode"] = mode.lower()
    _save_config(cfg)
    console.print(f"[green]Default execution mode set to:[/green] [bold]{mode.lower()}[/bold]")
    _audit("mode_set", detail=f"mode={mode.lower()}", success=True)


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
        _audit("scan_start", target=target, detail="missing_tool_selection", success=False)
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
            _audit("scan_start", target=target, detail=f"tool_not_found={tool}", success=False)
            raise typer.Exit(1)
        tools_to_run = [discovered[tool]]

    for tool_info in tools_to_run:
        scan_id = str(uuid.uuid4())
        store.save_scan(scan_id, target, tool_info.name, "running")
        _audit("scan_start", target=target, detail=f"tool={tool_info.name}", success=True)
        console.print(f"\n[bold cyan]Running {tool_info.name} against {target}…[/bold cyan]")

        extra_args = flags.split() if flags else []
        if output_format == "xml" and tool_info.name == "nmap":
            extra_args = ["-oX", "-"] + extra_args

        result = asyncio.run(run_tool_complete(tool_info.path, extra_args + [target]))

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
            _audit(
                "scan_complete",
                target=target,
                detail=f"tool={tool_info.name};exit_code={result.exit_code}",
                success=False,
            )
        else:
            _audit(
                "scan_complete",
                target=target,
                detail=f"tool={tool_info.name};findings={len(findings)}",
                success=True,
            )

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
        table.add_row(
            f"[{style}]{sev.upper()}[/{style}]", f.get("title", ""), f.get("evidence", "")
        )

    console.print(table)


# ---------------------------------------------------------------------------
# connect
# ---------------------------------------------------------------------------


@app.command()
def connect(
    server: Optional[str] = typer.Option(None, "--server", help="Server URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="API key for authentication"),
) -> None:
    """Register this agent and enter streaming mode."""
    from .offline_store import OfflineStore
    from .stream import AgentStreamClient
    from .tool_registry import ToolRegistry

    from .credential_store import CredentialStore
    from .profiles import ProfileStore

    profile = _resolve_profile()
    creds = CredentialStore()
    profile_store = ProfileStore()
    profile_data = profile_store.get_profile(profile) or {}

    # Precedence: explicit CLI flag > secure credential store > profile metadata > legacy config.
    resolved_server = (
        server
        or creds.retrieve(profile, "server_url")
        or profile_data.get("server_url")
        or _load_config().get("server")
    )
    resolved_api_key = api_key or creds.retrieve(profile, "api_key")
    if not resolved_server or not resolved_api_key:
        console.print(
            "[red]Missing server/api key. Run 'cosmicsec-agent auth login' first or pass --server --api-key.[/red]"
        )
        _audit("connect", profile=profile, detail="missing_credentials", success=False)
        raise typer.Exit(1)

    cfg = _load_config()
    agent_id = cfg.get("agent_id") or str(uuid.uuid4())
    cfg.update({"server": resolved_server, "agent_id": agent_id})
    _save_config(cfg)
    creds.store(profile, "server_url", resolved_server)
    creds.store(profile, "api_key", resolved_api_key)

    registry = ToolRegistry()
    manifest = registry.to_manifest()
    store = OfflineStore()
    client = AgentStreamClient(resolved_server, resolved_api_key, agent_id, store)

    console.print(f"[bold cyan]Connecting to {resolved_server} as agent {agent_id}…[/bold cyan]")

    async def _run() -> None:
        # First: register agent with server via REST
        http_base = resolved_server.replace("ws://", "http://").replace("wss://", "https://")
        import httpx

        try:
            async with httpx.AsyncClient() as http_client:
                reg_resp = await http_client.post(
                    f"{http_base}/api/agents/register",
                    json={"manifest": manifest, "agent_id": agent_id},
                    headers={"X-API-Key": resolved_api_key},
                    timeout=10.0,
                )
                if reg_resp.status_code == 200:
                    reg_data = reg_resp.json()
                    # Server may assign a canonical agent_id
                    canonical_id = reg_data.get("agent_id", agent_id)
                    if canonical_id != agent_id:
                        cfg["agent_id"] = canonical_id
                        _save_config(cfg)
                    console.print(
                        f"[green]Registered with server. Agent ID: {canonical_id}[/green]"
                    )
                else:
                    console.print(
                        f"[yellow]Registration returned {reg_resp.status_code} — continuing anyway.[/yellow]"
                    )
        except Exception as exc:
            console.print(f"[yellow]Could not reach registration endpoint: {exc}[/yellow]")

        # Then: open WebSocket + immediately send manifest
        await client.connect()
        await client._send_raw({"type": "manifest", "payload": manifest})
        console.print("[green]Connected! Streaming mode active. Press Ctrl+C to exit.[/green]")
        console.print(f"Tool manifest sent: {len(manifest['tools'])} tool(s).")
        _audit("connect", profile=profile, target=resolved_server, success=True)
        async for task in client.receive_tasks():
            console.print(f"[bold yellow]Received task:[/bold yellow] {task}")

    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        console.print("\n[yellow]Disconnected.[/yellow]")
        _audit("disconnect", profile=profile, target=resolved_server, success=True)


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
    _audit("export", detail=f"format={fmt};output={output_file}", success=True)


# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------


@app.command()
def status() -> None:
    """Show agent status including tools, connection, and execution mode."""
    from .offline_store import OfflineStore
    from .tool_registry import ToolRegistry

    cfg = _load_config()
    registry = ToolRegistry()
    tools = registry.discover()
    store = OfflineStore()
    unsynced = store.get_unsynced_findings()

    exec_mode = cfg.get("execution_mode", "hybrid")
    mode_colors = {"static": "blue", "dynamic": "green", "hybrid": "magenta"}
    mode_color = mode_colors.get(exec_mode, "white")

    console.print()
    console.print(
        Panel(
            "[bold]CosmicSec Agent Status[/bold]",
            subtitle="AI-Powered Security Command Center",
        )
    )
    console.print(f"  Config: {_CONFIG_FILE}")
    console.print(f"  Agent ID: {cfg.get('agent_id', '[dim]not registered[/dim]')}")
    console.print(f"  Server: {cfg.get('server', '[dim]not configured[/dim]')}")
    console.print(f"  [bold]Execution Mode:[/bold] [{mode_color}]{exec_mode}[/{mode_color}]")
    console.print(f"  Tools available: {len(tools)}")
    console.print(f"  Unsynced findings: {len(unsynced)}")

    # AI provider status
    has_openai = bool(cfg.get("openai_api_key") or os.environ.get("OPENAI_API_KEY"))
    has_server = bool(cfg.get("server"))
    console.print(f"  OpenAI: {'[green]configured[/green]' if has_openai else '[dim]not configured[/dim]'}")
    console.print(f"  Cloud AI: {'[green]available[/green]' if has_server else '[dim]not connected[/dim]'}")

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
    _audit("status", detail=f"tools={len(tools)};unsynced={len(unsynced)}", success=True)


if __name__ == "__main__":
    app()
