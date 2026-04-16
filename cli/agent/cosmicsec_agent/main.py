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
history_app = typer.Typer(help="Scan history and findings management.")
app.add_typer(history_app, name="history")
config_app = typer.Typer(help="CLI configuration management.")
app.add_typer(config_app, name="config")
completions_app = typer.Typer(help="Shell completion scripts.")
app.add_typer(completions_app, name="completions")

console = Console()
_active_profile: str | None = None

_CONFIG_DIR = Path(os.getenv("COSMICSEC_CONFIG_DIR", str(Path.home() / ".cosmicsec")))
_CONFIG_FILE = _CONFIG_DIR / "config.json"
_global_output_format: str | None = None


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
    output: Optional[str] = typer.Option(
        None,
        "--output",
        "-o",
        help="Global output format: table|json|yaml|csv|quiet",
    ),
    no_color: bool = typer.Option(False, "--no-color", help="Disable ANSI styling"),
    verbose: int = typer.Option(0, "--verbose", "-v", count=True, help="Increase verbosity"),
) -> None:
    """Global CLI options."""
    global _active_profile
    global _global_output_format
    from .credential_store import CredentialStore
    from .output import set_formatter
    from .profiles import ProfileStore

    _active_profile = profile or ProfileStore().get_active_profile()
    _global_output_format = output
    if output is not None:
        set_formatter(output, no_color=no_color, verbose=verbose)
    else:
        set_formatter("table", no_color=no_color, verbose=verbose)
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
    parallel: int = typer.Option(3, "--parallel", min=1, max=8, help="Concurrent tools for --all"),
) -> None:
    """Run a security scan against *target*."""
    from .offline_store import OfflineStore
    from .progress import run_tools_with_progress
    from .tool_registry import ToolRegistry

    if not tool and not all_tools:
        console.print("[red]Specify --tool <name> or --all.[/red]")
        _audit("scan_start", target=target, detail="missing_tool_selection", success=False)
        raise typer.Exit(1)

    registry = ToolRegistry()
    discovered = {t.name: t for t in registry.discover()}
    store = OfflineStore()

    tools_to_run = list(discovered.values()) if all_tools else []
    if tool:
        if tool not in discovered:
            console.print(f"[red]Tool '{tool}' not found on PATH.[/red]")
            _audit("scan_start", target=target, detail=f"tool_not_found={tool}", success=False)
            raise typer.Exit(1)
        tools_to_run = [discovered[tool]]

    tool_payloads: list[dict] = []
    scan_ids: dict[str, str] = {}
    for tool_info in tools_to_run:
        scan_id = str(uuid.uuid4())
        scan_ids[tool_info.name] = scan_id
        store.save_scan(scan_id, target, tool_info.name, "running")
        _audit("scan_start", target=target, detail=f"tool={tool_info.name}", success=True)

        extra_args = flags.split() if flags else []
        if output_format == "xml" and tool_info.name == "nmap":
            extra_args = ["-oX", "-"] + extra_args

        tool_payloads.append({"name": tool_info.name, "path": tool_info.path, "args": extra_args})

    tool_results, _ = asyncio.run(
        run_tools_with_progress(tool_payloads, target=target, max_parallel=parallel if all_tools else 1)
    )

    for result in tool_results:
        tool_name = result["name"]
        scan_id = scan_ids.get(tool_name)
        if not scan_id:
            continue
        findings = result["findings"]
        exit_code = result["exit_code"]
        store.update_scan_status(scan_id, "complete" if exit_code == 0 else "error")
        for finding in findings:
            store.save_finding(finding, scan_id)
        _display_findings(findings, tool_name, target)
        if exit_code != 0:
            console.print(f"[yellow]Tool exited with code {exit_code}[/yellow]")
            _audit(
                "scan_complete",
                target=target,
                detail=f"tool={tool_name};exit_code={exit_code}",
                success=False,
            )
        else:
            _audit(
                "scan_complete",
                target=target,
                detail=f"tool={tool_name};findings={len(findings)}",
                success=True,
            )

    if any(r["exit_code"] != 0 for r in tool_results):
        raise typer.Exit(5)


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


# ---------------------------------------------------------------------------
# history commands — CA-2.3
# ---------------------------------------------------------------------------


