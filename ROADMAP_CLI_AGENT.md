# CosmicSec CLI Agent — Dedicated Implementation Roadmap

### From Local Scanner to AI-Powered Security Command Center

> **Version**: 2.1 (2026-04-16) | **Parent Roadmap**: [`ROADMAP_NEXT.md`](./ROADMAP_NEXT.md)
> **Audience**: Human developers, AI coding agents (Copilot, Claude, Codex), project managers
> **Scope**: `cli/agent/` module, related SDK integration, server-side agent relay, AI-driven CLI workflows
> **Current State**: v0.3.0 — **hybrid dynamic/static execution engine + CA-1 security/auth foundation + CA-2 core UX wave implemented**, plus active CA-7/CA-8/CA-9/CA-10 tranche (branding/version polish, plugin framework commands, offline AI setup + sync commands, SQLite WAL/index/vacuum optimization, expanded `docs/cli/*`).

---

## How This Roadmap Relates to the Main Roadmap

This document is a **companion to [`ROADMAP_NEXT.md`](./ROADMAP_NEXT.md)** and dives deep into the CLI Agent vertical. It covers everything needed to transform the current basic `cosmicsec-agent` tool into a full-featured, AI-powered, interactive security command center — comparable to GitHub Copilot CLI, Gemini CLI, or OpenAI CLI.

### Cross-References to Main Roadmap Phases

| Main Phase | CLI Agent Relevance | This Doc Phase |
|------------|--------------------|----|
| **Phase K** (Security) | Agent must use secure auth, not raw API keys in config | CA-1 |
| **Phase L** (Persistence) | Agent relay must move from in-memory to DB-backed | CA-2 |
| **Phase N** (Dependencies) | Agent deps need upgrade (typer, rich, websockets) | CA-2 |
| **Phase Q** (AI/ML) | Local LLM support, AI-driven analysis in CLI | CA-4 |
| **Phase R** (Enterprise) | Multi-tenant agent registration, org-scoped scans | CA-6 |
| **Phase V** (DX/Polish) | CLI branding, help text, shell completions | CA-7 |

---

## Table of Contents

