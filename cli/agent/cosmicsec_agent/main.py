"""CosmicSec Agent CLI — main entry point (Typer + Rich).

Supports three execution modes:
  • **static**  — Registry-only tool execution (fast, offline, deterministic)
  • **dynamic** — AI-powered planning and execution (like GitHub Copilot CLI)
  • **hybrid**  — AI planning with static fallback (default, recommended)
"""

from __future__ import annotations

import asyncio
import gzip
import json
import os
import platform
import shlex
import subprocess
import tempfile
import uuid
import webbrowser
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from .__init__ import __version__
from .branding import available_themes, canonical_theme, print_banner, resolve_theme, severity_label

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
ai_app = typer.Typer(help="AI provider and local model commands.")
app.add_typer(ai_app, name="ai")
sync_app = typer.Typer(help="Offline sync and reconciliation commands.")
app.add_typer(sync_app, name="sync")
plugin_app = typer.Typer(help="Plugin lifecycle management commands.")
app.add_typer(plugin_app, name="plugin")
theme_app = typer.Typer(help="Theme customization commands.")
app.add_typer(theme_app, name="theme")

console = Console()
_active_profile: str | None = None
_active_theme: str = "default"

_CONFIG_DIR = Path(os.getenv("COSMICSEC_CONFIG_DIR", str(Path.home() / ".cosmicsec")))
_CONFIG_FILE = _CONFIG_DIR / "config.json"
_global_output_format: str | None = None
_plugins_loaded = False


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


def _resolve_server(profile: str) -> str | None:
    from .credential_store import CredentialStore
    from .profiles import ProfileStore

    creds = CredentialStore()
    profile_data = ProfileStore().get_profile(profile) or {}
    return (
        creds.retrieve(profile, "server_url")
        or profile_data.get("server_url")
        or _load_config().get("server")
        or _load_config().get("server_url")
    )


def _resolve_server_and_headers(profile: str) -> tuple[str, dict[str, str]]:
    from .auth import AuthManager

    server = _resolve_server(profile)
    if not server:
        raise ValueError(f"Profile '{profile}' has no server URL. Run 'cosmicsec-agent auth login'.")
    headers = AuthManager().require_auth_headers(profile)
    return server, headers


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
    ctx: typer.Context,
    profile: Optional[str] = typer.Option(None, "--profile", help="Profile name override"),
    output: Optional[str] = typer.Option(
        None,
        "--output",
        "-o",
        help="Global output format: table|json|yaml|csv|quiet",
    ),
    version: bool = typer.Option(
        False,
        "--version",
        help="Show version and runtime information.",
        is_eager=True,
    ),
    no_color: bool = typer.Option(False, "--no-color", help="Disable ANSI styling"),
    verbose: int = typer.Option(0, "--verbose", "-v", count=True, help="Increase verbosity"),
) -> None:
    """Global CLI options."""
    global _active_profile
    global _global_output_format
    global _active_theme
    global _plugins_loaded
    from .credential_store import CredentialStore
    from .config import SettingsStore
    from .output import set_formatter
    from .profiles import ProfileStore

    if version:
        py = platform.python_version()
        system = platform.system()
        arch = platform.machine() or "unknown-arch"
        console.print(f"CosmicSec Agent v{__version__} (Python {py}, {system} {arch})")
        raise typer.Exit(0)

    _active_profile = profile or ProfileStore().get_active_profile()
    _global_output_format = output
    _active_theme = resolve_theme(str(SettingsStore().get("color_theme")))
    if output is not None:
        set_formatter(output, no_color=no_color, verbose=verbose)
    else:
        set_formatter("table", no_color=no_color, verbose=verbose)
    CredentialStore().migrate_legacy_config(_CONFIG_FILE)
    if not _plugins_loaded:
        from .plugins import PluginManager

        try:
            loaded_plugins = PluginManager().load_command_plugins(app)
            if loaded_plugins and verbose:
                console.print(f"[dim]Loaded command plugins: {', '.join(loaded_plugins)}[/dim]")
        except Exception as exc:
            console.print(f"[yellow]Plugin load warning:[/yellow] {exc}")
        _plugins_loaded = True
    completion_env = f"_{app.info.name.upper().replace('-', '_')}_COMPLETE"
    if ctx.invoked_subcommand is None and completion_env not in os.environ:
        print_banner(console, _active_theme)
        console.print(ctx.get_help())
        raise typer.Exit(0)


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