@history_app.command("list")
def history_list(
    limit: int = typer.Option(20, "--limit", "-n", help="Max results"),
    since: Optional[str] = typer.Option(None, "--since", help="ISO date filter, e.g. 2026-01-01"),
    tool: Optional[str] = typer.Option(None, "--tool", help="Filter by tool name"),
    target: Optional[str] = typer.Option(None, "--target", help="Filter by target (partial match)"),
    output_format: Optional[str] = typer.Option(None, "--output", "-o", help="table|json|yaml|csv"),
) -> None:
    """List past scans with finding counts.

    \b
    Examples:
      cosmicsec-agent history list --limit 10
      cosmicsec-agent history list --tool nmap --since 2026-01-01 -o json
    """
    from .offline_store import OfflineStore
    from .output import get_formatter

    scans = OfflineStore().list_scans(limit=limit, since=since, tool=tool, target=target)
    _audit("history_list", detail=f"limit={limit}", success=True)
    selected_format = output_format or _global_output_format
    fmt = get_formatter(fmt=selected_format)
    if fmt.fmt == "table":
        rows = [
            {
                "ID": s["id"][:8] + "…",
                "Target": s["target"],
                "Tool": s["tool"],
                "Status": s["status"],
                "Created": s["created_at"][:19],
                "Findings": s["total_findings"],
            }
            for s in scans
        ]
        fmt.table(rows, title="Scan History")
    else:
        fmt.render(scans)


@history_app.command("show")
def history_show(
    scan_id: str = typer.Argument(..., help="Scan ID (or prefix)"),
    output_format: Optional[str] = typer.Option(None, "--output", "-o", help="table|json"),
) -> None:
    """Show full scan details including all findings."""
    from .offline_store import OfflineStore
    from .output import get_formatter

    store = OfflineStore()
    # Support prefix matching
    all_scans = store.list_scans(limit=500)
    matched = [s for s in all_scans if s["id"].startswith(scan_id)]
    if not matched:
        console.print(f"[red]No scan found with ID prefix '{scan_id}'.[/red]")
        raise typer.Exit(1)
    scan = store.get_scan_with_findings(matched[0]["id"])
    if not scan:
        console.print(f"[red]Scan '{scan_id}' not found.[/red]")
        raise typer.Exit(1)
    _audit("history_show", target=scan.get("target"), success=True)
    selected_format = output_format or _global_output_format
    fmt = get_formatter(fmt=selected_format)
    if fmt.fmt == "table":
        console.print(f"\n[bold]Scan:[/bold] {scan['id']}")
        console.print(f"[bold]Target:[/bold] {scan['target']}")
        console.print(f"[bold]Tool:[/bold] {scan['tool']}  |  [bold]Status:[/bold] {scan['status']}")
        console.print(f"[bold]Created:[/bold] {scan['created_at']}")
        findings = scan.get("findings", [])
        if findings:
            rows = [{"Severity": f["severity"].upper(), "Title": f["title"], "Evidence": (f.get("evidence") or "")[:60]} for f in findings]
            fmt.table(rows, title=f"Findings ({len(findings)})")
        else:
            console.print("[dim]No findings.[/dim]")
    else:
        fmt.render(scan)


@history_app.command("findings")
def history_findings(
    severity: Optional[str] = typer.Option(None, "--severity", "-s", help="Filter by severity"),
    tool: Optional[str] = typer.Option(None, "--tool", help="Filter by tool"),
    search: Optional[str] = typer.Option(None, "--search", help="Text search in title/description"),
    limit: int = typer.Option(50, "--limit", "-n", help="Max results"),
    output_format: Optional[str] = typer.Option(None, "--output", "-o", help="table|json|csv"),
) -> None:
    """Search across all findings with filters.

    \b
    Examples:
      cosmicsec-agent history findings --severity critical
      cosmicsec-agent history findings --search "sql injection" -o json
    """
    from .offline_store import OfflineStore
    from .output import get_formatter

    findings = OfflineStore().search_findings(severity=severity, tool=tool, search=search, limit=limit)
    _audit("history_findings", detail=f"n={len(findings)}", success=True)
    fmt = get_formatter(fmt=output_format or _global_output_format)
    if not findings:
        console.print("[dim]No findings match your filters.[/dim]")
        return
    fmt.render(
        findings,
        columns=["severity", "title", "tool", "target", "timestamp"],
        title=f"Findings ({len(findings)})",
    )