1. [Current State Audit](#current-state-audit)
2. [Vision — What the CLI Agent Should Become](#vision--what-the-cli-agent-should-become)
3. [Phase CA-1 — Security, Auth & Configuration Hardening](#phase-ca-1--security-auth--configuration-hardening)
4. [Phase CA-2 — Core CLI Overhaul & Modern UX](#phase-ca-2--core-cli-overhaul--modern-ux)
5. [Phase CA-3 — Interactive TUI Mode & Live Dashboards](#phase-ca-3--interactive-tui-mode--live-dashboards)
6. [Phase CA-4 — AI-Powered CLI Agent (Conversational Security)](#phase-ca-4--ai-powered-cli-agent-conversational-security)
7. [**Phase CA-4.5 — Hybrid Dynamic/Static Execution Engine** ✅](#phase-ca-45--hybrid-dynamicstatic-execution-engine-)
8. [Phase CA-5 — Advanced Scanning, Orchestration & Pipelines](#phase-ca-5--advanced-scanning-orchestration--pipelines)
9. [Phase CA-6 — Enterprise, Multi-Tenant & Team Features](#phase-ca-6--enterprise-multi-tenant--team-features)
10. [Phase CA-7 — Developer Experience, Branding & Distribution](#phase-ca-7--developer-experience-branding--distribution)
11. [Phase CA-8 — Plugin System, Extensibility & Marketplace](#phase-ca-8--plugin-system-extensibility--marketplace)
12. [Phase CA-9 — Offline-First Intelligence & Edge Computing](#phase-ca-9--offline-first-intelligence--edge-computing)
13. [Phase CA-10 — Performance, Cross-Platform & Rust Acceleration](#phase-ca-10--performance-cross-platform--rust-acceleration)
14. [Implementation Priority Matrix](#implementation-priority-matrix)
15. [Target CLI Architecture](#target-cli-architecture)
16. [New File & Directory Map](#new-file--directory-map)
17. [Summary — Before vs. After](#summary--before-vs-after)

---

## Current State Audit

### ✅ What Already Exists (v0.2.0)

| Component | File | Status | LOC |
|-----------|------|--------|-----|
| CLI entry point (Typer) | `cli/agent/cosmicsec_agent/main.py` | ✅ Working | 1000+ |
| Tool discovery (14 tools) | `cli/agent/cosmicsec_agent/tool_registry.py` | ✅ Enhanced | 290+ |
| **Hybrid execution engine** | `cli/agent/cosmicsec_agent/hybrid_engine.py` | ✅ **NEW** | 430+ |
| **AI task planner** | `cli/agent/cosmicsec_agent/ai_planner.py` | ✅ **NEW** | 480+ |
| **Intent parser (NL)** | `cli/agent/cosmicsec_agent/intent_parser.py` | ✅ **NEW** | 300+ |
| **Dynamic command resolver** | `cli/agent/cosmicsec_agent/dynamic_resolver.py` | ✅ **NEW** | 210+ |
| Async subprocess executor | `cli/agent/cosmicsec_agent/executor.py` | ✅ Working | 95 |
| SQLite offline store | `cli/agent/cosmicsec_agent/offline_store.py` | ✅ **Enhanced (CA-2)** | 290+ |
| Secure credential store | `cli/agent/cosmicsec_agent/credential_store.py` | ✅ **NEW (CA-1)** | 200+ |
| Auth flow manager | `cli/agent/cosmicsec_agent/auth.py` | ✅ **NEW (CA-1)** | 190+ |
| Profile/workspace store | `cli/agent/cosmicsec_agent/profiles.py` | ✅ **NEW (CA-1)** | 120+ |
| CLI audit store | `cli/agent/cosmicsec_agent/audit_log.py` | ✅ **NEW (CA-1)** | 130+ |
| **Output formatter** | `cli/agent/cosmicsec_agent/output.py` | ✅ **NEW (CA-2)** | 170+ |
| **Scan progress display** | `cli/agent/cosmicsec_agent/progress.py` | ✅ **NEW (CA-2)** | 230+ |
| **Settings/config store** | `cli/agent/cosmicsec_agent/config.py` | ✅ **NEW (CA-2)** | 190+ |
| WebSocket stream client | `cli/agent/cosmicsec_agent/stream.py` | ✅ Working | 131 |
| Nmap parser (XML + text) | `cli/agent/cosmicsec_agent/parsers/nmap_parser.py` | ✅ Working | 154 |
| Nikto parser | `cli/agent/cosmicsec_agent/parsers/nikto_parser.py` | ✅ Working | 92 |
| Nuclei parser (JSONL) | `cli/agent/cosmicsec_agent/parsers/nuclei_parser.py` | ✅ Working | 72 |
| Gobuster parser | `cli/agent/cosmicsec_agent/parsers/gobuster_parser.py` | ✅ Working | 80 |
| **Hybrid engine tests (42)** | `cli/agent/tests/test_hybrid_engine.py` | ✅ **NEW** | 320+ |
| **CA-1 security/auth tests (2)** | `cli/agent/tests/test_cli_security_phase_ca1.py` | ✅ **NEW** | 70+ |
| **CA-2 output/history/config tests (29)** | `cli/agent/tests/test_cli_phase_ca2.py` | ✅ **NEW** | 200+ |
| Server-side agent relay | `services/agent_relay/main.py` | ✅ Basic | ~200 |
| TypeScript Agent SDK | `sdk/typescript/src/agent.ts` | ✅ Basic | 72 |
| Go SDK agent methods | `sdk/go/client.go` | ✅ Basic | 220 |
| Python SDK | `sdk/python/cosmicsec_sdk/client.py` | ✅ Basic | 52 |
| Admin CLI (Typer) | `services/admin_service/cli.py` | ✅ Working | 271 |
| Admin TUI (Textual) | `services/admin_service/tui.py` | ⚠️ Stub | 20 |

### 🟢 What Changed from v0.2.1 → v0.3.0 (Phase CA-2)

| Change | Description |
|--------|-------------|
| **Output formatter** | `output.py` — table/json/yaml/csv/quiet with TTY auto-detect; used by history/config commands |
| **Scan progress** | `progress.py` — Rich Live UI with per-tool spinners, live findings counter, two-stage Ctrl+C cancel |
| **Scan history** | 6 new `history` subcommands: list/show/findings/diff/stats/delete |
| **Config management** | `config.py` + 5 `config` subcommands: get/set/list/reset/edit (TOML format) |
| **Shell completions** | `completions install/show` — generates shell scripts for bash/zsh/fish/powershell |
| **OfflineStore enhancements** | list_scans() with finding counts, search_findings() LIKE search, diff_scans(), stats(), delete_scan() |
| **73 passing tests** | 29 new tests for CA-2; total 73 tests across all modules |

### 🔴 Critical Gaps (Updated for v0.2.0)

| ID | Gap | Impact | Status |
|----|-----|--------|--------|
| CG-01 | ~~No authentication flow~~ → secure `CredentialStore` (keyring + AES-GCM fallback) with config migration | ~~Security vulnerability~~ | ✅ **Fixed** (v0.2.1) |
| CG-02 | ~~No `login` command~~ → `auth login/logout/status/refresh` + token refresh path | ~~Terrible UX~~ | ✅ **Fixed** (v0.2.1) |
| CG-03 | ~~No interactive/conversational mode~~ → **`run` command** accepts natural language | ~~Not competitive~~ | 🟡 Partial (v0.2.0) |
| CG-04 | ~~No AI integration~~ → **Hybrid engine** with OpenAI/Ollama/Cloud providers | ~~Missing differentiator~~ | 🟡 Partial (v0.2.0) |
| CG-05 | **No progress indicators during scans** — output only after completion | Bad UX for long-running tools | 🔴 Open |
| CG-06 | **No scan cancellation** — Ctrl+C kills the entire agent | No graceful abort | 🔴 Open |
| CG-07 | **No config management** — no `cosmicsec config set/get/list` | Must manually edit JSON | 🔴 Open |
| CG-08 | ~~Zero test coverage~~ → **42 tests** for hybrid engine | ~~No quality gates~~ | 🟡 Partial (v0.2.0) |
| CG-09 | **Agent relay uses in-memory dict** — all connections lost on restart | Data loss | 🔴 Open |
| CG-10 | **No shell completions** — no tab completion for commands or tool names | Missing standard feature | 🔴 Open |
| CG-11 | **No update mechanism** — no `cosmicsec update` or version checking | Manual updates only | 🔴 Open |
| CG-12 | ~~No profile/workspace support~~ → `profile list/add/use/delete/show` + global `--profile` | ~~Single-context only~~ | ✅ **Fixed** (v0.2.1) |
| CG-13 | ~~No output formatting options~~ → **OutputFormatter** (table/json/yaml/csv/quiet, TTY detect) | ~~Not scriptable~~ | ✅ **Fixed** (v0.3.0) |
| CG-14 | ~~No scan history~~ → **`history` commands** (list/show/findings/diff/stats/delete) | ~~Data not accessible~~ | ✅ **Fixed** (v0.3.0) |
| CG-15 | **Only 4 parsers** — 10 of 14 supported tools have no output parsing | Incomplete coverage | 🔴 Open |
| CG-16 | ~~Tool selection is static/registry-only~~ → **Hybrid dynamic/static engine** | ~~Not competitive with Copilot/Gemini CLI~~ | ✅ **Fixed** (v0.2.0) |

### 🟡 What Dependencies Already Exist

```toml
# cli/agent/pyproject.toml
typer>=0.12        # CLI framework (current: 0.12, latest: 0.24)
rich>=13           # Console output (current: 13, latest: 15)
websockets>=12     # WebSocket client
httpx>=0.27        # HTTP client (current: 0.27, latest: 0.28)
pydantic>=2.5      # Data validation
aiofiles>=23.0     # Async file I/O

# Root pyproject.toml (also available)
textual>=8.2.3     # TUI framework (for interactive mode)
openai>=2.31.0     # AI/LLM integration
```

---

## Vision — What the CLI Agent Should Become

```
cosmicsec — The AI-powered security command center for your terminal

┌─────────────────────────────────────────────────────────────────┐
│  $ cosmicsec                                                     │
│                                                                  │
│  🛡️  CosmicSec Security Agent v2.0.0                             │
│  Connected to: https://app.cosmicsec.io (org: AcmeCorp)         │
│  Agent: agent-7f3a • Tools: 8/14 available • Findings: 247      │
│                                                                  │
│  cosmicsec ❯ scan 192.168.1.0/24 --deep                         │
│  ⠋ Running nmap... 34% (127/384 hosts)                          │
│  ⠋ Running nuclei... queued                                     │
│                                                                  │
│  cosmicsec ❯ ask "are there any critical RCE vulnerabilities     │
│               in the latest scan?"                               │
│                                                                  │
│  🤖 Based on your scan of 192.168.1.0/24:                       │
│  Found 3 potential RCE vectors:                                  │
│  1. CVE-2024-1234 on 192.168.1.45:8080 (Apache Struts)         │
│  2. CVE-2024-5678 on 192.168.1.102:22 (OpenSSH < 9.6)          │
│  3. Deserialization issue on 192.168.1.200:8443 (Java RMI)      │
│                                                                  │
│  Recommended actions: [1] Patch  [2] Isolate  [3] Deep scan     │
│                                                                  │
│  cosmicsec ❯ report --format pdf --send team@acme.com           │
│  ✅ Report generated: scan-2026-04-15-deep.pdf (sent to team)   │
│                                                                  │
│  cosmicsec ❯ watch --dashboard                                   │
│  [Launches live TUI dashboard with real-time metrics]            │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Conversational by Default** — Like GitHub Copilot CLI: `cosmicsec ask "..."` for natural language
2. **Offline-First** — Full functionality without server; sync when connected
3. **Pipeline-Friendly** — `--json`, `--quiet`, `--no-color` for CI/CD integration
4. **Progressive Disclosure** — Simple commands for beginners, power flags for experts
5. **AI-Native** — Every finding can be explained, correlated, or actioned via LLM
6. **Secure by Design** — Encrypted credential storage, token rotation, audit logging
7. **Extensible** — Plugin system for custom tools, parsers, and workflows

---

## Phase CA-1 — Security, Auth & Configuration Hardening 🟢 IN PROGRESS (~80%)

> 🎯 **Goal**: Secure credential management, proper auth flow, encrypted config. After this phase, the CLI agent is safe for production use.
>
> 📋 **Prerequisites**: Main roadmap Phase K (server-side security hardening)
>
> 🌐 **Languages**: Python
>
> ⏱️ **Estimated Duration**: 1 week
>
> ✅ **CA-1 implementation wave completed 2026-04-16**:
> - Added `credential_store.py` with keyring-first storage and AES-256-GCM encrypted fallback file.
> - Added secure plaintext-config migration (`config.json` → `config.json.bak`) on startup.
> - Added `auth`, `profile`, and `audit` command groups in `main.py`.
> - Added `auth.py` and `profiles.py` with profile-scoped login/logout/status/refresh workflows.
> - Added `audit_log.py` and command-level audit event logging.
> - Added regression tests in `cli/agent/tests/test_cli_security_phase_ca1.py`.

**Completed in CA-1:**
- ✅ CA-1.1 — Secure Credential Store
- ✅ CA-1.2 — Login/Auth Commands (API key + token flow; OAuth device flow remains)
- ✅ CA-1.3 — Profile & Workspace Management
- ✅ CA-1.4 — Audit Logging + audit subcommands

**Remaining in CA-1 (~20%):**
- ⏳ Add full OAuth2 device/browser flow implementation
- ⏳ Expand auto-refresh coverage across every outbound API call path

### CA-1.1 — Secure Credential Store

**What to do**: Replace plaintext `config.json` with an encrypted credential store using the system keyring (via `keyring` library) with fallback to AES-256-GCM encrypted file.

**AI Agent Prompt**:
```
In cli/agent/cosmicsec_agent/, create a new module `credential_store.py`:

1. Primary storage: Use the `keyring` library to store tokens in the OS keyring
   (macOS Keychain, Windows Credential Locker, Linux Secret Service/KWallet).
   Service name: "cosmicsec-agent", username: profile name (default: "default").

2. Fallback: If keyring is unavailable (headless server, Docker),
   use AES-256-GCM encryption with a machine-derived key:
   - Key derivation: PBKDF2(machine_id + username, salt=random_32_bytes, iterations=600000)
   - Store encrypted blob at ~/.cosmicsec/credentials.enc
   - Store salt at ~/.cosmicsec/credentials.salt

3. CredentialStore class API:
   - store(profile: str, key: str, value: str) → None
   - retrieve(profile: str, key: str) → str | None
   - delete(profile: str, key: str) → None
   - list_profiles() → list[str]

4. Stored credentials: api_key, access_token, refresh_token, server_url, org_id

5. Migrate existing plaintext config.json on first run:
   - Read old config, store in new secure store, rename old file to config.json.bak

6. Add dependency: keyring>=25.0
```

**Files**:
- `cli/agent/cosmicsec_agent/credential_store.py` — NEW
- `cli/agent/pyproject.toml` — Add `keyring` dependency

---

### CA-1.2 — Login & Auth Commands

**What to do**: Add `cosmicsec login`, `cosmicsec logout`, `cosmicsec auth status`, and `cosmicsec auth refresh` commands with OAuth2 device flow and API key authentication.

**AI Agent Prompt**:
```
In cli/agent/cosmicsec_agent/main.py, add an auth command group:

1. cosmicsec login:
   - Interactive: prompt for server URL (with default), then offer two methods:
     a) API Key: prompt for key, validate with GET /api/health (auth header)
     b) Browser OAuth2: open browser for device auth flow, poll for token
   - Store credentials in CredentialStore
   - Display: "✅ Logged in as user@email.com (org: OrgName)"
   - Support --server, --api-key, --token flags for non-interactive use

2. cosmicsec logout:
   - Clear all stored credentials for current profile
   - Confirm with "Are you sure?" prompt (skip with --force)

3. cosmicsec auth status:
   - Show current auth state: logged in/out, server, user, org, token expiry
   - Check token validity with server (GET /api/auth/me)

4. cosmicsec auth refresh:
   - Refresh access token using stored refresh token
   - Update credential store

5. Auto-refresh middleware:
   - Before every API call, check if token expires within 5 minutes
   - If so, auto-refresh silently
   - If refresh fails, prompt for re-login

Add auth_app = typer.Typer() as subcommand group.
```

**Files**:
- `cli/agent/cosmicsec_agent/main.py` — Add auth commands
- `cli/agent/cosmicsec_agent/auth.py` — NEW: Auth flow logic
- `cli/agent/cosmicsec_agent/credential_store.py` — Wire in

---

### CA-1.3 — Profile & Workspace Management

**What to do**: Support multiple server profiles (like AWS CLI profiles or kubectl contexts) so users can switch between dev/staging/prod or multiple orgs.

**AI Agent Prompt**:
```
Add profile management to the CLI:

1. cosmicsec profile list — Show all profiles with active marker
2. cosmicsec profile add <name> — Interactive setup (server, auth)
3. cosmicsec profile use <name> — Switch active profile
4. cosmicsec profile delete <name> — Remove profile and credentials
5. cosmicsec profile show [name] — Show profile details (redact secrets)

Data model per profile:
{
  "name": str,
  "server_url": str,
  "org_id": str | None,
  "auth_method": "api_key" | "oauth2" | "token",
  "default_target": str | None,
  "default_output_format": "table" | "json" | "yaml",
  "created_at": str,
  "last_used_at": str
}

Profile config stored at ~/.cosmicsec/profiles.json (non-sensitive data only).
Credentials stored in CredentialStore keyed by profile name.
Global --profile flag on all commands to override active profile.
```

**Files**:
- `cli/agent/cosmicsec_agent/profiles.py` — NEW
- `cli/agent/cosmicsec_agent/main.py` — Add profile subcommands and `--profile` global option

---

### CA-1.4 — Audit Logging for CLI Actions

**What to do**: Log all CLI actions (scans, auth events, config changes) to a local audit trail for compliance and forensics.

**AI Agent Prompt**:
```
Create cli/agent/cosmicsec_agent/audit_log.py:

1. SQLite table `cli_audit_log`:
   - id (TEXT PRIMARY KEY), timestamp (TEXT), action (TEXT),
     profile (TEXT), target (TEXT), detail (TEXT), success (INTEGER)

2. Log entries for: login, logout, scan_start, scan_complete, connect,
   disconnect, export, config_change, profile_switch

3. Commands:
   - cosmicsec audit list [--limit N] [--since DATE] [--action TYPE]
   - cosmicsec audit export [--format json|csv] [--output FILE]
   - cosmicsec audit clear [--before DATE] [--force]

4. Automatic: Every command invocation logs to audit trail
   via a Typer callback decorator
```

**Files**:
- `cli/agent/cosmicsec_agent/audit_log.py` — NEW
- `cli/agent/cosmicsec_agent/main.py` — Add audit commands and callback

---

### 🧪 CA-1 Verification

```bash
# Credential security
cosmicsec login --server https://app.cosmicsec.io
cat ~/.cosmicsec/config.json  # Should NOT exist (or be migrated backup)
cosmicsec auth status          # Shows current auth state

# Profile management
cosmicsec profile add staging --server https://staging.cosmicsec.io
cosmicsec profile list         # Shows default + staging
cosmicsec profile use staging

# Audit
cosmicsec audit list --limit 5
```

---

## Phase CA-2 — Core CLI Overhaul & Modern UX 🟢 IN PROGRESS (~90%)

> 🎯 **Goal**: Transform the CLI from basic one-shot commands into a polished, modern experience with real-time feedback, output formatting, and scriptability.
>
> 📋 **Prerequisites**: Phase CA-1
>
> 🌐 **Languages**: Python
>
> ⏱️ **Estimated Duration**: 1–2 weeks
>
> ✅ **CA-2 implementation wave completed 2026-04-16**:
> - Added `output.py` with `OutputFormatter` class: table (Rich), json, yaml (pyyaml fallback), csv, quiet formats; TTY auto-detection; exit code constants; `set_formatter()`/`get_formatter()` singletons; wired into `history`, `config` and all new commands.
> - Added `progress.py` with `ScanProgressDisplay` Rich Live UI: per-tool spinners, overall progress bar, findings severity counter, two-stage Ctrl+C cancellation (`CancellationToken`), `run_tools_with_progress()` concurrent executor.
> - Enhanced `offline_store.py`: `list_scans()` (with finding count augmentation), `get_scan_with_findings()`, `search_findings()` (full-text LIKE across title/description/evidence), `diff_scans()`, `stats()`, `delete_scan()`.
> - Added `config.py`: `SettingsStore` TOML-based settings with `get/set/reset/list_all/edit`; 11 settings with defaults and descriptions; TOML serialization with inline comments.
> - Added `history` command group (6 commands: `list`, `show`, `findings`, `diff`, `stats`, `delete`) to `main.py`.
> - Added `config` command group (5 commands: `get`, `set`, `list`, `reset`, `edit`) to `main.py`.
> - Added `completions` command group (2 commands: `install`, `show`) to `main.py`.
> - Added 29 tests in `cli/agent/tests/test_cli_phase_ca2.py`.

**Completed in CA-2 (~90%):**
- ✅ CA-2.1 — `output.py` OutputFormatter (table/json/yaml/csv/quiet, TTY detect, exit codes)
- ✅ CA-2.2 — `progress.py` Rich Live scan progress + `run_tools_with_progress()` concurrent executor
- ✅ CA-2.3 — Scan history + findings search/diff/stats (`offline_store.py` + `history` commands)
- ✅ CA-2.4 — `config.py` TOML settings manager + `config` commands
- ✅ CA-2.5 — `completions install/show` shell completion script generator
- ✅ 2026-04-16 follow-up — global callback `--output/-o`, `--no-color`, `--verbose/-v` wired via `set_formatter()`
- ✅ 2026-04-16 follow-up — `scan` now executes through `run_tools_with_progress()` with `--parallel` control and persisted per-tool status/findings

**Remaining in CA-2 (~10%):**
- ⏳ `cosmicsec-agent shell` interactive REPL (CA-3 dependency)

### CA-2.1 — Global Output Formatting

**What to do**: Add `--output` / `-o` global flag supporting `table` (Rich), `json`, `yaml`, `csv`, and `quiet` formats. Every command that produces output must respect this flag.

**AI Agent Prompt**:
```
Add global output formatting to all commands:

1. Global options (via Typer callback):
   --output / -o : "table" | "json" | "yaml" | "csv" | "quiet" (default: table)
   --no-color : Disable Rich styling (for pipe/redirect)
   --verbose / -v : Increase verbosity (can stack: -vvv)

2. Create cli/agent/cosmicsec_agent/output.py:
   - OutputFormatter class with methods:
     - table(data, columns, title) — Rich table
     - json(data) — Pretty JSON to stdout
     - yaml(data) — YAML output (add pyyaml dep)
     - csv(data, columns) — CSV to stdout
     - quiet(data, key) — Single value only (for scripting)
   - Auto-detect TTY: if stdout is not a terminal, default to json

3. Wrap all existing commands to use OutputFormatter:
   - discover → supports all formats
   - status → supports all formats
   - scan → findings output in all formats
   - offline export → respects global format

4. Exit codes:
   - 0: Success
   - 1: General error
   - 2: Auth error
   - 3: Network error
   - 4: Tool not found
   - 5: Scan error (tool returned non-zero)
```

**Files**:
- `cli/agent/cosmicsec_agent/output.py` — NEW
- `cli/agent/cosmicsec_agent/main.py` — Wire global options
- `cli/agent/pyproject.toml` — Add `pyyaml` dependency

---

### CA-2.2 — Real-Time Scan Progress & Streaming Output

**What to do**: Replace the current "run and wait" scan model with real-time streaming output showing progress bars, live findings, and concurrent tool execution.

**AI Agent Prompt**:
```
Overhaul the scan command for real-time feedback:

1. Rich Live display during scans:
   - Overall progress bar (N of M tools)
   - Per-tool progress spinner with elapsed time
   - Live findings counter (grouped by severity)
   - Estimated time remaining (based on history)

2. Streaming executor:
   - Use the existing run_tool() async generator (executor.py)
   - Parse output lines in real-time (not just at end)
   - Display findings as they are discovered (not after completion)

3. Concurrent execution:
   - When --all is used, run up to 3 tools concurrently (configurable with --parallel N)
   - Show parallel progress for all running tools
   - Graceful scan cancellation with Ctrl+C:
     a) First Ctrl+C: cancel current tool, continue to next
     b) Second Ctrl+C within 2s: cancel all, save partial results
     c) Display "Scan interrupted. Partial results saved."

4. Scan summary at end:
   ┌──────────────────────────────────────────────┐
   │  Scan Complete — 192.168.1.0/24              │
   │  Duration: 4m 32s • Tools: 5/5 • Findings: 47│
   │  🔴 Critical: 3  🟠 High: 8  🟡 Medium: 15  │
   │  🔵 Low: 12  ⚪ Info: 9                       │
   │  Report: cosmicsec report --scan <scan-id>    │
   └──────────────────────────────────────────────┘
```

**Files**:
- `cli/agent/cosmicsec_agent/main.py` — Rewrite scan command
- `cli/agent/cosmicsec_agent/executor.py` — Add concurrent execution
- `cli/agent/cosmicsec_agent/progress.py` — NEW: Rich Live progress display

---

### CA-2.3 — Scan History, Search & Management

**What to do**: Add commands to list, search, view, compare, and delete previous scans and findings from the offline store.

**AI Agent Prompt**:
```
Add scan history management commands:

1. cosmicsec history list [--limit N] [--since DATE] [--tool NAME] [--target HOST]
   - Paginated list of past scans with status, tool, target, finding counts

2. cosmicsec history show <scan-id>
   - Full scan details + all findings in table format

3. cosmicsec history findings [--severity LEVEL] [--tool NAME] [--search TEXT]
   - Search across all findings with filters

4. cosmicsec history diff <scan-id-1> <scan-id-2>
   - Compare two scans: new findings, resolved findings, changed severity

5. cosmicsec history delete <scan-id> [--force]
   - Delete a scan and its findings

6. cosmicsec history stats
   - Aggregate stats: total scans, findings by severity, most common tools

Enhance OfflineStore with:
- Pagination support (LIMIT/OFFSET)
- Full-text search on findings (title, description, evidence)
- Scan comparison queries
- Aggregate statistics queries
```

**Files**:
- `cli/agent/cosmicsec_agent/main.py` — Add history commands
- `cli/agent/cosmicsec_agent/offline_store.py` — Add search/pagination/diff queries

---

### CA-2.4 — Configuration Management Command

**What to do**: Add a `cosmicsec config` subcommand for managing CLI settings without editing files.

**AI Agent Prompt**:
```
Add configuration management:

1. cosmicsec config set <key> <value>
2. cosmicsec config get <key>
3. cosmicsec config list — Show all settings
4. cosmicsec config reset [key] — Reset to defaults
5. cosmicsec config edit — Open config in $EDITOR

Configurable settings:
- default_output_format: table|json|yaml|csv (default: table)
- default_parallel: int (default: 3)
- scan_timeout: int seconds (default: 300)
- auto_sync: bool (default: true)
- color_theme: "default"|"monokai"|"solarized"|"minimal"
- log_level: debug|info|warning|error (default: info)
- proxy: HTTP proxy URL for all outbound connections
- tls_verify: bool (default: true)
- history_retention_days: int (default: 90)

Store in ~/.cosmicsec/settings.toml (human-editable TOML format)
```

**Files**:
- `cli/agent/cosmicsec_agent/config.py` — NEW: Settings management
- `cli/agent/cosmicsec_agent/main.py` — Add config commands

---

### CA-2.5 — Shell Completions & Help Improvements

**What to do**: Generate and install shell completions for Bash, Zsh, Fish, and PowerShell. Enhance help text with examples and rich formatting.

**AI Agent Prompt**:
```
Enhance shell integration:

1. cosmicsec completions install [--shell bash|zsh|fish|powershell]
   - Auto-detect current shell
   - Generate completion script via Typer
   - Install to appropriate location (~/.bashrc, ~/.zshrc, etc.)
   - Print instructions for manual installation

2. cosmicsec completions show [--shell SHELL]
   - Print completion script to stdout (for piping)

3. Enhance help text:
   - Add examples to every command docstring
   - Add "See also" references between related commands
   - Add ASCII art banner for top-level --help
   - Rich-formatted help panels with color
   - Version display: cosmicsec --version shows version + Python + OS info

4. Enable Typer's add_completion=True (currently False)
```

**Files**:
- `cli/agent/cosmicsec_agent/main.py` — Enable completions, enhance help

---

### 🧪 CA-2 Verification

```bash
# Output formatting
cosmicsec discover -o json | jq '.[] | .name'
cosmicsec scan -t 127.0.0.1 --tool nmap -o json | jq '.findings'
echo $?  # Check exit code

# Real-time scan
cosmicsec scan -t 192.168.1.1 --all --parallel 3
# → Should show live progress bars and streaming findings

# History
cosmicsec history list --limit 5
cosmicsec history show <scan-id>
cosmicsec history diff <id1> <id2>

# Completions
cosmicsec completions install --shell zsh
cosmicsec <TAB><TAB>  # Should show command completions
```

---

## Phase CA-3 — Interactive TUI Mode & Live Dashboards

> 🎯 **Goal**: Build a full interactive terminal UI using Textual for live dashboards, guided workflows, and visual security analysis — going far beyond what any competing CLI offers.
>
> 📋 **Prerequisites**: Phase CA-2
>
> 🌐 **Languages**: Python (Textual framework)
>
> ⏱️ **Estimated Duration**: 2–3 weeks

### CA-3.1 — Interactive REPL Mode

**What to do**: Add `cosmicsec shell` — a persistent interactive REPL with command history, auto-completion, syntax highlighting, and context awareness.

**AI Agent Prompt**:
```
Create cli/agent/cosmicsec_agent/repl.py:

1. cosmicsec shell — Enters interactive mode
   - Custom prompt: "cosmicsec ❯ " (with color based on auth state)
   - Command history (saved to ~/.cosmicsec/history)
   - Auto-completion for:
     - Command names and subcommands
     - Tool names (from discovered tools)
     - Target IPs/hosts (from scan history)
     - Flag names and values
   - Multi-line input support (for complex queries)
   - Built-in commands:
     - help, ?, h — Context-aware help
     - clear, cls — Clear screen
     - exit, quit, q — Exit REPL
     - !! — Repeat last command
     - !n — Repeat command n from history

2. Session context:
   - Track "current target" — set via `target 192.168.1.1`
   - Track "current scan" — automatically set after scan completes
   - Context-aware prompts: "cosmicsec [192.168.1.1] ❯"
   - Commands can omit --target if context is set

3. Output paging:
   - Large outputs automatically paged (like `less`)
   - Press 'q' to exit pager
```

**Files**:
- `cli/agent/cosmicsec_agent/repl.py` — NEW
- `cli/agent/cosmicsec_agent/main.py` — Add `shell` command

---

### CA-3.2 — Textual TUI Dashboard

**What to do**: Build a full-screen Textual TUI accessible via `cosmicsec dashboard` or `cosmicsec watch` that shows real-time security status.

**AI Agent Prompt**:
```
Create cli/agent/cosmicsec_agent/tui/ package:

1. Main dashboard (tui/app.py):
   ┌──────────────────────────────────────────────────────────┐
   │ CosmicSec Agent Dashboard           [Connected] 14:32:15 │
   ├──────────────────────┬───────────────────────────────────┤
   │  SECURITY OVERVIEW   │  RECENT ACTIVITY                  │
   │  ─────────────────   │  ─────────────────                │
   │  Score: 72/100 ██▓░  │  14:30 nmap scan complete (5 new) │
   │  Critical: 3   🔴    │  14:28 nuclei updated templates   │
   │  High: 8       🟠    │  14:25 finding synced to cloud    │
   │  Medium: 15    🟡    │  14:20 agent connected            │
   │  Low: 12       🔵    │                                   │
   │  Info: 9       ⚪    │                                   │
   ├──────────────────────┼───────────────────────────────────┤
   │  ACTIVE SCANS        │  TOP FINDINGS                     │
   │  ─────────────       │  ─────────────                    │
   │  nmap ████░░ 67%     │  CVE-2024-1234  Critical  RCE    │
   │  nuclei (queued)     │  CVE-2024-5678  High      SQLi   │
   │                      │  Open port 445  High      SMB    │
   ├──────────────────────┴───────────────────────────────────┤
   │  TOOLS: nmap ✅ nikto ✅ nuclei ✅ sqlmap ❌ gobuster ✅  │
   └──────────────────────────────────────────────────────────┘

2. Widgets:
   - SecurityScoreGauge — Animated score gauge
   - FindingSeverityBar — Stacked horizontal bar chart
   - ScanProgressWidget — Live scan progress with ETA
   - ActivityFeed — Scrolling activity log
   - ToolStatusBar — Tool availability indicators
   - FindingsTable — Sortable, filterable data table

3. Keybindings:
   - s: Start new scan (opens scan dialog)
   - f: Filter findings (severity, tool, date)
   - /: Search findings
   - r: Refresh data
   - e: Export current view
   - ?: Show help overlay
   - q: Quit dashboard

4. Auto-refresh: Poll offline store every 2 seconds for updates
5. WebSocket integration: Show real-time cloud events if connected
```

**Files**:
- `cli/agent/cosmicsec_agent/tui/__init__.py` — NEW
- `cli/agent/cosmicsec_agent/tui/app.py` — NEW: Main Textual app
- `cli/agent/cosmicsec_agent/tui/widgets.py` — NEW: Custom widgets
- `cli/agent/cosmicsec_agent/tui/screens.py` — NEW: Screen definitions
- `cli/agent/cosmicsec_agent/main.py` — Add `dashboard` and `watch` commands

---

### CA-3.3 — Guided Scan Wizard

**What to do**: Add `cosmicsec wizard` — an interactive step-by-step scan setup for beginners.

**AI Agent Prompt**:
```
Create cli/agent/cosmicsec_agent/wizard.py:

1. cosmicsec wizard — Launches interactive scan wizard:
   Step 1: "What do you want to scan?"
     - IP address / hostname / CIDR range (with validation)
     - URL (auto-detect web target)
     - "I'm not sure" → AI-assisted target discovery

   Step 2: "What type of scan?"
     - Quick (nmap fast scan + nuclei top-100)
     - Standard (nmap + nikto + nuclei + gobuster)
     - Deep (all tools, thorough, ~30min)
     - Custom (pick tools individually)
     - AI Recommended (based on target type)

   Step 3: "Additional options?"
     - Output format (table/json/pdf)
     - Schedule (now / cron expression)
     - Notify on completion (email / webhook)
     - Auto-report generation (yes/no)

   Step 4: Confirmation summary with estimated duration
     "Ready to scan 192.168.1.0/24 with 5 tools (~12 min). Proceed? [Y/n]"

   Step 5: Launch scan with progress display

2. Use Rich prompts + panels for beautiful step UI
3. Remember wizard choices as defaults for next run
```

**Files**:
- `cli/agent/cosmicsec_agent/wizard.py` — NEW
- `cli/agent/cosmicsec_agent/main.py` — Add `wizard` command

---

### 🧪 CA-3 Verification

```bash
# REPL
cosmicsec shell
cosmicsec ❯ target 192.168.1.1
cosmicsec [192.168.1.1] ❯ scan --tool nmap
cosmicsec [192.168.1.1] ❯ history list

# TUI Dashboard
cosmicsec dashboard  # Full-screen TUI

# Wizard
cosmicsec wizard     # Guided scan setup
```

---

## Phase CA-4 — AI-Powered CLI Agent (Conversational Security)

> 🎯 **Goal**: Integrate LLM capabilities (OpenAI, Ollama, Claude) into the CLI for natural language security analysis, conversational querying, and AI-driven recommendations. This is the core differentiator that makes CosmicSec CLI comparable to GitHub Copilot CLI and Gemini CLI.
>
> 📋 **Prerequisites**: Phase CA-2, Main roadmap Phase Q (AI/ML pipeline)
>
> 🌐 **Languages**: Python
>
> ⏱️ **Estimated Duration**: 2–3 weeks

### CA-4.1 — Natural Language Query Interface

**What to do**: Add `cosmicsec ask` — a conversational command that accepts natural language security questions and returns AI-generated analysis.

**AI Agent Prompt**:
```
Create cli/agent/cosmicsec_agent/ai.py:

1. cosmicsec ask "<question>" — Natural language interface:
   - Sends question + scan context to LLM
   - Context includes: recent findings, target info, tool results
   - Streams response token-by-token to terminal (Rich Live)
   - Supports follow-up questions (conversation memory within session)

   Examples:
   - cosmicsec ask "what are the most critical issues?"
   - cosmicsec ask "is this network PCI-DSS compliant?"
   - cosmicsec ask "explain CVE-2024-1234 and how to fix it"
   - cosmicsec ask "write a remediation plan for the latest scan"

2. LLM Provider abstraction:
   class LLMProvider(Protocol):
       async def chat(self, messages, stream=True) -> AsyncGenerator[str, None]: ...
       async def embed(self, text) -> list[float]: ...

   Implementations:
   - OpenAIProvider (openai>=2.31 — already in root deps)
   - OllamaProvider (HTTP API to local Ollama instance)
   - CosmicSecCloudProvider (proxy through server's AI service)

3. Provider selection:
   - cosmicsec config set ai.provider openai|ollama|cloud
   - cosmicsec config set ai.model gpt-4o|llama3.1|codellama
   - cosmicsec config set ai.ollama_url http://localhost:11434
   - Environment variable: COSMICSEC_AI_PROVIDER, OPENAI_API_KEY

4. System prompt:
   "You are CosmicSec Helix AI, an expert cybersecurity analyst.
    You have access to the user's scan results, finding data, and tool output.
    Provide specific, actionable security advice. Reference specific IPs, ports,
    CVEs, and findings when applicable."
```

**Files**:
- `cli/agent/cosmicsec_agent/ai.py` — NEW: AI provider abstraction and chat logic
- `cli/agent/cosmicsec_agent/main.py` — Add `ask` command

---

### CA-4.2 — AI-Powered Scan Analysis

**What to do**: Add `cosmicsec analyze` — automatically runs AI analysis on scan results with structured output.

**AI Agent Prompt**:
```
Add AI analysis commands:

1. cosmicsec analyze [scan-id] — AI analysis of scan results:
   - If no scan-id, analyze the most recent scan
   - Generates:
     a) Executive summary (2-3 sentences)
     b) Risk score (0-100) with breakdown
     c) Top 5 priority findings with explanations
     d) Attack path analysis (how findings chain together)
     e) Remediation plan (ordered by priority, with effort estimates)
   - Output in Rich panels with color-coded sections
   - Support --output json for API integration

2. cosmicsec explain <finding-id> — Deep-dive on a single finding:
   - What is this vulnerability?
   - How could an attacker exploit it?
   - What is the business impact?
   - How to fix it (with code examples when relevant)?
   - Related CVEs and references

3. cosmicsec correlate [--scan-id ID] — Finding correlation:
   - Cross-reference findings across multiple tools
   - Identify attack chains (e.g., open port → vulnerable service → known exploit)
   - Map to MITRE ATT&CK framework
   - Suggest additional scans based on current findings

4. cosmicsec suggest — AI recommendations:
   - Based on current findings and scan history
   - Suggest next scan targets, tools, or configurations
   - "Based on your findings, I recommend scanning 192.168.1.45
     with sqlmap — the open MySQL port may be vulnerable to injection."
```

**Files**:
- `cli/agent/cosmicsec_agent/ai.py` — Add analysis methods
- `cli/agent/cosmicsec_agent/main.py` — Add analyze, explain, correlate, suggest commands

---

### CA-4.3 — AI Chat Mode (Persistent Conversation)

**What to do**: Add `cosmicsec chat` — a persistent conversational mode where users can have extended dialogues with the AI about their security posture.

**AI Agent Prompt**:
```
Add persistent AI chat mode:

1. cosmicsec chat — Enters AI conversation mode:
   - Persistent conversation context (messages stored in memory)
   - Rich formatting: AI responses in panels, code in syntax-highlighted blocks
   - Slash commands within chat:
     /context — Show what data the AI can see
     /scan <target> — Run a scan mid-conversation
     /findings — Show current findings summary
     /export — Export conversation as markdown
     /model <name> — Switch AI model mid-conversation
     /clear — Clear conversation history
     /exit — Exit chat mode

2. Context injection:
   - AI automatically has access to:
     - All scan results from offline store
     - System information (OS, tools, network)
     - Conversation history
   - User can explicitly add context:
     /context add file:/path/to/config
     /context add url:https://target.com
     /context add text:"Additional context..."

3. Response streaming:
   - Token-by-token streaming display
   - Spinner during thinking time
   - Markdown rendering in terminal (headers, lists, code blocks, tables)

4. Conversation persistence:
   - Save conversations to ~/.cosmicsec/conversations/
   - cosmicsec chat --resume — Resume last conversation
   - cosmicsec chat --list — List saved conversations
   - cosmicsec chat --load <id> — Load specific conversation
```

**Files**:
- `cli/agent/cosmicsec_agent/chat.py` — NEW: Persistent chat mode
- `cli/agent/cosmicsec_agent/main.py` — Add `chat` command
- `cli/agent/cosmicsec_agent/ai.py` — Add conversation management

---

### CA-4.4 — AI-Generated Reports from CLI

**What to do**: Add `cosmicsec report` — generate professional security reports from CLI using AI.

**AI Agent Prompt**:
```
Add report generation commands:

1. cosmicsec report generate [scan-id] [--format md|html|pdf|json]:
   - Generate comprehensive security assessment report
   - Sections: Executive Summary, Methodology, Findings (by severity),
     Attack Surface Analysis, Risk Matrix, Remediation Plan, Appendix
   - AI-written narrative sections (not just data dumps)
   - Include charts/graphs in HTML/PDF (severity distribution, timeline)
   - Default output: ./reports/cosmicsec-report-YYYY-MM-DD.{ext}

2. cosmicsec report template list — Show available templates
3. cosmicsec report template use <name> — Set default template
4. cosmicsec report send <file> --to <email|webhook> — Distribute report

5. Templates:
   - executive — High-level summary for management
   - technical — Detailed findings for engineers
   - compliance — Mapped to frameworks (PCI-DSS, SOC2, etc.)
   - pentest — Bug bounty / pentest format
   - custom — User-defined template
```

**Files**:
- `cli/agent/cosmicsec_agent/reports.py` — NEW
- `cli/agent/cosmicsec_agent/main.py` — Add report commands
- `cli/agent/cosmicsec_agent/templates/` — NEW: Report templates

---

### 🧪 CA-4 Verification

```bash
# Natural language query
cosmicsec ask "what are my most critical vulnerabilities?"
cosmicsec ask "is port 445 open on any hosts?"

# Analysis
cosmicsec analyze --output json | jq '.risk_score'
cosmicsec explain <finding-id>
cosmicsec correlate

# Chat mode
cosmicsec chat
🤖 ❯ What should I scan first on 10.0.0.0/24?
🤖 ❯ /scan 10.0.0.1 --tool nmap
🤖 ❯ Analyze what we just found
🤖 ❯ /export

# Reports
cosmicsec report generate --format html
```

---

## Phase CA-4.5 — Hybrid Dynamic/Static Execution Engine ✅

> 🎯 **Goal**: Transform the CLI from a static, registry-only tool runner into a hybrid engine that combines AI-powered dynamic planning (like GitHub Copilot CLI, Gemini CLI, OpenAI CLI) with the reliable static tool registry — making CosmicSec competitive with leading AI CLI agents while maintaining offline reliability.
>
> ✅ **Status**: **IMPLEMENTED in v0.2.0** — This phase is complete. All components below are working and tested.
>
> 📋 **Prerequisites**: None (this was implemented early to establish the core architecture)
>
> 🌐 **Languages**: Python
>
> ⏱️ **Actual Duration**: Implemented in v0.2.0

### The Problem

The v0.1.0 agent had a critical limitation:

```
BEFORE (v0.1.0 — Static Only):
  User → picks a tool → registry finds it → runs it

  $ cosmicsec-agent scan --tool nmap --target 192.168.1.1
  # Only works with pre-registered tools
  # No natural language understanding
  # No AI-powered planning
  # Cannot chain operations
  # Cannot handle "check my project and run tests"
```

Modern CLI agents (GitHub Copilot CLI, Gemini CLI, OpenAI CLI) all use **dynamic AI-powered command planning**. Users describe what they want in natural language, and the AI determines what to run.

### The Solution — Hybrid Architecture

```
AFTER (v0.2.0 — Hybrid Dynamic/Static):

  ┌────────────────────────────────────────────────────────────┐
  │  User: "scan 192.168.1.1 with nmap then analyze results"  │
  └──────────────────────────┬─────────────────────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   Intent Parser    │  ← Rule-based NL parsing (STATIC)
                   │   (offline, fast)  │     Handles common patterns locally
                   └─────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
      confidence ≥ 0.8  confidence < 0.8  forced mode
              │              │              │
              ▼              ▼              │
     ┌────────────┐  ┌──────────────┐      │
     │ Static     │  │ AI Planner   │      │
     │ Plan       │  │ (OpenAI /    │◄─────┘
     │ Builder    │  │  Ollama /    │  ← LLM-powered planning (DYNAMIC)
     │            │  │  Cloud)      │     Handles arbitrary instructions
     └─────┬──────┘  └──────┬───────┘
           │                │
           │   ┌────────────┘
           │   │ (fallback if AI fails)
           ▼   ▼
     ┌─────────────────┐
     │  Execution Plan  │   Structured steps: tool_run, shell_cmd,
     │  (JSON)          │   ai_analysis, report, etc.
     └────────┬────────┘
              │
     ┌────────▼────────┐
     │ Dynamic Resolver │  ← Safety gate: allowlist, blocklist,
     │ (Security Gate)  │     secret detection, user confirmation
     └────────┬────────┘
              │
     ┌────────▼────────┐
     │ Hybrid Engine    │  ← Executes plan steps with progress display
     │ (Executor)       │     Respects dependencies and conditions
     └─────────────────┘
```

### CA-4.5.1 — Intent Parser (Rule-Based, Offline) ✅

**File**: `cli/agent/cosmicsec_agent/intent_parser.py`

The local intent parser is the **static** component — fast, deterministic, and works completely offline:

- **Intent categories**: SCAN, RECON, EXPLOIT, ANALYZE, REPORT, MONITOR, CONFIG, WORKFLOW, CUSTOM
- **Target extraction**: IPv4, CIDR, hostnames, URLs via regex
- **Tool name resolution**: 40+ aliases (e.g., "port scan" → nmap, "sql injection" → sqlmap)
- **Workflow detection**: Splits multi-step commands on "then", "and then", "after that", "followed by"
- **Intensity modifiers**: "quick", "deep", "thorough", "aggressive", "stealth"
- **Confidence scoring**: 0.0–1.0 based on how much context was extracted

```python
# Example: "deep scan 192.168.1.1 with nmap and nuclei"
ParsedIntent(
    category=IntentCategory.SCAN,
    targets=["192.168.1.1"],
    tools=["nmap", "nuclei"],
    flags={"depth": "thorough", "timeout": 1800},
    confidence=0.85,
)
```

---

### CA-4.5.2 — AI Task Planner (LLM-Powered, Dynamic) ✅

**File**: `cli/agent/cosmicsec_agent/ai_planner.py`

The AI planner is the **dynamic** component — handles arbitrary instructions via LLM:

- **Provider abstraction**: `LLMProvider` protocol with 3 implementations:
  - `OpenAIProvider` — GPT-4o/GPT-4-turbo via OpenAI API
  - `OllamaProvider` — Local LLMs (Llama 3.1, CodeLlama) via Ollama HTTP API
  - `CloudProvider` — CosmicSec cloud AI service proxy
- **Structured JSON output**: AI returns typed execution plans, not free text
- **Tool-aware prompting**: System prompt includes discovered tool capabilities
- **Provider cascade**: Tries each provider in order; falls back gracefully
- **Execution plan model**: Steps with types, dependencies, conditions, timeouts

```python
# Example AI-generated plan for: "check if the web app has SQL injection then report findings"
ExecutionPlan(
    source="hybrid-dynamic",
    confidence=0.85,
    steps=[
        ExecutionStep(id="step_1", step_type=StepType.TOOL_RUN, tool="sqlmap",
                      args=["--batch", "--risk=2"], target="http://example.com"),
        ExecutionStep(id="step_2", step_type=StepType.AI_ANALYSIS,
                      depends_on=["step_1"], description="Analyze SQL injection findings"),
        ExecutionStep(id="step_3", step_type=StepType.REPORT,
                      depends_on=["step_2"], metadata={"format": "html"}),
    ],
)
```

---

### CA-4.5.3 — Dynamic Command Resolver (Safety Gate) ✅

**File**: `cli/agent/cosmicsec_agent/dynamic_resolver.py`

Security boundary between AI-suggested actions and actual system execution:

- **Safe command allowlist**: 80+ commands (security tools, dev tools, system info)
- **Dangerous pattern blocklist**: rm -rf, fork bombs, pipe-to-shell, disk overwrite, sudo rm, etc.
- **Secret leak detection**: Warns when commands reference `$PASSWORD`, `$SECRET`, `$API_KEY`, etc.
- **Registered tool fast-path**: Tools from ToolRegistry get safety_score=1.0 (fully trusted)
- **Capability-based resolution**: Find best tool for a capability ("port_scan" → nmap)

```python
# Blocked: rm -rf /
resolver.resolve("rm", ["-rf", "/"])
# → ResolvedCommand(safety_score=0.0, warnings=["Blocked: matches dangerous pattern..."])

# Trusted: registered tool
resolver.resolve("nmap", ["-sV", "192.168.1.1"])
# → ResolvedCommand(safety_score=1.0, is_registered_tool=True, path="/usr/bin/nmap")
```

---

### CA-4.5.4 — Hybrid Execution Engine ✅

**File**: `cli/agent/cosmicsec_agent/hybrid_engine.py`

The unified execution engine that ties everything together:

- **Three modes**: `static` (registry-only), `dynamic` (AI-only), `hybrid` (AI + static fallback)
- **Plan → Resolve → Execute**: Structured pipeline with safety validation at every step
- **Dependency resolution**: Steps can depend on previous steps
- **Conditional execution**: Steps can have conditions (e.g., "only if findings > 0")
- **Rich progress display**: Real-time progress with spinners and status icons
- **Result aggregation**: Collects all findings, outputs, and metadata across steps

---

### CA-4.5.5 — Enhanced Tool Registry ✅

**File**: `cli/agent/cosmicsec_agent/tool_registry.py` (enhanced)

Extended with richer metadata for AI planner context:

- **Categories**: recon, web, vuln, exploit, custom
- **Descriptions**: Human-readable tool descriptions
- **Default arguments**: Sensible defaults per tool
- **Dynamic registration**: `register_dynamic()` for plugins/AI-discovered tools
- **Capability-based lookup**: `find_by_capability()` and `find_by_category()`
- **AI context export**: `to_ai_context()` formats tool data for LLM prompts

---

### CA-4.5.6 — New CLI Commands ✅

**File**: `cli/agent/cosmicsec_agent/main.py` (enhanced)

New commands added:

| Command | Description |
|---------|-------------|
| `cosmicsec-agent run "<instruction>"` | Execute natural language instruction via hybrid engine |
| `cosmicsec-agent plan "<instruction>"` | Preview execution plan without running |
| `cosmicsec-agent mode show` | Show current default execution mode |
| `cosmicsec-agent mode set <mode>` | Set default execution mode (static/dynamic/hybrid) |

```bash
# Natural language execution (HYBRID — the new way)
cosmicsec-agent run "scan 192.168.1.1 with nmap then analyze the results"

# Preview what would happen
cosmicsec-agent plan "deep scan 10.0.0.0/24 with all tools" --output-format json

# Force static mode (no AI, pure registry)
cosmicsec-agent run "scan 192.168.1.1 with nmap" --mode static

# Force dynamic mode (AI-only planning)
cosmicsec-agent run "check my web app for vulnerabilities" --mode dynamic

# Dry run (plan only, no execution)
cosmicsec-agent run "full security audit of example.com" --dry-run

# Set default mode
cosmicsec-agent mode set hybrid
```

---

### CA-4.5.7 — Test Suite (42 Tests) ✅

**File**: `cli/agent/tests/test_hybrid_engine.py`

Comprehensive test coverage for the hybrid engine:

| Test Class | Tests | Coverage |
|-----------|-------|----------|
| `TestLocalIntentParser` | 15 | Intent classification, target extraction, tool mapping, workflows, confidence |
| `TestDynamicResolver` | 8 | Safety validation, blocklist, allowlist, capability resolution, secret detection |
| `TestAITaskPlanner` | 8 | Static planning, workflow planning, serialization, provider fallback |
| `TestHybridEngine` | 7 | Mode creation, planning, dry-run, context building |
| `TestExecutionModels` | 4 | Step/Plan serialization, enum values |

---

### 🧪 CA-4.5 Verification ✅

```bash
# Install the agent
cd cli/agent && pip install -e .

# Run all 42 tests
python -m pytest tests/test_hybrid_engine.py -v
# → 42 passed ✅

# Lint check
ruff check .
# → All checks passed ✅

# Try the new commands
cosmicsec-agent run "scan 192.168.1.1 with nmap" --dry-run
cosmicsec-agent plan "check for SQL injection on example.com"
cosmicsec-agent mode show
cosmicsec-agent mode set hybrid
```

### How Hybrid Mode Compares to Competitors

| Feature | CosmicSec Agent v0.2.0 | GitHub Copilot CLI | Gemini CLI | OpenAI CLI |
|---------|----------------------|-------------------|-----------|-----------|
| Natural language input | ✅ `run` command | ✅ `??` prefix | ✅ Conversational | ✅ Conversational |
| Static tool registry | ✅ 14 security tools | ❌ | ❌ | ❌ |
| Hybrid static/dynamic | ✅ **Unique** | ❌ Dynamic only | ❌ Dynamic only | ❌ Dynamic only |
| Offline operation | ✅ Static mode + Ollama | ❌ Requires API | ❌ Requires API | ❌ Requires API |
| Safety validation | ✅ Allowlist + blocklist | ⚠️ User confirmation | ⚠️ User confirmation | ⚠️ User confirmation |
| Multi-step workflows | ✅ "then" chaining | ❌ Single command | ⚠️ Limited | ⚠️ Limited |
| Execution plan preview | ✅ `plan` command | ❌ | ❌ | ❌ |
| Security-domain focused | ✅ Built for security | ❌ General purpose | ❌ General purpose | ❌ General purpose |
| Provider flexibility | ✅ OpenAI/Ollama/Cloud | ❌ GitHub AI only | ❌ Gemini only | ❌ OpenAI only |

---

## Phase CA-5 — Advanced Scanning, Orchestration & Pipelines

> 🎯 **Goal**: Evolve from single-tool execution to multi-tool orchestration with scan workflows, scheduling, CI/CD pipeline integration, and automated scan chaining.
>
> 📋 **Prerequisites**: Phase CA-2
>
> 🌐 **Languages**: Python, YAML
>
> ⏱️ **Estimated Duration**: 2 weeks

### CA-5.1 — Scan Workflow Engine (YAML Pipelines)

**What to do**: Define reusable scan workflows as YAML files (like GitHub Actions for security scanning).

**AI Agent Prompt**:
```
Create cli/agent/cosmicsec_agent/workflows.py:

1. Scan workflow YAML format:
   # ~/.cosmicsec/workflows/full-audit.yaml
   name: Full Security Audit
   description: Comprehensive scan of web application
   version: 1.0
   
   variables:
     target: ${TARGET}
     output_dir: ./reports/${DATE}
   
   stages:
     - name: reconnaissance
       parallel: true
       tools:
         - tool: nmap
           flags: "-sV -sC -O"
           timeout: 600
         - tool: gobuster
           flags: "dir -w /usr/share/wordlists/common.txt"
           timeout: 300
   
     - name: vulnerability-scan
       depends_on: [reconnaissance]
       condition: "findings.count > 0"
       tools:
         - tool: nuclei
           flags: "-severity critical,high"
         - tool: nikto
   
     - name: deep-analysis
       depends_on: [vulnerability-scan]
       condition: "findings.severity.critical > 0"
       tools:
         - tool: sqlmap
           flags: "--batch --risk=2"
           targets_from: "findings[tool=nmap][port=80,443,8080]"
   
     - name: report
       depends_on: [deep-analysis]
       actions:
         - generate_report:
             format: html
             template: technical
         - notify:
             webhook: ${WEBHOOK_URL}

2. Commands:
   - cosmicsec workflow run <file.yaml> [--var KEY=VALUE]
   - cosmicsec workflow list — List saved workflows
   - cosmicsec workflow validate <file.yaml> — Check YAML syntax
   - cosmicsec workflow create — Interactive workflow builder

3. Built-in workflows (bundled):
   - quick-audit.yaml — Fast scan with nmap + nuclei
   - web-app-scan.yaml — Full web application audit
   - network-sweep.yaml — Network-wide discovery + vuln scan
   - compliance-check.yaml — PCI-DSS/SOC2 focused scan
```

**Files**:
- `cli/agent/cosmicsec_agent/workflows.py` — NEW: Workflow engine
- `cli/agent/cosmicsec_agent/workflows/` — NEW: Built-in workflow YAML files
- `cli/agent/cosmicsec_agent/main.py` — Add workflow commands

---

### CA-5.2 — Scan Scheduling & Cron Jobs

**What to do**: Add `cosmicsec schedule` for recurring scans.

**AI Agent Prompt**:
```
Add scan scheduling:

1. cosmicsec schedule add --cron "0 2 * * 1" --workflow full-audit.yaml --var TARGET=10.0.0.0/24
2. cosmicsec schedule list — Show all scheduled scans
3. cosmicsec schedule delete <id>
4. cosmicsec schedule run-pending — Execute any due scheduled scans

Implementation:
- Store schedules in SQLite (offline_store)
- Support cron expressions and interval syntax ("every 6h", "daily at 2am")
- cosmicsec schedule daemon — Run as background process watching for due jobs
- On scan completion: auto-diff with previous run, alert on new critical findings
```

**Files**:
- `cli/agent/cosmicsec_agent/scheduler.py` — NEW
- `cli/agent/cosmicsec_agent/main.py` — Add schedule commands

---

### CA-5.3 — CI/CD Pipeline Integration

**What to do**: Make the CLI a first-class CI/CD tool with exit codes, SARIF output, and gate enforcement.

**AI Agent Prompt**:
```
Add CI/CD integration features:

1. cosmicsec ci scan --target <TARGET> --fail-on critical,high
   - Run scan in CI mode (no interactive prompts, machine-readable output)
   - Exit code based on finding severities:
     - 0: No findings above threshold
     - 1: Findings above threshold (fail the build)
   - SARIF output: --format sarif (for GitHub Security tab integration)
   - JUnit XML output: --format junit (for CI test reporting)

2. cosmicsec ci gate --policy <policy.yaml>
   - Policy-as-code enforcement
   - Example policy:
     max_critical: 0
     max_high: 5
     required_tools: [nmap, nuclei]
     max_scan_age_hours: 24

3. cosmicsec ci diff --baseline <scan-id> --current <scan-id>
   - Report only NEW findings since baseline
   - Useful for PR-gated security scanning

4. GitHub Actions integration:
   # .github/workflows/security.yml
   - uses: cosmicsec/scan-action@v1
     with:
       target: ${{ env.TARGET }}
       fail-on: critical
       api-key: ${{ secrets.COSMICSEC_API_KEY }}
```

**Files**:
- `cli/agent/cosmicsec_agent/ci.py` — NEW: CI/CD integration
- `cli/agent/cosmicsec_agent/sarif.py` — NEW: SARIF format output
- `cli/agent/cosmicsec_agent/main.py` — Add `ci` subcommand group

---

### CA-5.4 — Additional Tool Parsers

**What to do**: Add parsers for the remaining 10 tools that currently have no output parsing.

**AI Agent Prompt**:
```
Add parsers for all remaining tools in cli/agent/cosmicsec_agent/parsers/:

1. sqlmap_parser.py — Parse sqlmap output for SQL injection findings
2. ffuf_parser.py — Parse ffuf JSON output for fuzzing results
3. masscan_parser.py — Parse masscan output (JSON/list format)
4. wpscan_parser.py — Parse wpscan JSON output for WordPress vulns
5. hydra_parser.py — Parse hydra output for brute force results
6. hashcat_parser.py — Parse hashcat output for cracked hashes
7. john_parser.py — Parse john output for cracked passwords
8. metasploit_parser.py — Parse msfconsole output for exploit results
9. zaproxy_parser.py — Parse ZAP JSON/XML report format
10. burpsuite_parser.py — Parse Burp Suite XML export

Each parser must:
- Follow the existing parser pattern (parse(output) → list[dict])
- Output normalized findings with: title, severity, description, evidence, tool, target, timestamp
- Handle both success and error cases gracefully
- Include docstring with example input/output
```

**Files**:
- `cli/agent/cosmicsec_agent/parsers/` — 10 new parser files
- `cli/agent/cosmicsec_agent/parsers/__init__.py` — Export all parsers
- `cli/agent/cosmicsec_agent/main.py` — Wire new parsers into scan command

---

### 🧪 CA-5 Verification

```bash
# Workflow
cosmicsec workflow validate workflows/full-audit.yaml
cosmicsec workflow run workflows/quick-audit.yaml --var TARGET=192.168.1.1

# Scheduling
cosmicsec schedule add --cron "0 2 * * *" --workflow quick-audit.yaml

# CI/CD
cosmicsec ci scan --target 192.168.1.1 --fail-on critical --format sarif
echo $?  # 0 if no criticals, 1 if criticals found
```

---

## Phase CA-6 — Enterprise, Multi-Tenant & Team Features

> 🎯 **Goal**: Add organization management, team collaboration, and role-based access directly from the CLI.
>
> 📋 **Prerequisites**: Phase CA-1, Main roadmap Phase R (Enterprise)
>
> 🌐 **Languages**: Python
>
> ⏱️ **Estimated Duration**: 1–2 weeks

### CA-6.1 — Organization & Team Management

**AI Agent Prompt**:
```
Add organization management commands:

1. cosmicsec org list — List user's organizations
2. cosmicsec org switch <org-id> — Switch active organization
3. cosmicsec org members — List org members and roles
4. cosmicsec org invite <email> --role analyst|viewer|admin
5. cosmicsec org api-keys — Manage org API keys
   - cosmicsec org api-keys create --name "CI/CD Key" --scope scans:read,scans:write
   - cosmicsec org api-keys list
   - cosmicsec org api-keys revoke <key-id>

All commands proxy to server REST API with proper auth headers.
```

---

### CA-6.2 — Shared Scan Results & Collaboration

**AI Agent Prompt**:
```
Add collaboration features:

1. cosmicsec share <scan-id> --team — Push local scan to server for team visibility
2. cosmicsec pull [--since DATE] — Pull latest team scan results to local store
3. cosmicsec findings annotate <finding-id> --note "False positive: test env"
4. cosmicsec findings assign <finding-id> --to user@email.com
5. cosmicsec findings status <finding-id> --set open|in-progress|resolved|false-positive
```

---

### 🧪 CA-6 Verification

```bash
cosmicsec org list
cosmicsec org switch org-123
cosmicsec share <scan-id> --team
cosmicsec pull --since 2026-04-01
```

---

## Phase CA-7 — Developer Experience, Branding & Distribution 🟢 IN PROGRESS (~76%)

> 🎯 **Goal**: Polish the CLI for release — branded experience, professional packaging, comprehensive documentation, and easy installation.
>
> 📋 **Prerequisites**: Phases CA-1 through CA-4
>
> 🌐 **Languages**: Python, Markdown, YAML
>
> ⏱️ **Estimated Duration**: 1–2 weeks

> ✅ **CA-7.3 partial complete 2026-04-16**: Added dedicated CLI docs entry points: `cli/agent/README.md` and `docs/cli/getting-started.md`.
>
> ✅ **CA-7 tranche update 2026-04-16**:
> - Added CLI branding/version improvements: `cosmicsec-agent --version` and `cosmicsec-agent version` with runtime metadata.
> - Added `cosmicsec-agent update` / `cosmicsec-agent update --check` command path (PyPI metadata + upgrade flow).
> - Added theme-aware severity formatting + startup banner plumbing (`branding.py`, `main.py`).
> - Added command alias entry point `cosmicsec` in `cli/agent/pyproject.toml`.
> - Expanded CLI docs set: `docs/cli/authentication.md`, `scanning.md`, `ai-features.md`, `workflows.md`, `ci-cd.md`, `plugins.md`, `troubleshooting.md`.
> - Added CA-8/9/10 tranche regression tests and updated async test execution compatibility for modern Python runtime behavior.
>
> ✅ **CA-7.1 theme UX tranche 2026-04-16**:
> - Added dedicated `theme` command group (`theme list`, `theme set`, `theme preview`) for direct theme discovery and preview UX.
> - Added canonical theme resolution helpers (`canonical_theme`, `available_themes`) and branding utility tests (`tests/test_branding.py`).

**Completed:**
- ✅ `cli/agent/README.md` — dedicated agent quick start, command workflows, configuration, and troubleshooting
- ✅ `docs/cli/getting-started.md` — first-scan setup guide
- ✅ `docs/cli/*.md` expanded documentation set (auth/scanning/AI/workflows/CI-CD/plugins/troubleshooting)
- ✅ `cosmicsec` alias entry point in package scripts
- ✅ `update` and `update --check` command path in CLI
- ✅ Theme-aware severity formatting and branded startup/version output
- ✅ Theme customization commands (`theme list/set/preview`) with canonical alias handling and preview rendering
- ✅ CLI test suite stable on current environment (`pytest cli/agent/tests` → 83 passed)

**Remaining (~24%):**
- ⏳ CA-7.2 — distribution channels (Homebrew/standalone binaries; update command now partially implemented)
- ⏳ CA-7.3 remaining docs (screenshots/examples/man-page generation)
- ⏳ CA-7.4 — comprehensive CLI test expansion to 90%+ coverage

### CA-7.1 — Branding & Visual Identity

**AI Agent Prompt**:
```
Add professional branding to the CLI:

1. ASCII art banner (shown on first run and --help):
   ┌─────────────────────────────────────────┐
   │   ██████╗ ██████╗ ███████╗███╗   ███╗  │
   │  ██╔════╝██╔═══██╗██╔════╝████╗ ████║  │
   │  ██║     ██║   ██║███████╗██╔████╔██║  │
   │  ██║     ██║   ██║╚════██║██║╚██╔╝██║  │
   │  ╚██████╗╚██████╔╝███████║██║ ╚═╝ ██║  │
   │   ╚═════╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝  │
   │           CosmicSec Security Agent       │
   └─────────────────────────────────────────┘

2. Color themes:
   - default: Cyan/magenta (current Rich theme)
   - dark: Blue/white on dark backgrounds
   - light: Dark blue/purple on light backgrounds
   - minimal: No colors (for accessibility)
   - neon: Green/pink cyberpunk aesthetic

3. Severity color scheme (consistent everywhere):
   - Critical: bold red + 🔴
   - High: red + 🟠
   - Medium: yellow + 🟡
   - Low: blue + 🔵
   - Info: dim/gray + ⚪

4. Version display:
   cosmicsec --version
   → "CosmicSec Agent v2.0.0 (Python 3.13, Linux x86_64)"
```

---

### CA-7.2 — Installation & Distribution

**AI Agent Prompt**:
```
Set up multiple installation methods:

1. PyPI (pip install cosmicsec):
   - Publish to PyPI with proper metadata
   - Entry point: cosmicsec = cosmicsec_agent.main:app
   - Include all built-in workflows and templates

2. Homebrew (macOS/Linux):
   - Create homebrew formula: brew install cosmicsec
   - Tap: cosmicsec/tap

3. Docker:
   - docker run cosmicsec/agent scan --target 192.168.1.1
   - Dockerfile in cli/agent/

4. Standalone binary (PyInstaller/Nuitka):
   - Single-file executables for Linux, macOS, Windows
   - GitHub Releases with auto-built binaries

5. Self-update:
   - cosmicsec update — Check for and install updates
   - cosmicsec update --check — Just check, don't install
   - Auto-update notification (once per day, non-blocking)
```

---

### CA-7.3 — Documentation & Examples

**AI Agent Prompt**:
```
Create comprehensive CLI documentation:

1. cli/agent/README.md — Rewrite with:
   - Quick start (3 commands to first scan)
   - Feature showcase with terminal screenshots
   - Full command reference
   - Configuration guide
   - AI integration guide
   - CI/CD integration examples
   - Troubleshooting FAQ

2. docs/cli/ — Detailed documentation:
   - docs/cli/getting-started.md
   - docs/cli/authentication.md
   - docs/cli/scanning.md
   - docs/cli/ai-features.md
   - docs/cli/workflows.md
   - docs/cli/ci-cd.md
   - docs/cli/plugins.md
   - docs/cli/troubleshooting.md

3. Man page generation:
   - Auto-generate man pages from Typer command definitions
   - Install via: cosmicsec completions install-man
```

---

### CA-7.4 — Comprehensive Test Suite

**AI Agent Prompt**:
```
Create full test coverage for CLI agent:

1. Unit tests (cli/agent/tests/):
   - test_credential_store.py — Encryption, keyring, migration
   - test_tool_registry.py — Discovery, version probing
   - test_executor.py — Subprocess execution, timeout, cancellation
   - test_offline_store.py — CRUD, search, pagination, export
   - test_parsers.py — All 14 parsers with sample output
   - test_output.py — All output formatters
   - test_config.py — Settings management
   - test_workflows.py — YAML parsing, execution order, conditions
   - test_ai.py — Provider abstraction, prompt generation
   - test_profiles.py — Profile CRUD, switching
   - test_audit_log.py — Logging, search, export

2. Integration tests:
   - test_scan_flow.py — End-to-end scan with mock tools
   - test_connect_flow.py — WebSocket connection with mock server
   - test_ci_mode.py — CI/CD mode with exit codes and SARIF

3. Use pytest + pytest-asyncio + pytest-mock
4. Target: 90%+ code coverage
5. Add to CI: pytest cli/agent/tests/ -v --cov=cosmicsec_agent
```

**Files**:
- `cli/agent/tests/` — All test files
- `cli/agent/pyproject.toml` — Add test dependencies

---

### 🧪 CA-7 Verification

```bash
# Installation
pip install -e cli/agent/
cosmicsec --version
cosmicsec --help  # Shows branded banner

# Tests
cd cli/agent && pytest tests/ -v --cov=cosmicsec_agent
# → 90%+ coverage

# Documentation
ls docs/cli/
```

---

## Phase CA-8 — Plugin System, Extensibility & Marketplace 🟢 IN PROGRESS (~40%)

> 🎯 **Goal**: Allow users to extend the CLI with custom tools, parsers, and workflows without modifying the core codebase.
>
> 📋 **Prerequisites**: Phase CA-5
>
> 🌐 **Languages**: Python
>
> ⏱️ **Estimated Duration**: 1–2 weeks
>
> ✅ **CA-8.1 partial complete 2026-04-16**: Added local plugin framework and command surface. `plugins.py` introduces plugin metadata parsing/scaffold/install/remove/search; `main.py` now includes `plugin create/install/list/remove/search`; coverage added in `cli/agent/tests/test_cli_phase_ca8_ca9_ca10.py`.

### CA-8.1 — CLI Plugin Framework

**AI Agent Prompt**:
```
Create a plugin system for the CLI:

1. Plugin structure:
   ~/.cosmicsec/plugins/<plugin-name>/
   ├── plugin.yaml          # Metadata: name, version, author, description
   ├── __init__.py          # Entry point
   ├── parser.py            # Optional: custom tool parser
   └── commands.py          # Optional: additional CLI commands

2. Plugin types:
   a) Tool plugin — Register a new security tool with discovery + parser
   b) Command plugin — Add new CLI commands/subcommands
   c) Output plugin — Add new output formats (e.g., PDF, Slack, JIRA)
   d) Workflow plugin — Bundle custom workflow YAML files
   e) AI plugin — Custom AI prompts or model providers

3. Commands:
   - cosmicsec plugin install <name|url|path>
   - cosmicsec plugin list — Show installed plugins
   - cosmicsec plugin remove <name>
   - cosmicsec plugin create <name> — Scaffold new plugin
   - cosmicsec plugin search <query> — Search plugin registry

4. Plugin registry API:
   - Fetch from server: GET /api/plugins/cli
   - Community plugins hosted on CosmicSec Hub (future)
   - Support GitHub URL installation: cosmicsec plugin install gh:user/repo
```

**Files**:
- `cli/agent/cosmicsec_agent/plugins/` — NEW: Plugin framework
- `cli/agent/cosmicsec_agent/main.py` — Add plugin commands, dynamic command loading

---

### 🧪 CA-8 Verification

```bash
cosmicsec plugin create my-custom-scanner
cosmicsec plugin install ./my-custom-scanner
cosmicsec plugin list
cosmicsec discover  # Should show custom scanner tool
```

---

## Phase CA-9 — Offline-First Intelligence & Edge Computing 🟢 IN PROGRESS (~35%)

> 🎯 **Goal**: Make the CLI a fully autonomous security agent that can operate indefinitely offline with local AI, then intelligently sync when connectivity is restored.
>
> 📋 **Prerequisites**: Phase CA-4, Main roadmap Phase Q
>
> 🌐 **Languages**: Python
>
> ⏱️ **Estimated Duration**: 1–2 weeks
>
> ✅ **CA-9 partial complete 2026-04-16**: Added `ai setup` workflow for Ollama model configuration/pull + persisted model preferences, plus `sync status` and `sync push` commands for local queue visibility and manual reconciliation.

### CA-9.1 — Local AI with Ollama Integration

**AI Agent Prompt**:
```
Add full offline AI support:

1. cosmicsec ai setup — Download and configure local Ollama models:
   - Detect Ollama installation, offer to install if missing
   - Pull recommended models: llama3.1 (general), codellama (code analysis)
   - Verify GPU availability and recommend model sizes accordingly
   - Store model preferences in config

2. Automatic provider fallback:
   - Connected + OpenAI key: Use OpenAI (best quality)
   - Connected + no key: Use CosmicSec cloud AI
   - Disconnected + Ollama: Use local Ollama (offline-capable)
   - Disconnected + no Ollama: Use rule-based analysis (no LLM)

3. Rule-based fallback engine:
   - CVSS score calculation from finding attributes
   - Pattern matching for common vulnerability categories
   - Predefined remediation templates by vulnerability type
   - Basic correlation rules (same host, same service, related ports)
```

---

### CA-9.2 — Smart Sync & Conflict Resolution

**AI Agent Prompt**:
```
Enhance offline sync capabilities:

1. Smart sync on reconnect:
   - Queue all changes (scans, findings, annotations) while offline
   - On reconnect: batch upload with conflict resolution
   - Conflict strategy: server wins for metadata, merge for findings
   - Show sync summary: "Synced 47 findings, 3 scans. 2 conflicts resolved."

2. Bandwidth-efficient sync:
   - Delta sync: only send changes since last sync
   - Compression: gzip all payloads
   - Priority sync: critical findings first, info findings last
   - Resume interrupted syncs

3. cosmicsec sync — Manual sync commands:
   - cosmicsec sync status — Show pending sync items
   - cosmicsec sync push — Force push local data
   - cosmicsec sync pull — Force pull server data
   - cosmicsec sync resolve — Interactive conflict resolution
```

---

### 🧪 CA-9 Verification

```bash
# Local AI
cosmicsec ai setup
cosmicsec ask "analyze my findings" --provider ollama

# Offline operation
# (disconnect network)
cosmicsec scan -t 192.168.1.1 --tool nmap
cosmicsec analyze  # Should work offline with Ollama
# (reconnect network)
cosmicsec sync push  # Upload offline data
```

---

## Phase CA-10 — Performance, Cross-Platform & Rust Acceleration 🟢 IN PROGRESS (~45%)

> 🎯 **Goal**: Optimize performance for large-scale scanning, ensure cross-platform compatibility, and explore Rust acceleration for parsing bottlenecks.
>
> 📋 **Prerequisites**: Phases CA-2, CA-5, Main roadmap Phase P
>
> 🌐 **Languages**: Python, Rust (optional acceleration)
>
> ⏱️ **Estimated Duration**: 2 weeks
>
> ✅ **CA-10.1 partial complete 2026-04-16**: `offline_store.py` now enables SQLite WAL mode, creates query indexes, optimizes `list_scans()` aggregation to avoid N+1 DB reads, and adds `vacuum()` maintenance path (`sync vacuum` command).

### CA-10.1 — Performance Optimization

**AI Agent Prompt**:
```
Optimize CLI performance:

1. Startup time optimization:
   - Lazy imports (don't import AI/ML libs until needed)
   - Pre-compiled Typer completion cache
   - Target: < 200ms cold start

2. Large-scale scanning:
   - Async concurrent scanning with configurable parallelism
   - Memory-efficient streaming parser (don't hold full output in memory)
   - Progress estimation based on historical scan durations

3. SQLite optimization:
   - WAL mode for concurrent reads/writes
   - Indexes on frequently queried columns
   - Connection pooling
   - Periodic VACUUM in maintenance command

4. Network optimization:
   - HTTP/2 support with connection pooling
   - WebSocket compression (permessage-deflate)
   - Retry with exponential backoff for all HTTP calls
   - Request deduplication
```

---

### CA-10.2 — Cross-Platform Compatibility

**AI Agent Prompt**:
```
Ensure full cross-platform support:

1. Test and fix for:
   - Linux (Ubuntu, Fedora, Arch, Alpine)
   - macOS (Intel + Apple Silicon)
   - Windows (native + WSL)
   - Docker (Alpine-based)

2. Platform-specific handling:
   - Path separators (use pathlib everywhere)
   - Color support detection (Windows ANSI, tmux, screen)
   - Keyring backends per platform
   - Shell completion per shell (bash, zsh, fish, powershell)

3. CI matrix:
   - GitHub Actions matrix: [ubuntu-latest, macos-latest, windows-latest]
   - Python versions: [3.11, 3.12, 3.13]
```

---

### CA-10.3 — Optional Rust Acceleration

**AI Agent Prompt**:
```
Add optional Rust-accelerated parsers via PyO3:

1. Create cli/agent/rust_parsers/ Rust crate:
   - nmap XML parser (10x faster for large scan output)
   - Masscan output parser
   - SARIF formatter

2. Python fallback:
   - Try importing Rust extension first
   - Fall back to pure Python parser if Rust extension not available
   - Zero functional difference — Rust is purely a performance optimization

3. Build:
   - maturin-based build: pip install cosmicsec-agent[fast]
   - Pre-built wheels for Linux/macOS/Windows x86_64 and arm64
```

---

### 🧪 CA-10 Verification

```bash
# Startup time
time cosmicsec --help  # Should be < 200ms

# Cross-platform
# Run test suite on Linux, macOS, Windows via CI matrix

# Rust parsers (optional)
pip install cosmicsec-agent[fast]
cosmicsec scan -t 192.168.1.1 --tool nmap  # Automatically uses Rust parser
```

---

## Implementation Priority Matrix

```
                    IMPACT
                    HIGH ─────────────────────────────────────────┐
                    │                                             │
                    │  CA-4.5 (Hybrid) ✅ │  CA-6 (Enterprise)   │
                    │  CA-1 (Security)    │  CA-8 (Plugins)      │
                    │  CA-2 (Core UX)     │                      │
                    │  CA-4 (AI Agent)    │                      │
                    │                                             │
                    MEDIUM ───────────────────────────────────────│
                    │                                             │
                    │  CA-3 (TUI/REPL)      │  CA-9 (Offline AI) │
                    │  CA-5 (Orchestration)  │  CA-10 (Rust)      │
                    │  CA-7 (DX/Polish)     │                     │
                    │                                             │
                    LOW ──────────────────────────────────────────│
                    │                                             │
                    └──────────────────┴──────────────────────────┘
                    LOW ────── URGENCY ────── HIGH
```

### Recommended Execution Order

| Order | Phase | Est. Duration | Dependencies | Status |
|-------|-------|--------------|--------------|--------|
| ✅ | **CA-4.5** — Hybrid Dynamic/Static Engine | Done | None | ✅ **Complete** |
| 1st 🔴 | **CA-1** — Security & Auth | 1 week | Main Phase K | 🟢 In progress (~80%) |
| 2nd 🔴 | **CA-2** — Core CLI Overhaul | 1–2 weeks | CA-1 | 🟢 In progress (~90%) |
| 3rd 🟠 | **CA-4** — AI-Powered CLI (extends CA-4.5) | 2–3 weeks | CA-2, CA-4.5 ✅ | ⏳ Pending |
| 4th 🟠 | **CA-3** — Interactive TUI | 2–3 weeks | CA-2 | ⏳ Pending |
| 5th 🟠 | **CA-5** — Orchestration & Pipelines | 2 weeks | CA-2 | ⏳ Pending |
| 6th 🟡 | **CA-7** — DX & Distribution | 1–2 weeks | CA-1 through CA-4 | 🟢 In progress (~76%) |
| 7th 🟡 | **CA-6** — Enterprise Features | 1–2 weeks | CA-1, Main Phase R | ⏳ Pending |
| 8th 🟡 | **CA-8** — Plugin System | 1–2 weeks | CA-5 | 🟢 In progress (~40%) |
| 9th 🟢 | **CA-9** — Offline Intelligence | 1–2 weeks | CA-4, Main Phase Q | 🟢 In progress (~35%) |
| 10th 🟢 | **CA-10** — Performance & Rust | 2 weeks | CA-2, CA-5 | 🟢 In progress (~45%) |

**Total estimated effort**: 14–22 weeks for 1–2 developers (Phase CA-4.5 complete)

---

## Target CLI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                        │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Typer   │ │  REPL    │ │ Textual  │ │  CI/CD   │           │
│  │  CLI     │ │  Shell   │ │  TUI     │ │  Mode    │           │
│  │ Commands │ │ readline │ │ Dashboard│ │ (--json) │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └─────────────┴────────────┴─────────────┘                │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │            🆕 HYBRID ENGINE LAYER (v0.2.0)            │       │
│  │                                                       │       │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐          │       │
│  │  │ Intent    │ │ AI Task   │ │ Dynamic   │          │       │
│  │  │ Parser    │ │ Planner   │ │ Resolver  │          │       │
│  │  │ (static)  │ │ (dynamic) │ │ (safety)  │          │       │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘          │       │
│  │        └──────────────┴─────────────┘                │       │
│  │               Mode: static│dynamic│hybrid             │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                              │                                   │
├──────────────────────────────┼──────────────────────────────────┤
│                    CORE ENGINE LAYER                              │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ Workflow  │ │   AI      │ │  Report   │ │  Plugin   │       │
│  │ Engine    │ │  Engine   │ │ Generator │ │  System   │       │
│  │ (YAML)   │ │ (LLM)    │ │ (MD/HTML) │ │ (dynamic) │       │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘       │
│        └──────────────┴─────────────┴──────────────┘             │
│                          │                                       │
├──────────────────────────┼──────────────────────────────────────┤
│                  TOOL EXECUTION LAYER                             │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │  Tool     │ │  Async    │ │  Parser   │ │ Scheduler │       │
│  │ Registry  │ │ Executor  │ │ Pipeline  │ │  (cron)   │       │
│  │ (14+dyn) │ │ (parallel)│ │ (14 parse)│ │           │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    DATA & STORAGE LAYER                           │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │  SQLite   │ │ Credential│ │  Config   │ │  Audit    │       │
│  │  Store    │ │  Store    │ │  Store    │ │  Log      │       │
│  │ (offline) │ │ (keyring) │ │  (TOML)  │ │ (SQLite)  │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    NETWORK & SYNC LAYER                           │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │  REST     │ │ WebSocket │ │  Smart    │ │  Auth     │       │
│  │  Client   │ │  Stream   │ │  Sync     │ │  Manager  │       │
│  │ (httpx)   │ │  Client   │ │  Engine   │ │ (OAuth2)  │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    AI PROVIDER LAYER (v0.2.0)                     │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                     │
│  │  OpenAI   │ │  Ollama   │ │ CosmicSec │                     │
│  │ Provider  │ │ Provider  │ │  Cloud    │                     │
│  │ (GPT-4o) │ │ (local)   │ │ Provider  │                     │
│  └───────────┘ └───────────┘ └───────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## New File & Directory Map

```
cli/agent/
├── pyproject.toml                         [MODIFIED v0.2.0 — optional AI deps]
├── README.md                              [REWRITE — comprehensive docs]
├── Dockerfile                             [NEW — CA-7]
├── cosmicsec_agent/
│   ├── __init__.py                        [MODIFIED v0.2.0 — version 0.2.0]
│   ├── main.py                            [MODIFIED v0.2.0 — run/plan/mode commands]
│   │
│   ├── # --- Phase CA-4.5: Hybrid Engine (IMPLEMENTED ✅) ---
│   ├── hybrid_engine.py                   [NEW ✅] Hybrid dynamic/static execution engine
│   ├── ai_planner.py                      [NEW ✅] AI-powered task planner (OpenAI/Ollama/Cloud)
│   ├── intent_parser.py                   [NEW ✅] Rule-based NL intent classification
│   ├── dynamic_resolver.py                [NEW ✅] Safe command resolution + allowlist
│   │
│   ├── # --- Phase CA-1: Security & Auth ---
│   ├── auth.py                            [NEW] Auth flow logic
│   ├── credential_store.py                [NEW] Secure credential storage
│   ├── profiles.py                        [NEW] Profile/workspace management
│   ├── audit_log.py                       [NEW] CLI audit trail
│   │
│   ├── # --- Phase CA-2: Core UX ---
│   ├── output.py                          [NEW] Output formatting (json/yaml/csv/table)
│   ├── progress.py                        [NEW] Rich Live progress display
│   ├── config.py                          [NEW] Settings management (TOML)
│   │
│   ├── # --- Phase CA-3: Interactive TUI ---
│   ├── repl.py                            [NEW] Interactive REPL
│   ├── wizard.py                          [NEW] Guided scan wizard
│   ├── tui/
│   │   ├── __init__.py                    [NEW]
│   │   ├── app.py                         [NEW] Main Textual app
│   │   ├── widgets.py                     [NEW] Custom TUI widgets
│   │   └── screens.py                     [NEW] TUI screen definitions
│   │
│   ├── # --- Phase CA-4: AI Agent ---
│   ├── ai.py                              [NEW] LLM provider abstraction
│   ├── chat.py                            [NEW] Persistent chat mode
│   ├── reports.py                         [NEW] AI-generated reports
│   ├── templates/                         [NEW] Report templates
│   │   ├── executive.md.j2
│   │   ├── technical.md.j2
│   │   ├── compliance.md.j2
│   │   └── pentest.md.j2
│   │
│   ├── # --- Phase CA-5: Orchestration ---
│   ├── workflows.py                       [NEW] YAML workflow engine
│   ├── scheduler.py                       [NEW] Cron-based scheduling
│   ├── ci.py                              [NEW] CI/CD integration
│   ├── sarif.py                           [NEW] SARIF output format
│   ├── workflows/                         [NEW] Built-in workflow YAML files
│   │   ├── quick-audit.yaml
│   │   ├── web-app-scan.yaml
│   │   ├── network-sweep.yaml
│   │   └── compliance-check.yaml
│   │
│   ├── # --- Phase CA-8: Plugins ---
│   ├── plugins/
│   │   ├── __init__.py                    [NEW] Plugin loader
│   │   ├── manager.py                     [NEW] Plugin lifecycle
│   │   └── scaffold.py                    [NEW] Plugin scaffolding
│   │
│   ├── # --- Existing (enhanced) ---
│   ├── executor.py                        [ENHANCE — concurrent execution]
│   ├── offline_store.py                   [ENHANCE — search, pagination, sync]
│   ├── stream.py                          [ENHANCE — smart sync, compression]
│   ├── tool_registry.py                   [ENHANCED ✅ v0.2.0 — categories, dynamic registration, capability lookup]
│   └── parsers/
│       ├── __init__.py                    [MODIFY — export all 14 parsers]
│       ├── nmap_parser.py                 [EXISTING]
│       ├── nikto_parser.py                [EXISTING]
│       ├── nuclei_parser.py               [EXISTING]
│       ├── gobuster_parser.py             [EXISTING]
│       ├── sqlmap_parser.py               [NEW — CA-5]
│       ├── ffuf_parser.py                 [NEW — CA-5]
│       ├── masscan_parser.py              [NEW — CA-5]
│       ├── wpscan_parser.py               [NEW — CA-5]
│       ├── hydra_parser.py                [NEW — CA-5]
│       ├── hashcat_parser.py              [NEW — CA-5]
│       ├── john_parser.py                 [NEW — CA-5]
│       ├── metasploit_parser.py           [NEW — CA-5]
│       ├── zaproxy_parser.py              [NEW — CA-5]
│       └── burpsuite_parser.py            [NEW — CA-5]
│
├── tests/
│   ├── __init__.py
│   ├── test_hybrid_engine.py              [NEW ✅ v0.2.0 — 42 tests]
│   ├── test_credential_store.py           [NEW — CA-7]
│   ├── test_tool_registry.py              [NEW — CA-7]
│   ├── test_executor.py                   [NEW — CA-7]
│   ├── test_offline_store.py              [NEW — CA-7]
│   ├── test_parsers.py                    [NEW — CA-7]
│   ├── test_output.py                     [NEW — CA-7]
│   ├── test_config.py                     [NEW — CA-7]
│   ├── test_workflows.py                  [NEW — CA-7]
│   ├── test_ai.py                         [NEW — CA-7]
│   ├── test_profiles.py                   [NEW — CA-7]
│   ├── test_audit_log.py                  [NEW — CA-7]
│   ├── test_scan_flow.py                  [NEW — CA-7]
│   ├── test_connect_flow.py               [NEW — CA-7]
│   └── test_ci_mode.py                    [NEW — CA-7]
│
└── docs/cli/                              [NEW — CA-7]
    ├── getting-started.md
    ├── authentication.md
    ├── scanning.md
    ├── ai-features.md
    ├── workflows.md
    ├── ci-cd.md
    ├── plugins.md
    └── troubleshooting.md
```

---

## Summary — Before vs. After

| Metric | v0.1.0 (Before) | v0.2.0 (Now) | After Phase CA-10 |
|--------|-------------------|--------------|-------------------|
| **Commands** | 5 (discover, scan, connect, offline export, status) | **9** (+run, plan, mode show, mode set) | 50+ commands across 12 subgroups |
| **Execution Mode** | ❌ Static only (registry) | ✅ **Hybrid** (static + dynamic + AI) | ✅ Hybrid with full AI integration |
| **AI Integration** | ❌ None | ✅ **OpenAI/Ollama/Cloud** providers | ✅ `ask`, `chat`, `analyze`, `explain`, `suggest` with full AI |
| **NL Commands** | ❌ None | ✅ **`run "scan 192.168.1.1"`** | ✅ Full conversational + NL interface |
| **Tool Selection** | Static registry only | **Hybrid** AI-planned + registry fallback | Hybrid + plugin extensibility |
| **Safety Validation** | ❌ None | ✅ **Allowlist + blocklist + secret detection** | ✅ Full sandboxed execution |
| **Authentication** | Raw API key in plaintext JSON | Raw API key in plaintext JSON | Encrypted keyring + OAuth2 + profiles |
| **Interactive Mode** | ❌ None | ❌ None | ✅ REPL shell + full-screen TUI dashboard |
| **Output Formats** | Rich table only | Rich table only | Table, JSON, YAML, CSV, SARIF, quiet mode |
| **Tool Parsers** | 4 of 14 | 4 of 14 | 14 of 14 + plugin extensibility |
| **Tool Metadata** | Name, path, version, capabilities | **+Category, description, default args, dynamic reg** | Full metadata + plugin tools |
| **Scan Orchestration** | Single tool, sequential | **Multi-step workflows** ("then" chaining) | YAML workflows, parallel, conditional, scheduled |
| **CI/CD Integration** | ❌ None | ❌ None | ✅ SARIF, JUnit, exit codes, policy gates |
| **Offline Capability** | Basic SQLite store | Basic SQLite + **offline intent parsing** | Full offline AI + smart delta sync |
| **Test Coverage** | 0% | **42 tests** (hybrid engine) | 90%+ |
| **Cross-Platform** | Untested | Untested | Linux + macOS + Windows CI matrix |
| **Installation** | `pip install -e .` only | `pip install -e .[ai]` (with AI extras) | pip, Homebrew, Docker, standalone binary |
| **Plugin System** | ❌ None | Dynamic tool registration API | ✅ Tool, command, output, workflow plugins |
| **Documentation** | 69-line README | 69-line README | Full docs site with guides, examples, API ref |
| **Competitive Position** | Basic scanner wrapper | **Competitive with GitHub Copilot CLI** | Enterprise CLI agent comparable to leading security platforms |

---

*This CLI Agent roadmap was generated from deep analysis of the entire CosmicSec codebase — existing CLI foundation, server-side services, SDKs, AI capabilities, and main roadmap phases. Phase CA-4.5 (Hybrid Dynamic/Static Engine) has been implemented and is the foundation for all subsequent AI-powered features. It is designed for incremental execution by both human developers and AI coding agents.*