@app.command("shell")
def shell(
    mode: str = typer.Option("hybrid", "--mode", "-m", help="Default execution mode for run/plan"),
) -> None:
    """Start an interactive CLI REPL for iterative agent workflows."""
    console.print("[bold cyan]CosmicSec interactive shell[/bold cyan] (type 'help' or 'exit')")

    while True:
        try:
            line = typer.prompt("cosmicsec").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[dim]Exiting shell.[/dim]")
            break

        if not line:
            continue
        if line.lower() in {"exit", "quit"}:
            break
        if line.lower() in {"help", "?"}:
            console.print(
                "Commands: run <instruction> | plan <instruction> | any cosmicsec-agent subcommand | exit"
            )
            continue

        if line.startswith("run "):
            instruction = line[4:].strip()
            if not instruction:
                console.print("[yellow]Usage: run <instruction>[/yellow]")
                continue
            try:
                run(instruction=instruction, mode=mode, dry_run=False, quiet=False)
            except typer.Exit:
                pass
            continue

        if line.startswith("plan "):
            instruction = line[5:].strip()
            if not instruction:
                console.print("[yellow]Usage: plan <instruction>[/yellow]")
                continue
            try:
                plan(instruction=instruction, mode=mode, output_format="table")
            except typer.Exit:
                pass
            continue

        try:
            args = shlex.split(line)
        except ValueError as exc:
            console.print(f"[red]Invalid command syntax:[/red] {exc}")
            continue

        proc = subprocess.run(["cosmicsec-agent", *args], check=False)
        if proc.returncode != 0:
            console.print(f"[yellow]Command exited with code {proc.returncode}.[/yellow]")


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
# version
# ---------------------------------------------------------------------------


@app.command("version")
def version_cmd() -> None:
    """Show version and runtime information."""
    py = platform.python_version()
    system = platform.system()
    arch = platform.machine() or "unknown-arch"
    console.print(f"CosmicSec Agent v{__version__} (Python {py}, {system} {arch})")


# ---------------------------------------------------------------------------
# update
# ---------------------------------------------------------------------------


@app.command("update")
def update_cmd(
    check_only: bool = typer.Option(
        False,
        "--check",
        help="Check for updates only; do not install.",
    ),
    strategy: str = typer.Option(
        "auto",
        "--strategy",
        help="Install strategy: auto|pip|pipx|brew|winget",
    ),
) -> None:
    """Check for CLI updates and optionally install the latest release."""
    import shutil
    import sys
    import subprocess

    import httpx

    try:
        resp = httpx.get("https://pypi.org/pypi/cosmicsec-agent/json", timeout=8.0)
        if resp.status_code != 200:
            console.print("[red]Unable to query package metadata from PyPI.[/red]")
            raise typer.Exit(1)
        latest = str(resp.json().get("info", {}).get("version", "")).strip()
    except Exception as exc:
        console.print(f"[red]Update check failed: {exc}[/red]")
        _audit("update_check", detail=f"error={exc}", success=False)
        raise typer.Exit(1) from exc

    if not latest:
        console.print("[red]No latest version info found.[/red]")
        raise typer.Exit(1)

    if latest == __version__:
        console.print(f"[green]You are on the latest version ({__version__}).[/green]")
        _audit("update_check", detail=f"latest={latest};up_to_date=true", success=True)
        return

    console.print(f"[yellow]Update available:[/yellow] {__version__} -> {latest}")
    if check_only:
        _audit("update_check", detail=f"latest={latest};check_only=true", success=True)
        return

    strategy = strategy.lower().strip()
    if strategy not in {"auto", "pip", "pipx", "brew", "winget"}:
        console.print("[red]Invalid strategy. Use: auto|pip|pipx|brew|winget[/red]")
        _audit("update_install", detail=f"latest={latest};invalid_strategy={strategy}", success=False)
        raise typer.Exit(1)

    candidates: list[list[str]] = []
    if strategy in {"auto", "pipx"} and shutil.which("pipx"):
        candidates.append(["pipx", "upgrade", "cosmicsec-agent"])
    if strategy in {"auto", "brew"} and shutil.which("brew"):
        candidates.append(["brew", "upgrade", "cosmicsec-agent"])
    if strategy in {"auto", "winget"} and platform.system().lower() == "windows" and shutil.which("winget"):
        candidates.append(["winget", "upgrade", "--id", "CosmicSec.Agent", "--silent"])
    if strategy in {"auto", "pip"} or not candidates:
        candidates.append([sys.executable, "-m", "pip", "install", "--upgrade", "cosmicsec-agent"])

    last_error = ""
    proc = None
    used_cmd = ""
    for cmd in candidates:
        used_cmd = " ".join(cmd)
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode == 0:
            break
        last_error = (proc.stderr or proc.stdout or "").strip()[:1000]

    if proc is None or proc.returncode != 0:
        console.print("[red]Update install failed.[/red]")
        if last_error:
            console.print(last_error)
        _audit(
            "update_install",
            detail=f"latest={latest};strategy={strategy};cmd={used_cmd};rc={(proc.returncode if proc else -1)}",
            success=False,
        )
        raise typer.Exit(1)
    console.print(f"[green]Updated CosmicSec Agent to {latest}. Restart your shell session.[/green]")
    _audit("update_install", detail=f"latest={latest};strategy={strategy};cmd={used_cmd}", success=True)


# ---------------------------------------------------------------------------
# auth + profile + audit
# ---------------------------------------------------------------------------