@history_app.command("diff")
def history_diff(
    scan_a: str = typer.Argument(..., help="First scan ID"),
    scan_b: str = typer.Argument(..., help="Second scan ID"),
    output_format: Optional[str] = typer.Option(None, "--output", "-o", help="table|json"),
) -> None:
    """Compare two scans: show new, resolved, and changed-severity findings."""
    from .offline_store import OfflineStore
    from .output import get_formatter

    diff = OfflineStore().diff_scans(scan_a, scan_b)
    _audit("history_diff", detail=f"a={scan_a[:8]};b={scan_b[:8]}", success=True)
    fmt = get_formatter(fmt=output_format or _global_output_format)
    if fmt.fmt == "json":
        fmt.json(diff)
        return
    console.print(f"\n[bold]Comparing scans[/bold] {scan_a[:8]}… → {scan_b[:8]}…")
    s = diff.get("summary", {})
    console.print(f"  [green]+{s.get('new', 0)} new[/green]  "
                  f"[red]-{s.get('resolved', 0)} resolved[/red]  "
                  f"[yellow]~{s.get('changed', 0)} changed severity[/yellow]")
    if diff.get("new_findings"):
        fmt.table(diff["new_findings"], columns=["severity", "title"], title="New Findings")
    if diff.get("resolved_findings"):
        fmt.table(diff["resolved_findings"], columns=["severity", "title"], title="Resolved Findings")
    if diff.get("changed_severity"):
        fmt.table(diff["changed_severity"], columns=["title", "old_severity", "new_severity"], title="Changed Severity")


@history_app.command("stats")
def history_stats(
    output_format: Optional[str] = typer.Option(None, "--output", "-o", help="table|json"),
) -> None:
    """Show aggregate scan and finding statistics."""
    from .offline_store import OfflineStore
    from .output import get_formatter

    stats = OfflineStore().stats()
    _audit("history_stats", success=True)
    fmt = get_formatter(fmt=output_format or _global_output_format)
    if fmt.fmt == "json":
        fmt.json(stats)
        return
    console.print(f"\n[bold]Total scans:[/bold] {stats['total_scans']}")
    console.print(f"[bold]Total findings:[/bold] {stats['total_findings']}")
    sev = stats.get("findings_by_severity", {})
    if sev:
        rows = [{"Severity": k, "Count": v} for k, v in sorted(sev.items())]
        fmt.table(rows, title="Findings by Severity")
    tools = stats.get("top_tools", [])
    if tools:
        fmt.table(tools, columns=["tool", "scans"], title="Top Tools Used")


@history_app.command("delete")
def history_delete(
    scan_id: str = typer.Argument(..., help="Scan ID to delete"),
    force: bool = typer.Option(False, "--force", help="Skip confirmation"),
) -> None:
    """Delete a scan and all its findings."""
    from .offline_store import OfflineStore

    if not force and not typer.confirm(f"Delete scan '{scan_id}' and all its findings?"):
        raise typer.Exit(0)
    deleted = OfflineStore().delete_scan(scan_id)
    if not deleted:
        console.print(f"[red]Scan '{scan_id}' not found.[/red]")
        raise typer.Exit(1)
    _audit("history_delete", detail=f"scan_id={scan_id}", success=True)
    console.print(f"[green]Deleted scan {scan_id}.[/green]")


# ---------------------------------------------------------------------------
# config commands — CA-2.4
# ---------------------------------------------------------------------------


@config_app.command("get")
def config_get(
    key: str = typer.Argument(..., help="Setting key"),
) -> None:
    """Get a single configuration value.

    \b
    Example:
      cosmicsec-agent config get default_output_format
    """
    from .config import SettingsStore

    try:
        value = SettingsStore().get(key)
        console.print(f"{key} = {value}")
    except KeyError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc


@config_app.command("set")
def config_set(
    key: str = typer.Argument(..., help="Setting key"),
    value: str = typer.Argument(..., help="New value"),
) -> None:
    """Set a configuration value.

    \b
    Examples:
      cosmicsec-agent config set default_output_format json
      cosmicsec-agent config set default_parallel 5
      cosmicsec-agent config set auto_sync false
    """
    from .config import SettingsStore

    try:
        coerced = SettingsStore().set(key, value)
        _audit("config_set", detail=f"{key}={coerced}", success=True)
        console.print(f"[green]Set {key} = {coerced}[/green]")
    except (KeyError, ValueError) as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc


@config_app.command("list")
def config_list(
    output_format: Optional[str] = typer.Option(None, "--output", "-o", help="table|json"),
    show_defaults: bool = typer.Option(False, "--all", help="Show all settings including unmodified"),
) -> None:
    """List all configuration settings.

    \b
    Examples:
      cosmicsec-agent config list
      cosmicsec-agent config list --all -o json
    """
    from .config import SettingsStore
    from .output import get_formatter

    rows = SettingsStore().list_all()
    if not show_defaults:
        rows = [r for r in rows if r["modified"]]
    if not rows:
        console.print("[dim]All settings are at their default values. Use --all to show.[/dim]")
        return
    fmt = get_formatter(fmt=output_format or _global_output_format)
    fmt.render(
        rows,
        columns=["key", "value", "default", "description"],
        title="CosmicSec Settings",
    )


@config_app.command("reset")
def config_reset(
    key: Optional[str] = typer.Argument(None, help="Key to reset (omit to reset all)"),
    force: bool = typer.Option(False, "--force", help="Skip confirmation when resetting all"),
) -> None:
    """Reset one or all settings to defaults."""
    from .config import SettingsStore

    if not key and not force and not typer.confirm("Reset ALL settings to defaults?"):
        raise typer.Exit(0)
    try:
        SettingsStore().reset(key)
        _audit("config_reset", detail=f"key={key or 'all'}", success=True)
        console.print(f"[green]Reset {'key ' + key if key else 'all settings'} to defaults.[/green]")
    except KeyError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc


@config_app.command("edit")
def config_edit() -> None:
    """Open the settings file in $EDITOR."""
    from .config import SettingsStore

    SettingsStore().edit()
    _audit("config_edit", success=True)
    console.print("[green]Settings saved.[/green]")


# ---------------------------------------------------------------------------
# completions — CA-2.5
# ---------------------------------------------------------------------------


@completions_app.command("install")
def completions_install(
    shell: Optional[str] = typer.Option(
        None,
        "--shell",
        help="Shell type: bash | zsh | fish | powershell (auto-detected if omitted)",
    ),
) -> None:
    """Install shell tab completions for cosmicsec-agent.

    \b
    Examples:
      cosmicsec-agent completions install
      cosmicsec-agent completions install --shell zsh
    """

    if not shell:
        shell_path = os.environ.get("SHELL", "")
        if "zsh" in shell_path:
            shell = "zsh"
        elif "fish" in shell_path:
            shell = "fish"
        elif "powershell" in shell_path.lower() or os.name == "nt":
            shell = "powershell"
        else:
            shell = "bash"

    console.print(f"[cyan]Generating completions for {shell}…[/cyan]")

    # Generate completion script via Typer / click
    try:
        import subprocess as _sp
        env = {**os.environ, f"_{app.info.name.upper().replace('-', '_')}_COMPLETE": f"{shell}_source"}
        result = _sp.run(["cosmicsec-agent"], env=env, capture_output=True, text=True)
        script = result.stdout
    except Exception:
        script = ""

    if not script:
        console.print("[yellow]Could not auto-generate completions. Please follow manual instructions below.[/yellow]")
        _print_manual_instructions(shell)
        return

    install_paths = {
        "bash": Path.home() / ".bash_completion.d" / "cosmicsec-agent",
        "zsh": Path.home() / ".zsh" / "completions" / "_cosmicsec-agent",
        "fish": Path.home() / ".config" / "fish" / "completions" / "cosmicsec-agent.fish",
        "powershell": Path.home() / "Documents" / "PowerShell" / "cosmicsec-agent.ps1",
    }
    dest = install_paths.get(shell, Path.home() / f".cosmicsec-agent-completions.{shell}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(script)
    _audit("completions_install", detail=f"shell={shell}", success=True)
    console.print(f"[green]Completions installed to {dest}[/green]")
    _print_manual_instructions(shell)


@completions_app.command("show")
def completions_show(
    shell: str = typer.Option("bash", "--shell", help="bash | zsh | fish | powershell"),
) -> None:
    """Print the completion script to stdout (for piping to a file)."""
    import subprocess as _sp

    env = {**os.environ, f"_{app.info.name.upper().replace('-', '_')}_COMPLETE": f"{shell}_source"}
    result = _sp.run(["cosmicsec-agent"], env=env, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    else:
        console.print("[yellow]Could not generate completions for this shell.[/yellow]")
        raise typer.Exit(1)


def _print_manual_instructions(shell: str) -> None:
    instructions = {
        "bash": 'Add to ~/.bashrc:\n  source ~/.bash_completion.d/cosmicsec-agent',
        "zsh": 'Add to ~/.zshrc:\n  fpath=(~/.zsh/completions $fpath)\n  autoload -U compinit && compinit',
        "fish": 'Fish completions are auto-loaded from ~/.config/fish/completions/',
        "powershell": 'Add to your PowerShell $PROFILE:\n  . ~/Documents/PowerShell/cosmicsec-agent.ps1',
    }
    msg = instructions.get(shell, "See your shell documentation for loading completion scripts.")
    console.print(f"\n[dim]{msg}[/dim]")


if __name__ == "__main__":
    app()