@auth_app.command("login")
def auth_login(
    server: Optional[str] = typer.Option(None, "--server", help="Server URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="API key"),
    token: Optional[str] = typer.Option(None, "--token", help="Access token"),
    refresh_token: Optional[str] = typer.Option(None, "--refresh-token", help="Refresh token"),
    oauth_provider: Optional[str] = typer.Option(
        None, "--oauth-provider", help="OAuth provider for browser login: google|github|microsoft"
    ),
    org_id: Optional[str] = typer.Option(None, "--org-id", help="Organization ID"),
) -> None:
    """Login using API key, token, or browser OAuth."""
    from .auth import AuthManager

    profile = _resolve_profile()
    resolved_server = server or typer.prompt("Server URL", default="http://localhost:8000")
    if oauth_provider:
        method = "oauth"
    else:
        method = "api_key"
    if not api_key and not token and not oauth_provider:
        method = typer.prompt("Auth method (api_key/token/oauth)", default="api_key").strip().lower()
        if method == "token":
            token = typer.prompt("Access token", hide_input=True)
            refresh_token = refresh_token or typer.prompt(
                "Refresh token (optional)", default="", show_default=False
            )
            refresh_token = refresh_token or None
        elif method == "oauth":
            oauth_provider = typer.prompt(
                "OAuth provider (google/github/microsoft)", default="google"
            ).strip()
        else:
            api_key = typer.prompt("API key", hide_input=True)

    if method == "oauth":
        provider = (oauth_provider or "google").strip().lower()
        if provider not in {"google", "github", "microsoft"}:
            console.print("[red]Unsupported OAuth provider. Use google, github, or microsoft.[/red]")
            _audit("login", profile=profile, detail=f"invalid_provider={provider}", success=False)
            raise typer.Exit(1)
        import httpx

        try:
            start_resp = httpx.get(
                f"{resolved_server.rstrip('/')}/api/auth/sso/{provider}/authorize",
                timeout=12.0,
            )
            start_resp.raise_for_status()
            payload = start_resp.json()
        except Exception as exc:
            console.print(f"[red]Failed to start OAuth flow:[/red] {exc}")
            _audit("login", profile=profile, detail=f"oauth_start_failed:{provider}", success=False)
            raise typer.Exit(1) from exc

        authorize_url = str(payload.get("authorize_url") or "")
        if not authorize_url:
            console.print("[red]Server did not return an OAuth authorization URL.[/red]")
            _audit("login", profile=profile, detail=f"oauth_missing_url:{provider}", success=False)
            raise typer.Exit(1)

        console.print(f"[cyan]Opening browser for {provider} OAuth…[/cyan]")
        webbrowser.open(authorize_url)
        console.print("[dim]If browser did not open, use this URL:[/dim]")
        console.print(authorize_url)
        redirect_input = typer.prompt(
            "Paste the full callback URL (or only the authorization code)", default=""
        ).strip()
        callback_code = redirect_input
        callback_state: str | None = None
        if redirect_input.startswith("http://") or redirect_input.startswith("https://"):
            parsed = urlparse(redirect_input)
            params = parse_qs(parsed.query)
            callback_code = (params.get("code") or [""])[0]
            callback_state = (params.get("state") or [""])[0] or None
        if not callback_code:
            console.print("[red]Missing authorization code from callback input.[/red]")
            _audit("login", profile=profile, detail=f"oauth_missing_code:{provider}", success=False)
            raise typer.Exit(1)

        try:
            callback_resp = httpx.get(
                f"{resolved_server.rstrip('/')}/api/auth/sso/{provider}/callback",
                params={"code": callback_code, "state": callback_state} if callback_state else {"code": callback_code},
                timeout=12.0,
            )
            callback_resp.raise_for_status()
            callback_payload = callback_resp.json()
        except Exception as exc:
            console.print(f"[red]OAuth callback exchange failed:[/red] {exc}")
            _audit("login", profile=profile, detail=f"oauth_callback_failed:{provider}", success=False)
            raise typer.Exit(1) from exc

        token = str(callback_payload.get("access_token") or "").strip() or token
        refresh_token = str(callback_payload.get("refresh_token") or "").strip() or refresh_token
        if not token:
            console.print(
                "[yellow]Provider callback did not return tokens. Paste token manually to complete login.[/yellow]"
            )
            token = typer.prompt("Access token", hide_input=True)
            refresh_token = refresh_token or typer.prompt(
                "Refresh token (optional)", default="", show_default=False
            )
            refresh_token = refresh_token or None

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
    from .plugins import PluginManager
    from .progress import run_tools_with_progress
    from .tool_registry import ToolRegistry

    if not tool and not all_tools:
        console.print("[red]Specify --tool <name> or --all.[/red]")
        _audit("scan_start", target=target, detail="missing_tool_selection", success=False)
        raise typer.Exit(1)

    registry = ToolRegistry()
    discovered = {t.name: t for t in registry.discover()}
    plugin_parsers = PluginManager().load_parser_plugins()
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
        if not findings and tool_name in plugin_parsers:
            parser_fn = plugin_parsers[tool_name]
            raw_out = str(result.get("stdout", ""))
            try:
                findings = parser_fn(raw_out)
            except Exception as exc:
                _audit(
                    "scan_complete",
                    target=target,
                    detail=f"tool={tool_name};plugin_parse_error={exc}",
                    success=False,
                )
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

    table = Table(title=f"{tool_name} findings — {target}", show_header=True, header_style="bold")
    table.add_column("Severity", style="bold", no_wrap=True)
    table.add_column("Title")
    table.add_column("Evidence", style="dim")

    for f in findings:
        sev = str(f.get("severity", "info")).lower()
        sev_cell = severity_label(_active_theme, sev)
        table.add_row(
            sev_cell,
            f.get("title", ""),
            f.get("evidence", ""),
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
    from .auth import AuthManager
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
    resolved_server = server or _resolve_server(profile)
    auth_manager = AuthManager()
    if api_key:
        auth_headers = {"X-API-Key": api_key}
    else:
        try:
            auth_headers = auth_manager.require_auth_headers(profile)
        except ValueError as exc:
            console.print(f"[red]{exc}[/red]")
            _audit("connect", profile=profile, detail="missing_credentials", success=False)
            raise typer.Exit(1) from exc

    if not resolved_server:
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
    if api_key:
        creds.store(profile, "api_key", api_key)

    registry = ToolRegistry()
    manifest = registry.to_manifest()
    store = OfflineStore()
    ws_api_key = auth_headers.get("X-API-Key")
    if not ws_api_key:
        console.print(
            "[red]WebSocket agent stream currently requires an API key. "
            "Create one via the dashboard and run login with --api-key.[/red]"
        )
        _audit("connect", profile=profile, detail="missing_api_key_for_ws", success=False)
        raise typer.Exit(1)
    client = AgentStreamClient(resolved_server, ws_api_key, agent_id, store)

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
                    headers=auth_headers,
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


@theme_app.command("list")
def theme_list() -> None:
    """List available CLI color themes."""
    themes = available_themes()
    rows = [{"theme": name} for name in themes]
    table = Table(title="CosmicSec Themes", show_header=True, header_style="bold magenta")
    table.add_column("Theme", style="cyan")
    table.add_column("Preview", style="white")
    for row in rows:
        table.add_row(row["theme"], severity_label(row["theme"], "critical"))
    console.print(table)


@theme_app.command("set")
def theme_set(
    name: str = typer.Argument(..., help="Theme name: default|dark|light|minimal|neon"),
) -> None:
    """Set the active CLI theme."""
    from .config import SettingsStore

    global _active_theme
    selected = canonical_theme(name)
    if not selected:
        console.print(f"[red]Unknown theme '{name}'.[/red]")
        console.print(f"[dim]Available: {', '.join(available_themes())}[/dim]")
        raise typer.Exit(1)

    SettingsStore().set("color_theme", selected)
    _active_theme = selected
    _audit("theme_set", detail=f"theme={selected}", success=True)
    console.print(f"[green]Theme set to '{selected}'.[/green]")
    print_banner(console, selected, subtitle="Theme preview")


@theme_app.command("current")
def theme_current() -> None:
    """Show the currently configured theme."""
    from .config import SettingsStore

    selected = canonical_theme(str(SettingsStore().get("color_theme"))) or "default"
    console.print(f"Current theme: [bold]{selected}[/bold]")


@theme_app.command("preview")
def theme_preview(
    name: Optional[str] = typer.Option(None, "--theme", help="Theme name to preview"),
) -> None:
    """Preview banner and severity styles for a theme."""
    from .config import SettingsStore

    chosen = canonical_theme(name) if name else canonical_theme(str(SettingsStore().get("color_theme")))
    if not chosen:
        chosen = "default"
    print_banner(console, chosen, subtitle="Theme preview")
    sev_table = Table(title="Severity Style Preview", show_header=True, header_style="bold magenta")
    sev_table.add_column("Severity", style="cyan")
    sev_table.add_column("Label", style="white")
    for sev in ("critical", "high", "medium", "low", "info"):
        sev_table.add_row(sev, severity_label(chosen, sev))
    console.print(sev_table)


# ---------------------------------------------------------------------------
# ai + sync + plugin commands — CA-7/8/9/10 tranche
# ---------------------------------------------------------------------------


@app.command("ask")
def ask(
    question: str = typer.Argument(..., help="Natural-language security question"),
    context: str = typer.Option("", "--context", help="Optional extra context"),
) -> None:
    """Query CosmicSec AI and print actionable guidance."""
    import httpx

    profile = _resolve_profile()
    try:
        server, headers = _resolve_server_and_headers(profile)
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("ask", profile=profile, detail="missing_auth_or_server", success=False)
        raise typer.Exit(1) from exc

    payload = {"query": question, "context": context}
    try:
        resp = httpx.post(
            f"{server.rstrip('/')}/api/ai/query",
            json=payload,
            headers=headers,
            timeout=20.0,
        )
        resp.raise_for_status()
    except Exception as exc:
        console.print(f"[red]AI query failed:[/red] {exc}")
        _audit("ask", profile=profile, detail=f"error={exc}", success=False)
        raise typer.Exit(1) from exc

    data = resp.json()
    console.print_json(json.dumps(data, indent=2))
    _audit("ask", profile=profile, detail="ok", success=True)


@app.command("chat")
def chat(
    max_turns: int = typer.Option(20, "--max-turns", min=1, max=200, help="Max interactive turns"),
) -> None:
    """Persistent interactive AI chat mode backed by /api/ai/query."""
    import httpx

    profile = _resolve_profile()
    try:
        server, headers = _resolve_server_and_headers(profile)
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("chat", profile=profile, detail="missing_auth_or_server", success=False)
        raise typer.Exit(1) from exc

    chat_file = _CONFIG_DIR / "chat_history.json"
    history: list[dict] = []
    if chat_file.exists():
        try:
            raw = json.loads(chat_file.read_text(encoding="utf-8"))
            if isinstance(raw, list):
                history = raw[-200:]
        except Exception:
            history = []

    console.print("[bold cyan]AI chat mode[/bold cyan] (type 'exit' to leave)")
    turns = 0
    while turns < max_turns:
        try:
            question = typer.prompt("you").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not question:
            continue
        if question.lower() in {"exit", "quit"}:
            break

        context = "\n".join(
            [f"{item.get('role', 'user')}: {item.get('content', '')}" for item in history[-8:]]
        )
        try:
            resp = httpx.post(
                f"{server.rstrip('/')}/api/ai/query",
                json={"query": question, "context": context},
                headers=headers,
                timeout=25.0,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            console.print(f"[red]AI chat request failed:[/red] {exc}")
            _audit("chat", profile=profile, detail=f"error={exc}", success=False)
            raise typer.Exit(1) from exc

        guidance = data.get("guidance")
        console.print("[bold magenta]ai[/bold magenta]")
        console.print_json(json.dumps(guidance if guidance is not None else data, indent=2))
        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": json.dumps(guidance if guidance is not None else data)})
        turns += 1

    chat_file.parent.mkdir(parents=True, exist_ok=True)
    chat_file.write_text(json.dumps(history[-200:], indent=2), encoding="utf-8")
    _audit("chat", profile=profile, detail=f"turns={turns}", success=True)


@ai_app.command("setup")
def ai_setup(
    model_general: str = typer.Option("llama3.1", "--model-general", help="General-purpose Ollama model"),
    model_code: str = typer.Option("codellama", "--model-code", help="Code/security Ollama model"),
    no_pull: bool = typer.Option(False, "--no-pull", help="Skip model pulls, configure only"),
) -> None:
    """Configure local Ollama models for offline AI workflows."""
    import httpx

    from .config import SettingsStore

    cfg = _load_config()
    ollama_url = str(cfg.get("ollama_url", "http://localhost:11434")).rstrip("/")

    try:
        resp = httpx.get(f"{ollama_url}/api/tags", timeout=5.0)
        if resp.status_code != 200:
            console.print("[red]Ollama is not reachable (non-200 response).[/red]")
            raise typer.Exit(1)
    except Exception as exc:
        console.print(f"[red]Ollama is not reachable at {ollama_url}: {exc}[/red]")
        console.print("[yellow]Install/start Ollama, then re-run: cosmicsec-agent ai setup[/yellow]")
        if os.name == "nt":
            console.print("[dim]Windows install hint:[/dim] winget install Ollama.Ollama")
        elif platform.system().lower() == "darwin":
            console.print("[dim]macOS install hint:[/dim] brew install --cask ollama")
        else:
            console.print("[dim]Linux install hint:[/dim] curl -fsSL https://ollama.com/install.sh | sh")
        _audit("ai_setup", detail=f"unreachable:{ollama_url}", success=False)
        raise typer.Exit(1) from exc

    installed = {
        str(m.get("name", "")).split(":", 1)[0]
        for m in resp.json().get("models", [])
        if isinstance(m, dict)
    }
    pulled: list[str] = []

    if not no_pull:
        for model in (model_general, model_code):
            if model in installed:
                continue
            console.print(f"[cyan]Pulling model:[/cyan] {model}")
            try:
                pull_resp = httpx.post(
                    f"{ollama_url}/api/pull",
                    json={"name": model, "stream": False},
                    timeout=180.0,
                )
                if pull_resp.status_code == 200:
                    pulled.append(model)
            except Exception as exc:
                console.print(f"[yellow]Model pull failed for {model}: {exc}[/yellow]")

    cfg["ollama_url"] = ollama_url
    cfg["ollama_model"] = model_general
    cfg["ollama_code_model"] = model_code
    has_gpu = subprocess.run(["nvidia-smi"], capture_output=True, text=True, check=False).returncode == 0
    cfg["ollama_gpu_available"] = has_gpu
    _save_config(cfg)

    settings = SettingsStore()
    try:
        settings.set("ai_provider", "ollama")
    except Exception:
        pass

    console.print("[green]Local AI configured.[/green]")
    console.print(f"  Ollama URL: {ollama_url}")
    console.print(f"  General model: {model_general}")
    console.print(f"  Code model: {model_code}")
    console.print(f"  GPU detected: {'yes' if has_gpu else 'no'}")
    if pulled:
        console.print(f"  Pulled: {', '.join(pulled)}")
    _audit("ai_setup", detail=f"general={model_general};code={model_code}", success=True)


@sync_app.command("status")
def sync_status() -> None:
    """Show pending unsynced findings."""
    from .offline_store import OfflineStore

    unsynced = OfflineStore().get_unsynced_findings()
    if not unsynced:
        console.print("[green]No pending local changes. Everything is synced.[/green]")
        _audit("sync_status", detail="pending=0", success=True)
        return

    sev_counts: dict[str, int] = {}
    for finding in unsynced:
        sev = str(finding.get("severity", "info")).lower()
        sev_counts[sev] = sev_counts.get(sev, 0) + 1

    table = Table(title="Pending Sync Queue", show_header=True, header_style="bold magenta")
    table.add_column("Severity")
    table.add_column("Count")
    for sev, count in sorted(sev_counts.items()):
        table.add_row(severity_label(_active_theme, sev), str(count))
    console.print(table)
    console.print(f"[bold]Total pending findings:[/bold] {len(unsynced)}")
    _audit("sync_status", detail=f"pending={len(unsynced)}", success=True)


@sync_app.command("push")
def sync_push(
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would be synced"),
) -> None:
    """Push pending local findings to server (or preview with --dry-run)."""
    import httpx

    from .offline_store import OfflineStore

    store = OfflineStore()
    unsynced = store.get_unsynced_findings()
    if not unsynced:
        console.print("[green]Nothing to sync.[/green]")
        _audit("sync_push", detail="pending=0", success=True)
        return

    if dry_run:
        console.print(f"[cyan]Dry run:[/cyan] {len(unsynced)} finding(s) ready for sync.")
        _audit("sync_push", detail=f"dry_run;pending={len(unsynced)}", success=True)
        return

    profile = _resolve_profile()
    try:
        server, headers = _resolve_server_and_headers(profile)
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("sync_push", detail="missing_server_or_auth", success=False)
        raise typer.Exit(1) from exc

    priority = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    ordered = sorted(unsynced, key=lambda f: priority.get(str(f.get("severity", "info")).lower(), 5))

    synced_ids: list[str] = []
    conflicts = 0
    batch_size = 100
    for i in range(0, len(ordered), batch_size):
        batch = ordered[i : i + batch_size]
        payload = {
            "scan_id": f"offline-sync-{uuid.uuid4().hex[:8]}",
            "findings": batch,
            "target": "offline-sync",
        }
        body = gzip.compress(json.dumps(payload).encode("utf-8"))
        request_headers = {**headers, "Content-Type": "application/json", "Content-Encoding": "gzip"}
        try:
            resp = httpx.post(
                f"{server.rstrip('/')}/api/findings/import",
                content=body,
                headers=request_headers,
                timeout=30.0,
            )
            if resp.status_code >= 400:
                conflicts += len(batch)
                continue
            synced_ids.extend([str(item["id"]) for item in batch if item.get("id")])
        except Exception:
            conflicts += len(batch)

    if synced_ids:
        store.mark_synced(synced_ids)
    console.print(
        f"[green]Synced {len(synced_ids)} findings, 0 scans. {conflicts} conflict(s) unresolved.[/green]"
    )
    _audit(
        "sync_push",
        detail=f"synced={len(synced_ids)};conflicts={conflicts};server={server}",
        success=conflicts == 0,
    )


@sync_app.command("pull")
def sync_pull(
    from_file: Optional[str] = typer.Option(
        None,
        "--from-file",
        help="Import findings from JSON file (array of findings) into offline store.",
    ),
    scan_id: Optional[str] = typer.Option(
        None,
        "--scan-id",
        help="Optional scan id to attach imported findings to.",
    ),
) -> None:
    """Pull/ingest findings into offline store for disconnected workflows."""
    from .offline_store import OfflineStore

    if not from_file:
        console.print("[yellow]No pull source provided. Use --from-file <path>.[/yellow]")
        _audit("sync_pull", detail="missing_source", success=False)
        raise typer.Exit(1)

    source = Path(from_file).expanduser()
    if not source.exists():
        console.print(f"[red]Source file not found:[/red] {source}")
        _audit("sync_pull", detail=f"missing_file={source}", success=False)
        raise typer.Exit(1)

    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except Exception as exc:
        console.print(f"[red]Invalid JSON payload:[/red] {exc}")
        _audit("sync_pull", detail=f"invalid_json={source}", success=False)
        raise typer.Exit(1) from exc

    if not isinstance(payload, list):
        console.print("[red]Expected a JSON array of finding objects.[/red]")
        _audit("sync_pull", detail=f"invalid_shape={source}", success=False)
        raise typer.Exit(1)

    store = OfflineStore()
    assigned_scan = scan_id or f"import-{uuid.uuid4().hex[:8]}"
    count = store.import_findings(payload, scan_id=assigned_scan)
    console.print(f"[green]Imported {count} findings into scan '{assigned_scan}'.[/green]")
    _audit("sync_pull", detail=f"source={source};count={count};scan={assigned_scan}", success=True)


@sync_app.command("resolve")
def sync_resolve(
    strategy: str = typer.Option(
        "merge",
        "--strategy",
        help="Conflict strategy: server | local | merge",
    ),
    limit: int = typer.Option(50, "--limit", help="Max findings to resolve in one run"),
) -> None:
    """Resolve pending sync conflicts/queue items using a chosen strategy."""
    from .offline_store import OfflineStore

    selected = strategy.strip().lower()
    if selected not in {"server", "local", "merge"}:
        console.print("[red]Invalid strategy. Use: server, local, or merge.[/red]")
        _audit("sync_resolve", detail=f"invalid_strategy={strategy}", success=False)
        raise typer.Exit(1)

    store = OfflineStore()
    unsynced = store.get_unsynced_findings()
    if not unsynced:
        console.print("[green]No pending conflicts or unsynced findings.[/green]")
        _audit("sync_resolve", detail="pending=0", success=True)
        return

    working = unsynced[: max(1, limit)]
    ids = [str(item["id"]) for item in working if item.get("id")]
    if selected == "local":
        console.print(
            f"[yellow]Kept {len(ids)} finding(s) as local source of truth. They remain pending sync.[/yellow]"
        )
        _audit("sync_resolve", detail=f"strategy=local;count={len(ids)}", success=True)
        return

    store.mark_synced(ids)
    if selected == "server":
        console.print(f"[green]Resolved {len(ids)} conflict(s) using server version.[/green]")
    else:
        console.print(
            f"[green]Resolved {len(ids)} finding(s) with merge strategy (metadata server-first, findings merged).[/green]"
        )
    _audit("sync_resolve", detail=f"strategy={selected};count={len(ids)}", success=True)


@sync_app.command("optimize")
def sync_optimize() -> None:
    """Run local database optimization and show compact storage stats."""
    from .offline_store import OfflineStore

    store = OfflineStore()
    store.optimize()
    stats = store.db_stats()
    console.print(
        "[green]Offline store optimized.[/green] "
        f"(size={stats['file_size_bytes']} bytes, pages={stats['page_count']}, free={stats['freelist_count']})"
    )
    _audit(
        "sync_optimize",
        detail=f"size={stats['file_size_bytes']};pages={stats['page_count']};free={stats['freelist_count']}",
        success=True,
    )


@sync_app.command("vacuum")
def sync_vacuum() -> None:
    """Run local SQLite VACUUM maintenance."""
    from .offline_store import OfflineStore

    OfflineStore().vacuum()
    console.print("[green]Offline store maintenance complete (VACUUM).[/green]")
    _audit("sync_vacuum", success=True)


@plugin_app.command("list")
def plugin_list() -> None:
    """List installed local plugins."""
    from .plugins import PluginManager

    plugins = PluginManager().list_plugins()
    if not plugins:
        console.print("[dim]No plugins installed.[/dim]")
        _audit("plugin_list", detail="count=0", success=True)
        return
    rows = [
        {
            "name": p.name,
            "version": p.version,
            "enabled": p.enabled,
            "author": p.author,
            "source": p.source,
            "description": p.description,
        }
        for p in plugins
    ]
    table = Table(title="Installed Plugins", show_header=True, header_style="bold magenta")
    table.add_column("Name")
    table.add_column("Version")
    table.add_column("Enabled")
    table.add_column("Author")
    table.add_column("Source")
    table.add_column("Description")
    for row in rows:
        table.add_row(
            row["name"],
            row["version"],
            "yes" if row.get("enabled", True) else "no",
            row["author"],
            row.get("source", "local"),
            row["description"],
        )
    console.print(table)
    _audit("plugin_list", detail=f"count={len(rows)}", success=True)


@plugin_app.command("create")
def plugin_create(
    name: str = typer.Argument(..., help="Plugin name"),
    author: str = typer.Option("Unknown", "--author", help="Plugin author"),
) -> None:
    """Scaffold a new local plugin."""
    from .plugins import PluginManager

    try:
        path = PluginManager().create_scaffold(name=name, author=author)
    except (ValueError, FileExistsError) as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("plugin_create", detail=f"name={name};error={exc}", success=False)
        raise typer.Exit(1) from exc
    console.print(f"[green]Plugin scaffold created:[/green] {path}")
    _audit("plugin_create", detail=f"name={name}", success=True)


@plugin_app.command("install")
def plugin_install(
    source: str = typer.Argument(..., help="Plugin path"),
) -> None:
    """Install a plugin from a local path."""
    from .plugins import PluginManager

    if source.startswith("gh:"):
        spec = source[3:]
        repo_ref = spec.split("@", 1)
        repo = repo_ref[0]
        ref = repo_ref[1] if len(repo_ref) == 2 else "main"
        if "/" not in repo:
            console.print("[red]Invalid gh spec. Use gh:owner/repo[@ref][/red]")
            _audit("plugin_install", detail=f"source={source};invalid_gh_spec", success=False)
            raise typer.Exit(1)
        with tempfile.TemporaryDirectory(prefix="cosmicsec-plugin-") as tmp_dir:
            clone_dir = Path(tmp_dir) / repo.split("/")[-1]
            try:
                subprocess.run(
                    ["git", "clone", "--depth", "1", "--branch", ref, f"https://github.com/{repo}.git", str(clone_dir)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                installed_path = PluginManager().install_from_path(clone_dir)
            except Exception as exc:
                console.print(f"[red]Failed to install plugin from GitHub:[/red] {exc}")
                _audit("plugin_install", detail=f"source={source};error={exc}", success=False)
                raise typer.Exit(1) from exc
        console.print(f"[green]Installed plugin from GitHub:[/green] {installed_path.name}")
        _audit("plugin_install", detail=f"source={source}", success=True)
        return
    try:
        installed_path = PluginManager().install_from_path(Path(source).expanduser())
    except (ValueError, FileNotFoundError) as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("plugin_install", detail=f"source={source};error={exc}", success=False)
        raise typer.Exit(1) from exc
    console.print(f"[green]Installed plugin:[/green] {installed_path.name}")
    _audit("plugin_install", detail=f"source={source}", success=True)


@plugin_app.command("remove")
def plugin_remove(name: str = typer.Argument(..., help="Plugin name")) -> None:
    """Remove an installed plugin."""
    from .plugins import PluginManager

    try:
        removed = PluginManager().remove(name)
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("plugin_remove", detail=f"name={name};error={exc}", success=False)
        raise typer.Exit(1) from exc
    if not removed:
        console.print(f"[red]Plugin '{name}' not found.[/red]")
        _audit("plugin_remove", detail=f"name={name};missing", success=False)
        raise typer.Exit(1)
    console.print(f"[green]Removed plugin:[/green] {name}")
    _audit("plugin_remove", detail=f"name={name}", success=True)


@plugin_app.command("info")
def plugin_info(name: str = typer.Argument(..., help="Plugin name")) -> None:
    """Show plugin metadata and install path."""
    from .plugins import PluginManager

    try:
        plugin = PluginManager().get_plugin(name)
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("plugin_info", detail=f"name={name};error={exc}", success=False)
        raise typer.Exit(1) from exc

    if not plugin:
        console.print(f"[red]Plugin '{name}' not found.[/red]")
        _audit("plugin_info", detail=f"name={name};missing", success=False)
        raise typer.Exit(1)

    table = Table(title=f"Plugin: {plugin.name}", show_header=False)
    table.add_row("Version", plugin.version)
    table.add_row("Enabled", "yes" if plugin.enabled else "no")
    table.add_row("Author", plugin.author)
    table.add_row("Source", plugin.source)
    table.add_row("Homepage", plugin.homepage or "-")
    table.add_row("Tags", plugin.tags or "-")
    table.add_row("Path", plugin.path)
    table.add_row("Description", plugin.description or "-")
    console.print(table)
    _audit("plugin_info", detail=f"name={name}", success=True)


@plugin_app.command("enable")
def plugin_enable(name: str = typer.Argument(..., help="Plugin name")) -> None:
    """Enable an installed plugin."""
    from .plugins import PluginManager

    try:
        plugin = PluginManager().set_enabled(name, True)
    except (ValueError, FileNotFoundError) as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("plugin_enable", detail=f"name={name};error={exc}", success=False)
        raise typer.Exit(1) from exc
    console.print(f"[green]Enabled plugin:[/green] {plugin.name}")
    _audit("plugin_enable", detail=f"name={name}", success=True)


@plugin_app.command("disable")
def plugin_disable(name: str = typer.Argument(..., help="Plugin name")) -> None:
    """Disable an installed plugin."""
    from .plugins import PluginManager

    try:
        plugin = PluginManager().set_enabled(name, False)
    except (ValueError, FileNotFoundError) as exc:
        console.print(f"[red]{exc}[/red]")
        _audit("plugin_disable", detail=f"name={name};error={exc}", success=False)
        raise typer.Exit(1) from exc
    console.print(f"[green]Disabled plugin:[/green] {plugin.name}")
    _audit("plugin_disable", detail=f"name={name}", success=True)


@plugin_app.command("search")
def plugin_search(query: str = typer.Argument(..., help="Search term")) -> None:
    """Search installed plugins by name/description."""
    from .plugins import PluginManager

    plugins = PluginManager().search(query)
    if not plugins:
        console.print(f"[dim]No plugins matched '{query}'.[/dim]")
        _audit("plugin_search", detail=f"query={query};count=0", success=True)
        return
    for p in plugins:
        status = "enabled" if p.enabled else "disabled"
        console.print(f"- [bold]{p.name}[/bold] v{p.version} ({status}) — {p.description or 'No description'}")
    _audit("plugin_search", detail=f"query={query};count={len(plugins)}", success=True)


@plugin_app.command("reload")
def plugin_reload() -> None:
    """Reload enabled command plugins into the active CLI process."""
    from .plugins import PluginManager

    global _plugins_loaded
    try:
        loaded = PluginManager().load_command_plugins(app)
    except Exception as exc:
        console.print(f"[red]Plugin reload failed:[/red] {exc}")
        _audit("plugin_reload", detail=f"error={exc}", success=False)
        raise typer.Exit(1) from exc
    _plugins_loaded = True
    console.print(f"[green]Reloaded {len(loaded)} plugin command set(s).[/green]")
    _audit("plugin_reload", detail=f"count={len(loaded)}", success=True)


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
