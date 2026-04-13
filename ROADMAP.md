# CosmicSec — Hybrid Platform Roadmap
### Universal Cybersecurity Intelligence Platform
> **For AI agents & humans** — every section starts with a plain-English summary, followed by technical detail.
> Document version: 2026-04 | Author: vibe-coding-friendly AI-readable spec

---

## Table of Contents
1. [What "Hybrid" Means in CosmicSec](#1-what-hybrid-means-in-cosmicsec)
2. [Current Project Status](#2-current-project-status)
3. [Architecture Overview](#3-architecture-overview)
4. [Gap Analysis — What Is Missing](#4-gap-analysis--what-is-missing)
5. [Technology Stack Choices](#5-technology-stack-choices)
6. [Phase-by-Phase Roadmap](#6-phase-by-phase-roadmap)
   - [Phase A — Foundation Hardening](#phase-a--foundation-hardening)
   - [Phase B — Public Static Layer](#phase-b--public-static-layer)
   - [Phase C — Registered Dashboard (Dynamic)](#phase-c--registered-dashboard-dynamic)
   - [Phase D — CLI Local-Agent (On-Device Execution)](#phase-d--cli-local-agent-on-device-execution)
   - [Phase E — Cross-Layer Intelligence & Sync](#phase-e--cross-layer-intelligence--sync)
   - [Phase F — Advanced AI & Agentic Workflows](#phase-f--advanced-ai--agentic-workflows)
   - [Phase G — Compliance, Enterprise & Polish](#phase-g--compliance-enterprise--polish)
7. [Hybrid Decision Flow Diagram](#7-hybrid-decision-flow-diagram)
8. [File & Directory Target Structure](#8-file--directory-target-structure)
9. [API Contract Conventions](#9-api-contract-conventions)
10. [AI Agent Instructions (Coding Prompts)](#10-ai-agent-instructions-coding-prompts)

---

## 1. What "Hybrid" Means in CosmicSec

CosmicSec serves **three kinds of visitors** with fundamentally different needs:

| User Type | Mode | Where Code Runs | What They See |
|-----------|------|-----------------|---------------|
| **Unregistered / Public** | `STATIC` | Server-side (pre-rendered) | Landing page, feature overview, live demo sandbox (read-only, mocked data) |
| **Registered Dashboard User** | `DYNAMIC` | Server microservices (cloud / self-hosted) | Full interactive dashboard, real-time scans, AI analysis, reports, team collab |
| **CLI / Local-Agent User** | `LOCAL` | **User's own machine** | Terminal agent that discovers & runs local tools (nmap, nikto, sqlmap, metasploit, etc.) and streams results to CosmicSec cloud optionally |

```
┌─────────────────────────────────────────────────┐
│                  Internet / User                │
│                                                 │
│  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Unregistered │  │  Registered Web User   │  │
│  │   Browser    │  │       Browser          │  │
│  └──────┬───────┘  └───────────┬────────────┘  │
│         │ STATIC mode          │ DYNAMIC mode  │
│         │                      │               │
│  ┌──────────────────────────────────────────┐  │
│  │           CosmicSec API Gateway          │  │
│  │     (HybridRouter — already exists)      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │    CLI / Local Agent  (user's machine)     │ │
│  │  cosmicsec-agent  →  runs nmap/nikto/etc.  │ │
│  │  streams JSON results  →  WebSocket/REST   │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

> **Key principle**: the CLI agent is a thin orchestrator — it discovers what tools the user has installed, executes them locally, and optionally streams structured results to the CosmicSec cloud dashboard.

---

## 2. Current Project Status

### ✅ What Is Already Built

#### Backend Microservices (Python / FastAPI)
| Service | Port | Status | Notes |
|---------|------|--------|-------|
| API Gateway | 8000 | ✅ Solid | HybridRouter, RBAC, WebSocket, rate limiting, Prometheus |
| Auth Service | 8001 | ✅ Solid | JWT, OAuth2, TOTP/2FA, casbin RBAC, session management |
| Scan Service | 8002 | ✅ Good | Distributed scanner, smart scanner, continuous monitor, Celery tasks |
| AI Service | 8003 | ✅ Advanced | LangChain, ChromaDB, MITRE ATT&CK, anomaly detection, red team, quantum-ready, zero-day predictor |
| Recon Service | 8004 | ✅ Good | DNS, Shodan, VirusTotal, crt.sh, RDAP |
| Report Service | 8005 | ✅ Good | PDF, DOCX, JSON, CSV, HTML, compliance templates, visualization (topology, heatmap, attack-path) |
| Collab Service | 8006 | ✅ Good | WebSocket rooms, presence tracking, team chat, @mentions |
| Plugin Registry | 8007 | ✅ Good | Plugin SDK, official plugins (nmap, metasploit, jira, slack, report) |
| Integration Service | 8008 | ✅ Good | Third-party integrations hub |
| Bug Bounty Service | 8009 | ✅ Good | HackerOne/Bugcrowd/Intigriti, submission workflow, earnings |
| Phase 5 Service | 8010 | ✅ Good | SOC ops, incident response, SAST, DevSecOps CI gates, IDE highlights |
| Admin Service | — | ✅ Good | Typer CLI, AsyncSSH admin shell, Textual TUI, TOTP MFA |

#### Platform Middleware
| Component | Status | Notes |
|-----------|--------|-------|
| `HybridRouter` | ✅ Done | STATIC/DYNAMIC/HYBRID/DEMO/EMERGENCY modes, canary %, trace buffer, SLO |
| `static_profiles.py` | ✅ Done | Demo fallback handlers |
| `policy_registry.py` | ✅ Done | Per-route auth & fallback policies |
| `runtime_metadata.py` | ✅ Done | Contract versioning |

#### Frontend (React 18 + TypeScript + Vite + TailwindCSS)
| Component | Status | Notes |
|-----------|--------|-------|
| Login / Register / 2FA pages | ✅ Done | Full auth flow |
| Admin Dashboard | ✅ Good | Users, audit logs, module toggles, WebSocket live data, SVG chart |
| Phase 5 Operations Page | ✅ Good | Risk posture, SOC metrics, bug bounty earnings |
| App routing | ✅ Done | React Router v6 |

#### SDK
| SDK | Status | Notes |
|-----|--------|-------|
| Python SDK | ✅ Good | httpx sync client, runtime envelope parser |
| Go SDK | ✅ Minimal | HTTP client, scan + health only |
| JavaScript SDK | ✅ Minimal | Fetch-based, 3 methods, no TypeScript types |

#### Infrastructure
| Component | Status |
|-----------|--------|
| Docker Compose (all 14 services) | ✅ Complete |
| PostgreSQL + Redis + MongoDB + Elasticsearch + RabbitMQ | ✅ Configured |
| Traefik v3 reverse proxy | ✅ Configured |
| Consul service discovery | ✅ Configured |
| Alembic migrations | ✅ Scaffolded (placeholder migration only) |
| GitHub Actions (build, test, deploy, security-scan) | ✅ Present |
| Pre-commit hooks | ✅ Configured |

#### Tests
- **Python**: 1 260 lines across 16 test files covering all services
- **Frontend**: Jest unit test + Playwright e2e smoke test

---

### ❌ What Is Missing (Summary — Full Detail in Section 4)

1. **CLI local-agent** — no on-device execution orchestrator exists
2. **Public/static frontend** — no landing page or demo sandbox for unregistered users
3. **Auth-gated routing in frontend** — dashboard is not protected; public vs. private views not split
4. **Local tool discovery** — no mechanism to detect installed tools on the user's machine
5. **CLI↔Server sync protocol** — no WebSocket/REST protocol for streaming local tool results to cloud
6. **TypeScript SDK** — JavaScript SDK has no types; no official TypeScript package
7. **Rust performance layer** — high-throughput scan result ingestion needs a fast layer
8. **Real-time frontend** — scan progress, live log streaming not wired to the UI
9. **Persistent state** — several services store data in-memory (lost on restart)
10. **Real database migrations** — alembic has only a placeholder migration

---

## 3. Architecture Overview

### Target Hybrid Architecture (After All Phases)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER LAYER                                       │
│                                                                          │
│  [Public Browser]     [Auth'd Browser]        [CLI Terminal / IDE]       │
│  STATIC mode          DYNAMIC mode            LOCAL mode                 │
└────────┬──────────────────┬───────────────────────┬─────────────────────┘
         │                  │                        │
         ▼                  ▼                        │
┌──────────────────────────────────────────┐        │
│         Traefik (Edge Gateway)           │        │
│  TLS termination, rate limit, WAF rules  │        │
└──────────────────────┬───────────────────┘        │
                       │                            │
                       ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              CosmicSec API Gateway (FastAPI / Python)                    │
│  HybridRouter → resolves mode (STATIC / DYNAMIC / LOCAL)                 │
│  Auth middleware → JWT validation                                         │
│  Rate limiter (slowapi) → per-user/IP                                    │
│  WebSocket hub → CLI agent streams, dashboard live data                  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
           ┌────────────────────┼────────────────────────────────────────┐
           ▼                    ▼                                        ▼
┌──────────────┐    ┌───────────────────────────────────────┐  ┌──────────────────┐
│  Static CDN  │    │       Backend Microservices            │  │  CLI Local Agent │
│  (pre-built  │    │  Auth / Scan / AI / Recon / Report /  │  │  (Python/Rust)   │
│   responses) │    │  Collab / Plugins / Integration /     │  │  runs on user PC │
│              │    │  BugBounty / Phase5 / Admin            │  │  nmap/nikto etc  │
└──────────────┘    └───────────────────────────────────────┘  └──────────────────┘
                                │
           ┌────────────────────┼─────────────────────────────────────┐
           ▼                    ▼                                     ▼
     PostgreSQL             MongoDB + Redis                    Elasticsearch
     (core data)            (OSINT / cache)                   (logs / search)
```

---

## 4. Gap Analysis — What Is Missing

### GAP-01 · CLI Local-Agent (Critical)
**What it is**: A command-line application users install on their machine that:
- Detects which security tools are installed (`nmap`, `nikto`, `sqlmap`, `metasploit`, `burpsuite`, `gobuster`, etc.)
- Accepts task commands from the CosmicSec server OR runs autonomously
- Executes tools locally, parses their output, and streams structured JSON results to the server (or saves locally)
- Supports offline/air-gapped mode (no cloud connection required)

**Current state**: The existing `admin_service/cli.py` is an admin management tool only — it does not run security tools locally.

**Files to create**:
- `cli/agent/main.py` — Typer app entry point
- `cli/agent/tool_registry.py` — discovers & registers local tools
- `cli/agent/executor.py` — runs tools as subprocesses, captures stdout
- `cli/agent/parsers/` — per-tool output parsers (nmap XML, nikto CSV, etc.) in Python
- `cli/agent/stream.py` — WebSocket client to stream results
- `cli/agent/offline_store.py` — local SQLite store for offline mode
- `cli/Dockerfile` — lightweight container for the agent (optional)
- `cli/pyproject.toml` — separate installable package: `pip install cosmicsec-agent`

---

### GAP-02 · Public/Static Frontend (High)
**What it is**: A polished landing page for unauthenticated visitors showing:
- Platform feature overview (static HTML — no auth required)
- Interactive demo sandbox with mocked/pre-baked data
- "Try it now" CTAs → registration
- Pricing / about / docs links

**Current state**: `frontend/src/App.tsx` loads the admin dashboard directly; there is no public-facing UI.

**Files to create/modify**:
- `frontend/src/pages/LandingPage.tsx` — public home
- `frontend/src/pages/DemoSandboxPage.tsx` — static demo with mocked scan data
- `frontend/src/pages/PricingPage.tsx` — pricing tiers
- `frontend/src/context/AuthContext.tsx` — global auth state (already implied but not created)
- `frontend/src/router/ProtectedRoute.tsx` — redirect to login if not auth'd
- Modify `frontend/src/App.tsx` — split public vs. protected routes

---

### GAP-03 · Auth-Gated Routing in Frontend (High)
**What it is**: The dashboard pages should only be accessible after login. Currently any URL loads without a token check.

**Files to modify**:
- `frontend/src/App.tsx`
- `frontend/src/context/AuthContext.tsx` (create)
- `frontend/src/router/ProtectedRoute.tsx` (create)

---

### GAP-04 · CLI↔Server Sync Protocol (High)
**What it is**: A well-defined protocol so the CLI agent on a user's machine can:
1. Authenticate with the server using an API key
2. Receive task assignments (what to scan, which tool, what flags)
3. Stream structured results back in real-time via WebSocket
4. Handle connection drops gracefully (local queue + retry)

**Current state**: The API gateway has a WebSocket endpoint but it's only for dashboard live data.

**Files to create/modify**:
- `services/api_gateway/main.py` — add `/ws/agent/{agent_id}` WebSocket endpoint
- `cli/agent/stream.py` — client side of the above
- `services/scan_service/main.py` — accept agent-submitted scan results
- Add `AgentSession` model in `services/common/models.py`

---

### GAP-05 · TypeScript SDK (Medium)
**What it is**: The existing `sdk/javascript/client.js` has no types. Security tooling integrators expect a typed SDK.

**Files to create**:
- `sdk/typescript/src/client.ts` — full typed API client
- `sdk/typescript/src/types.ts` — shared types (ScanResult, Finding, RuntimeEnvelope, etc.)
- `sdk/typescript/src/agent.ts` — local agent protocol types
- `sdk/typescript/package.json`
- `sdk/typescript/tsconfig.json`

---

### GAP-06 · Rust Ingest Layer (Medium)
**What it is**: CLI agents can produce high volumes of scan data (millions of nmap results). A Rust binary handles ingestion at speed: parses raw tool output, normalises to CosmicSec Finding schema, and bulk-inserts to Postgres.

**Files to create**:
- `ingest/src/main.rs`
- `ingest/src/parsers/nmap.rs`, `nikto.rs`, `zap.rs`, etc.
- `ingest/src/schema.rs`
- `ingest/Cargo.toml`

---

### GAP-07 · Real-Time Frontend (Medium)
**What it is**: Dashboard scan cards should update live as scans progress, showing percentage, current finding count, log stream.

**Files to modify/create**:
- `frontend/src/hooks/useScanStream.ts` — WebSocket hook
- `frontend/src/components/ScanCard.tsx` — live progress component
- `frontend/src/pages/ScanDetailPage.tsx` — full scan result view with live log

---

### GAP-08 · Persistent State (Medium)
**What it is**: `bugbounty_service`, `phase5_service`, `collab_service`, `integration_service` all use Python in-memory dicts. Data is lost on restart.

**Fix**: Connect each to PostgreSQL via SQLAlchemy models already defined in `services/common/models.py`.

---

### GAP-09 · Real Alembic Migrations (Medium)
**What it is**: `alembic/versions/0001_initial_placeholder.py` is empty. No tables are actually created by migration.

**Fix**: Generate real migration from `services/common/models.py`.

---

### GAP-10 · Local Tool Discovery (Low-Medium)
**What it is**: The CLI agent needs to auto-detect what tools are available (`which nmap`, version check, capability flag) and report this to the server so the server knows what tasks it can dispatch.

**Files to create**:
- `cli/agent/tool_registry.py` — `shutil.which()` + version probing per tool

---

### GAP-11 · Go SDK Enhancement (Low)
**What it is**: Go SDK only has `Health` and `CreateScan`. It needs full parity with Python SDK.

**File to modify**: `sdk/go/client.go`

---

### GAP-12 · Missing Frontend Pages (Low)
- Scan configuration & launch page
- Scan results detail page
- Recon results page
- AI analysis result page
- User profile / API key management page
- Notification preferences

---

## 5. Technology Stack Choices

> **Philosophy**: use the best tool for each job. Mix languages freely.

| Layer | Language | Framework / Library | Why |
|-------|----------|---------------------|-----|
| Backend microservices | **Python 3.12** | FastAPI + Pydantic v2 + SQLAlchemy 2 | Fastest iteration, best ML ecosystem |
| AI/ML engine | **Python 3.12** | LangChain 0.3, LangGraph, ChromaDB, scikit-learn | Leading AI tooling |
| High-speed ingest | **Rust** (2024 edition) | Tokio + Serde + sqlx | 100x faster than Python for bulk parsing |
| CLI agent | **Python 3.12** | Typer + Rich + asyncio + websockets | Easy install (`pip`), cross-platform |
| Frontend | **TypeScript 5** | React 19 + Vite 5 + TailwindCSS 4 + TanStack Query v5 | Modern, typed, fast HMR |
| TypeScript SDK | **TypeScript 5** | native fetch + Zod validation | Universal browser + Node usage |
| Go SDK | **Go 1.22** | stdlib `net/http` | Low-dependency enterprise integration |
| Infrastructure | **YAML/HCL** | Docker Compose + Terraform (future) | Reproducible environments |
| Database | **SQL** | PostgreSQL 16, migrations via Alembic | ACID compliance |
| Cache / Queue | **Redis 7** | `redis-py` async | Pub/sub + task queue |
| Message broker | **AMQP** | RabbitMQ 3 via Celery | Reliable background tasks |
| Search / Logs | **Elasticsearch 8** | `elasticsearch-py` | Fast full-text over scan results |
| Tool output parsing | **Rust** | custom parsers, `xml-rs`, `csv` | nmap XML is huge; needs speed |
| Offline CLI store | **SQLite** | `sqlite3` (stdlib) | Zero-dependency local persistence |
| Testing (Python) | **pytest** | `pytest-asyncio`, `httpx[test]` | Async + HTTP test client |
| Testing (TS) | **Vitest** | `@testing-library/react`, Playwright | Fast ESM-native test runner |
| Linting (Python) | **Ruff** | replaces flake8 + isort | 100x faster, single tool |
| Linting (TS) | **Biome** | replaces ESLint + Prettier | 50x faster, single tool |
| CI/CD | **GitHub Actions** | existing workflows | Extend, not replace |

---

## 6. Phase-by-Phase Roadmap

> Each phase has a **Goal**, **Tasks** (numbered), **Files** (specific paths), **Done-When** (acceptance criteria), and a **Tech Note** for AI agents.

---

### Phase A — Foundation Hardening ✅ COMPLETE (100%)
**Goal**: Make the existing codebase production-ready before adding new features.
**Status**: ✅ Fully implemented — 2026-04-13

#### A1 · Real Alembic Migrations ✅
- ✅ Extended `services/common/models.py` with ALL tables: `users`, `sessions`, `api_keys`, `audit_logs`, `scans`, `findings`, `agent_sessions`, `bugbounty_programs`, `bugbounty_submissions`, `collab_messages`, `collab_report_sections`, `integration_configs`, `phase5_alerts`, `phase5_incidents`, `phase5_policies`, `phase5_iocs`
- ✅ Created `alembic/versions/0002_initial_schema.py` with full DDL (all indexes, FKs, constraints)
- ✅ Updated `alembic/env.py` to point `target_metadata` at `Base.metadata` and respect `DATABASE_URL` env var
- ✅ Placeholder `0001_initial_placeholder.py` retained as base; `0002` builds on top

**Done-When**: `alembic upgrade head` runs against a fresh PostgreSQL and creates all tables. ✅

#### A2 · Replace Flake8+isort with Ruff ✅
- ✅ Replaced `flake8`, `isort`, `black` in `pyproject.toml` dev dependencies with `ruff>=0.4.0`
- ✅ Added `[tool.ruff]` and `[tool.ruff.lint]` config sections to `pyproject.toml`
- ✅ Updated `.pre-commit-config.yaml` to use `ruff` and `ruff-format` hooks
- ✅ Removed `flake8`, `isort`, `black` entries

**Done-When**: `ruff check .` passes on the whole repo. ✅

#### A3 · Replace Jest with Vitest in Frontend ✅
- ✅ Removed `jest`, `ts-jest`, `@types/jest` from `frontend/package.json`
- ✅ Added `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/user-event`
- ✅ Updated `frontend/vite.config.ts` to include full vitest config block (globals, jsdom, coverage)
- ✅ Deleted `frontend/jest.config.cjs`
- ✅ Updated `frontend/src/test/setup.ts` to `import '@testing-library/jest-dom/vitest'`
- ✅ Updated `frontend/tsconfig.json` to include `vitest/globals` type
- ✅ Updated `frontend/src/App.test.tsx` for new structure

**Done-When**: `npm run test` passes using Vitest. ✅

#### A4 · Persistent State for In-Memory Services ✅
- ✅ `services/bugbounty_service/main.py`: programs & submissions now use `BugBountyProgramModel` / `BugBountySubmissionModel` via SQLAlchemy + `Depends(get_db)`
- ✅ `services/phase5_service/main.py`: alerts → `Phase5AlertModel`, incidents → `Phase5IncidentModel`, policies → `Phase5PolicyModel`, IOCs → `Phase5IOCModel`
- ✅ `services/collab_service/main.py`: messages persisted to `CollabMessageModel`; report sections to `CollabReportSectionModel`; WebSocket connections remain in-memory
- ✅ `services/integration_service/main.py`: added `POST /configs`, `GET /configs`, `DELETE /configs/{id}` backed by `IntegrationConfigModel`; fixed all `datetime.utcnow()` → `datetime.now(timezone.utc)`

**Done-When**: Restarting any service container does not lose data. ✅

#### A5 · Upgrade Frontend to React 19 + New Structure ✅
- ✅ `frontend/package.json`: bumped `react`/`react-dom` to `^19.0.0`, `@types/react`/`@types/react-dom` to `^19.0.0`, `zustand` to `^5.0.0`
- ✅ Added `lucide-react` as a dependency (icon library used throughout new pages)
- ✅ Created `frontend/src/context/AuthContext.tsx` — global auth state with localStorage persistence
- ✅ Created `frontend/src/router/ProtectedRoute.tsx` — redirects unauthenticated users to /auth/login
- ✅ Updated `frontend/src/App.tsx` — split public vs. protected routes, wrapped with `<AuthProvider>`
- ✅ Created `frontend/src/pages/LandingPage.tsx` — hero, feature grid, stats bar, deployment modes, footer
- ✅ Created `frontend/src/pages/DemoSandboxPage.tsx` — static demo with 3 mocked findings, recon, AI analysis
- ✅ Created `frontend/src/data/demoFixtures.ts` — pre-baked demo data
- ✅ Created `frontend/src/pages/PricingPage.tsx` — Free / Pro / Enterprise tier cards
- Note: TailwindCSS kept at v3 (v4 is a non-backwards-compatible format change; upgrade planned for Phase G polish)

**Done-When**: App routes work, /admin redirects to login when unauthenticated. ✅

---

### Phase B — Public Static Layer ✅ COMPLETE (100%)
**Goal**: Unregistered users see a polished, fast, static public site.
**Status**: Fully implemented — 2026-04-13

#### B1 · AuthContext & ProtectedRoute ✅ (done in A5)
#### B2 · Landing Page ✅ (done in A5)
#### B3 · Demo Sandbox Page ✅ (done in A5)
#### B4 · Pricing Page ✅ (done in A5)
#### B5 · Static Profile Expansion in Gateway ✅
- ✅ Added 8 new demo/static handlers to `cosmicsec_platform/middleware/static_profiles.py`:
  - `ai_analyze_profile` — demo AI analysis with risk score, MITRE mappings, recommendations
  - `ai_correlate_profile` — demo correlation graph with nodes/edges
  - `recon_dns_profile` — demo DNS records (A, MX, NS, TXT)
  - `collab_rooms_profile` — demo collaboration rooms
  - `bugbounty_programs_profile` — demo bug bounty programs list
  - `integration_list_profile` — demo integrations (Slack, Jira, GitHub)
  - `agent_register_profile` — demo agent registration response
  - `agent_list_profile` — demo agent list

**Done-When**: `X-Platform-Mode: demo` header on any API call returns demo data without touching real services. ✅

---

### Phase C — Registered Dashboard (Dynamic) ✅ COMPLETE (100%)
**Goal**: Registered users get a full-featured, real-time security operations center dashboard.
**Status**: ✅ Fully implemented — 2026-04-13

#### C1 · Scan Launch & Configuration Page ✅
- ✅ Created `frontend/src/hooks/useScanStream.ts` — WebSocket hook with exponential backoff reconnect
- ✅ Created `frontend/src/pages/ScanPage.tsx` — scan launch form (target, type, tool selection), recent scans list
- ✅ Created `frontend/src/pages/ScanDetailPage.tsx` — live progress bar, findings grid, log stream, export
- ✅ Routes: `/scans` and `/scans/:id` added to App.tsx as protected routes

#### C2 · Recon Results Page ✅
- ✅ Created `frontend/src/pages/ReconPage.tsx` — collapsible panels: DNS, Shodan, VirusTotal, crt.sh, RDAP; export JSON

#### C3 · AI Analysis Page ✅
- ✅ Created `frontend/src/pages/AIAnalysisPage.tsx` — SVG risk gauge, MITRE ATT&CK technique table, recommendations

#### C4 · User Profile & API Key Page ✅
- ✅ Created `frontend/src/pages/ProfilePage.tsx` — user info, API key generation/revoke, notification preferences

#### C5 · Global State Management ✅
- ✅ Created `frontend/src/store/scanStore.ts` — Zustand store for scans + findings
- ✅ Created `frontend/src/store/notificationStore.ts` — toast notification queue

#### C6 · Navigation Enhancement ✅
- ✅ Created `frontend/src/components/Sidebar.tsx` — collapsible dark sidebar, active route highlight, logout
- ✅ Created `frontend/src/components/AppLayout.tsx` — responsive wrapper with mobile hamburger
- ✅ Created `frontend/src/components/Toast.tsx` — auto-dismiss notifications (bottom-right)
- ✅ Updated `frontend/src/App.tsx` — all dashboard routes use AppLayout + ProtectedRoute

---

### Phase D — CLI Local-Agent (On-Device Execution) ✅ COMPLETE (100%)
**Goal**: Users install `cosmicsec-agent` on their machine. It discovers local tools, executes them on demand, and optionally streams results to CosmicSec cloud.
**Status**: ✅ Fully implemented — 2026-04-13

#### D1 · CLI Agent Package ✅
- ✅ Created `cli/agent/pyproject.toml` — hatchling build, `cosmicsec-agent` entry point, all deps
- ✅ Created `cli/agent/cosmicsec_agent/__init__.py`
- ✅ Created `cli/README.md` — installation and usage guide

#### D2 · Tool Registry
- Create `cli/agent/cosmicsec_agent/tool_registry.py`
  - Class `ToolRegistry` with methods:
    - `discover() -> list[ToolInfo]` — uses `shutil.which()` per known tool name
    - `probe_version(name) -> str` — runs `nmap --version`, `nikto -Version`, etc.
    - `to_manifest() -> dict` — serialises to JSON for server registration
  - Known tools list: `nmap`, `nikto`, `sqlmap`, `gobuster`, `ffuf`, `masscan`, `wpscan`, `nuclei`, `zaproxy`, `metasploit-framework`, `hydra`, `john`, `hashcat`, `burpsuite`
  - Each tool entry: `{ name, path, version, capabilities: list[str] }`

#### D3 · Tool Executor
- Create `cli/agent/cosmicsec_agent/executor.py`
  - Async function `run_tool(tool: str, args: list[str], timeout: int) -> AsyncGenerator[str, None]`
  - Uses `asyncio.create_subprocess_exec`
  - Yields stdout lines as they arrive (streaming)
  - Captures stderr separately
  - Kills process on timeout
  - Returns `ExecutionResult(exit_code, stdout, stderr, duration_ms)`

#### D2 · Tool Registry ✅
- ✅ Created `cli/agent/cosmicsec_agent/tool_registry.py` — `ToolRegistry` class with `discover()`, `probe_version()`, `to_manifest()`; 14 known tools with capabilities

#### D3 · Tool Executor ✅
- ✅ Created `cli/agent/cosmicsec_agent/executor.py` — async streaming `run_tool()` generator + `run_tool_complete()`, timeout + kill

#### D4 · Output Parsers ✅
- ✅ Created `cli/agent/cosmicsec_agent/parsers/nmap_parser.py` — XML + text fallback, port→severity
- ✅ Created `cli/agent/cosmicsec_agent/parsers/nikto_parser.py` — `+` lines, OSVDB severity
- ✅ Created `cli/agent/cosmicsec_agent/parsers/nuclei_parser.py` — JSONL, native severity mapping
- ✅ Created `cli/agent/cosmicsec_agent/parsers/gobuster_parser.py` — HTTP status→severity

#### D5 · Offline Store ✅
- ✅ Created `cli/agent/cosmicsec_agent/offline_store.py` — SQLite at `~/.cosmicsec/offline.db`, JSON/CSV export, sync tracking

#### D6 · Stream Client ✅
- ✅ Created `cli/agent/cosmicsec_agent/stream.py` — `AgentStreamClient` with exponential backoff, offline queue, flush on reconnect

#### D7 · CLI Agent Main (Typer App) ✅
- ✅ Created `cli/agent/cosmicsec_agent/main.py` — commands: `discover`, `scan`, `scan --all`, `connect`, `offline export`, `status`; Rich output

#### D8 · Server-Side Agent Session Endpoints ✅
- ✅ Modified `services/api_gateway/main.py` — `POST /api/agents/register`, `GET /api/agents`, `WebSocket /ws/agent/{agent_id}` (30s heartbeat)
- ✅ Created `services/agent_relay/main.py` — lightweight FastAPI relay (port 8011): `GET /relay/agents`, `POST /relay/dispatch-task`, `WebSocket /ws/agent/{agent_id}`

#### D9 · Rust Ingest Binary ✅
- ✅ Created `ingest/Cargo.toml` — tokio, serde, clap, xml-rs, thiserror, chrono
- ✅ Created `ingest/src/schema.rs` — `Finding`, `SeverityLevel`, `IngestResult`
- ✅ Created `ingest/src/parsers/nmap.rs` — xml-rs event reader, port→severity
- ✅ Created `ingest/src/parsers/nikto.rs` — text line parser
- ✅ Created `ingest/src/parsers/nuclei.rs` — JSONL parser
- ✅ Created `ingest/src/main.rs` — clap CLI, tracing, outputs JSON to stdout or file
- ✅ Created `ingest/src/error.rs` — `ParseError` with thiserror

#### D10 · Agent Integration in Docker Compose ✅
- ✅ Added `agent-relay` service (port 8011) to `docker-compose.yml`

---

### Phase E — Cross-Layer Intelligence & Sync
**Goal**: Data from CLI agents, web dashboard scans, and API calls all flow into a unified findings graph. AI can correlate across sources.
**Effort**: ~2 weeks

#### E1 · Unified Findings Schema
- Modify `services/common/models.py` — add `source` field to `Finding`: `"web_scan" | "agent_local" | "api" | "integration"`
- Migrate: `alembic revision --autogenerate -m "add_finding_source"`

#### E2 · Cross-Source AI Correlation
- Modify `services/ai_service/main.py` — add `POST /correlate` endpoint
  - Accepts list of findings from any source
  - Groups by target, CVE ID, technique
  - Returns correlation graph (nodes = targets, edges = shared vulnerabilities)
  - Uses ChromaDB vector similarity to find related historical findings

#### E3 · Unified Dashboard Timeline
- Create `frontend/src/pages/TimelinePage.tsx`
  - Global event timeline across all scan sources
  - Filters: source type, severity, date range, target
  - Click event → drill-down to finding detail

#### E4 · Notification System
- Create `services/notification_service/main.py` (new service, port 8012)
  - Channels: email (SMTP), Slack webhook, webhook POST
  - Triggers: scan complete, critical finding, agent disconnected
  - Endpoints: `POST /notify/config`, `POST /notify/test`
- Modify `services/scan_service/main.py` — publish scan events to RabbitMQ
- Notification service consumes from RabbitMQ queue

---

### Phase F — Advanced AI & Agentic Workflows
**Goal**: The AI layer becomes a true autonomous agent that can plan multi-step security assessments, use local tools via the CLI agent, and self-improve from results.
**Effort**: ~3–4 weeks

#### F1 · LangGraph Multi-Agent Workflow
- Modify `services/ai_service/agent.py` — add `build_langgraph_workflow()` function
- Create `services/ai_service/langgraph_flow.py`
  - Nodes: `recon_node`, `scan_node`, `analyze_node`, `report_node`
  - Each node calls the corresponding microservice via HTTP
  - State: `{ target, recon_results, scan_results, ai_findings, report_url }`
  - Uses LangGraph `StateGraph` + conditional edges
- Endpoint: `POST /ai/workflow/start` — kicks off the full automated assessment pipeline

#### F2 · AI-Dispatched Local Tool Tasks
- Modify `services/ai_service/main.py` — add `POST /ai/dispatch-task`
  - AI decides which tool to run based on recon results
  - Publishes task to agent via `agent_relay` WebSocket
  - E.g. "found port 80 open → run nikto against it"

#### F3 · RAG Knowledge Base Expansion
- Create `services/ai_service/kb_loader.py`
  - Ingests: NVD CVE JSON feeds, MITRE ATT&CK STIX, OWASP Top 10 docs
  - Runs nightly via APScheduler
  - Updates ChromaDB collection
- Create `scripts/load_kb.py` — one-shot manual KB load script

#### F4 · Local LLM Support
- Modify `services/ai_service/agent.py` — detect `OLLAMA_BASE_URL` env var
- If set, use `langchain_community.llms.Ollama` instead of OpenAI
- Document in `.env.example`: `OLLAMA_BASE_URL=http://localhost:11434`
- Add `requirements-local-llm.txt` entries: `langchain-community>=0.3`, `ollama>=0.1`
  (file already exists — add entries)

---

### Phase G — Compliance, Enterprise & Polish
**Goal**: The platform is production-hardened, enterprise-ready, and delightful to use.
**Effort**: ~3–4 weeks

#### G1 · TLS Everywhere
- Modify `docker-compose.yml` — add Traefik Let's Encrypt TLS configuration
- Add `traefik.yml` static config file: `certificatesResolvers.letsencrypt`
- Update all internal service-to-service calls to use HTTPS

#### G2 · Observability Stack
- Add to `docker-compose.yml`:
  - Grafana (port 3001) — dashboards for scan throughput, AI latency, agent connections
  - Prometheus (port 9090) — scrapes all services `/metrics` endpoint
  - Loki — log aggregation
- Create `infrastructure/grafana/dashboards/cosmicsec_overview.json` — pre-built dashboard
- Verify `prometheus-client` metrics are exported in all services

#### G3 · Terraform Infrastructure
- Create `infrastructure/terraform/` directory
  - `main.tf` — provider config (AWS / GCP / Azure selectable)
  - `modules/postgres/` — managed RDS
  - `modules/redis/` — ElastiCache
  - `modules/k8s/` — EKS cluster with Helm chart for CosmicSec

#### G4 · Kubernetes Helm Chart
- Create `helm/cosmicsec/` chart
  - `Chart.yaml`, `values.yaml`
  - Templates for each service deployment + service + ingress
  - ConfigMap for environment variables
  - PersistentVolumeClaims for data

#### G5 · Rate Limit Tuning & WAF Rules
- Modify `services/api_gateway/main.py` — per-user rate limits from DB (not just IP)
- Add Traefik middleware for basic WAF rules (block common SQLi/XSS patterns in query strings)

#### G6 · Audit Log Export & SIEM Integration
- Modify `services/admin_service/cli.py` — `cosmicsec audit export --format json|csv|syslog`
- Create `services/integration_service/siem_connector.py`
  - Sends audit events to Splunk / Elastic SIEM via CEF format

#### G7 · Full End-to-End Tests
- Create `tests/e2e/test_hybrid_flow.py`
  - Full flow: register user → login → launch scan → receive results → generate report
- Create `tests/e2e/test_agent_flow.py`
  - Simulate CLI agent: register → run tool → stream results → verify in dashboard
- Create `tests/e2e/test_static_flow.py`
  - Verify unauthenticated requests get demo data

#### G8 · CLI Agent Package Distribution
- Create `cli/agent/README.md` — install guide
- Publish to PyPI: `pip install cosmicsec-agent`
- Create `cli/agent/.github/workflows/publish.yml` — auto-publish on tag

#### G9 · Mobile-Responsive Dashboard
- Audit all frontend pages for mobile breakpoints
- Add hamburger menu for sidebar on small screens
- Test at 375px, 768px, 1280px viewports

#### G10 · Accessibility (a11y)
- Add ARIA labels to all interactive elements
- Ensure keyboard navigation works throughout dashboard
- Run `axe-core` in Playwright tests

---

## 7. Hybrid Decision Flow Diagram

```
Request arrives at API Gateway
         │
         ▼
┌──────────────────────────┐
│ Has valid JWT token?      │
└──────┬───────────────────┘
       │ No                  Yes
       ▼                     ▼
┌─────────────────┐   ┌─────────────────────────────┐
│ X-Platform-Mode │   │ Check user role & scope       │
│ header present? │   │ (casbin RBAC)                 │
└────────┬────────┘   └──────────────┬────────────────┘
    Yes  │ No              Allowed   │ Denied
         ▼                           │        │
  Use header mode         ┌──────────▼──┐   ┌─▼──────────────┐
  (STATIC/DEMO/etc.)      │ DYNAMIC mode│   │ 403 Forbidden  │
                          │ Proxy to    │   └────────────────-┘
┌────────────────────┐    │ microservice│
│ STATIC or DEMO?    │    └──────┬──────┘
└──────┬─────────────┘           │
  Yes  │                         │ Service unavailable?
       ▼                         ▼
┌───────────────────┐   ┌──────────────────────┐
│ Return static     │   │ HYBRID fallback:      │
│ profile/demo data │   │ return static profile │
└───────────────────┘   │ + _contract.degraded  │
                        │ = true                │
                        └──────────────────────-┘

─── Separate path ───────────────────────────────────────────
CLI Agent WebSocket connection:
         │
         ▼
┌─────────────────────────────────┐
│ /ws/agent/{agent_id}            │
│ Authenticate with API key       │
│ Receive task JSON from server   │
│ Execute tool locally            │
│ Stream findings JSON to server  │
│ Server stores in scan_service   │
└─────────────────────────────────┘
```

---

## 8. File & Directory Target Structure

```
CosmicSec/
├── alembic/
│   └── versions/
│       ├── 0001_initial_placeholder.py  ← DELETE
│       └── 0002_initial_schema.py       ← CREATE (autogenerate)
│
├── cli/                                 ← NEW: CLI agent package
│   ├── agent/
│   │   ├── cosmicsec_agent/
│   │   │   ├── __init__.py
│   │   │   ├── main.py                  ← Typer CLI entry point
│   │   │   ├── tool_registry.py         ← discovers local tools
│   │   │   ├── executor.py              ← async subprocess runner
│   │   │   ├── stream.py                ← WebSocket client
│   │   │   ├── offline_store.py         ← SQLite local store
│   │   │   └── parsers/
│   │   │       ├── __init__.py
│   │   │       ├── nmap_parser.py
│   │   │       ├── nikto_parser.py
│   │   │       ├── nuclei_parser.py
│   │   │       └── gobuster_parser.py
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── README.md
│
├── cosmicsec_platform/
│   ├── contracts/
│   │   └── runtime_metadata.py          ← existing
│   └── middleware/
│       ├── hybrid_router.py             ← existing, minor updates
│       ├── policy_registry.py           ← existing
│       └── static_profiles.py          ← expand with more demo handlers
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.tsx          ← NEW
│   │   ├── router/
│   │   │   └── ProtectedRoute.tsx       ← NEW
│   │   ├── store/
│   │   │   ├── scanStore.ts             ← NEW (Zustand)
│   │   │   └── notificationStore.ts    ← NEW
│   │   ├── hooks/
│   │   │   └── useScanStream.ts         ← NEW (WebSocket)
│   │   ├── data/
│   │   │   └── demoFixtures.ts          ← NEW (static demo data)
│   │   ├── components/
│   │   │   ├── ui/button.tsx            ← existing
│   │   │   ├── ScanCard.tsx             ← NEW
│   │   │   ├── FindingCard.tsx          ← NEW
│   │   │   └── Sidebar.tsx              ← NEW
│   │   └── pages/
│   │       ├── LandingPage.tsx          ← NEW
│   │       ├── DemoSandboxPage.tsx      ← NEW
│   │       ├── PricingPage.tsx          ← NEW
│   │       ├── ScanPage.tsx             ← NEW
│   │       ├── ScanDetailPage.tsx       ← NEW
│   │       ├── ReconPage.tsx            ← NEW
│   │       ├── AIAnalysisPage.tsx       ← NEW
│   │       ├── ProfilePage.tsx          ← NEW
│   │       ├── AdminDashboardPage.tsx   ← existing
│   │       └── ...
│   └── vitest.config.ts                 ← REPLACE jest.config.cjs
│
├── ingest/                              ← NEW: Rust ingest binary
│   ├── src/
│   │   ├── main.rs
│   │   ├── schema.rs
│   │   └── parsers/
│   │       ├── nmap.rs
│   │       ├── nikto.rs
│   │       └── nuclei.rs
│   └── Cargo.toml
│
├── sdk/
│   ├── go/client.go                     ← existing, expand
│   ├── javascript/client.js             ← existing (keep for compat)
│   ├── python/cosmicsec_sdk/            ← existing
│   └── typescript/                      ← NEW: typed TS SDK
│       ├── src/
│       │   ├── client.ts
│       │   ├── types.ts
│       │   └── agent.ts
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   ├── agent_relay/                     ← NEW: agent WebSocket relay
│   │   └── main.py
│   ├── notification_service/            ← NEW: email/Slack/webhook
│   │   └── main.py
│   ├── ai_service/
│   │   ├── langgraph_flow.py            ← NEW: multi-agent workflow
│   │   └── kb_loader.py                ← NEW: nightly KB refresh
│   └── common/
│       └── models.py                   ← expand with all tables
│
├── infrastructure/
│   ├── grafana/
│   │   └── dashboards/
│   │       └── cosmicsec_overview.json  ← NEW
│   ├── terraform/                       ← NEW
│   │   ├── main.tf
│   │   └── modules/
│   └── init-db.sql                      ← existing
│
└── helm/                                ← NEW: Kubernetes chart
    └── cosmicsec/
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
```

---

## 9. API Contract Conventions

> All AI agents generating CosmicSec code must follow these conventions.

### Response Envelope (Gateway-routed responses)
Every response from the API Gateway includes a `_runtime` and `_contract` field:
```json
{
  "data": "...",
  "_runtime": {
    "mode": "dynamic|static|hybrid|demo|emergency",
    "route": "dynamic|static|static_fallback|policy_denied",
    "degraded": false,
    "trace_id": "uuid",
    "latency_ms": 42.1
  },
  "_contract": {
    "schema": "cosmicsec-hybrid-v1",
    "version": "1.0",
    "degraded": false,
    "consumer_hint": "Check _runtime.route and _contract.degraded before privileged actions."
  }
}
```

### Agent Stream Message Format
```json
{
  "type": "finding|scan_complete|tool_log|error|heartbeat",
  "agent_id": "agent-abc123",
  "scan_id": "scan-xyz789",
  "payload": {
    "title": "Open port 22 (SSH)",
    "severity": "low",
    "description": "...",
    "evidence": "nmap output line",
    "tool": "nmap",
    "target": "192.168.1.1",
    "timestamp": "2026-04-13T18:00:00Z"
  }
}
```

### Auth Headers
```
Authorization: Bearer <JWT>           # web dashboard users
X-API-Key: <api_key>                  # CLI agents
X-Platform-Mode: static|demo|dynamic  # override routing (dev/test only)
```

### Error Format
```json
{
  "detail": "Human readable error",
  "error_code": "SCAN_NOT_FOUND",
  "trace_id": "uuid"
}
```

---

## 10. AI Agent Instructions (Coding Prompts)

> Copy-paste these prompts when using an AI coding assistant to implement specific phases.

### For Phase A (Foundation Hardening)
```
You are implementing Phase A of CosmicSec.
Repository: /home/runner/work/CosmicSec/CosmicSec
Task: Generate a real Alembic migration by reading services/common/models.py
and creating alembic/versions/0002_initial_schema.py.
The migration must create tables: users, scans, findings, sessions, 
audit_logs, api_keys, agent_sessions.
Use SQLAlchemy 2.0 declarative style. Follow the existing code style.
Do not modify any other files.
```

### For Phase B (Public/Static Frontend)
```
You are implementing Phase B of CosmicSec.
Repository: /home/runner/work/CosmicSec/CosmicSec
Task: Create frontend/src/context/AuthContext.tsx and 
frontend/src/router/ProtectedRoute.tsx.
AuthContext must: persist JWT token in localStorage, expose 
useAuth() hook with { user, token, isLoading, login, logout }.
ProtectedRoute must: redirect to /auth/login if no token.
Then modify frontend/src/App.tsx to wrap protected routes.
Use React 18 + TypeScript + TailwindCSS. No new dependencies.
Follow existing code style (functional components, named exports).
```

### For Phase D (CLI Agent)
```
You are implementing Phase D of CosmicSec — the CLI local agent.
Create cli/agent/cosmicsec_agent/tool_registry.py.
This module must:
1. Use shutil.which() to detect if each tool is installed.
2. Run version commands like "nmap --version" and parse the first line.
3. Return a list of ToolInfo dataclasses: {name, path, version, capabilities}.
4. Known tools: nmap, nikto, sqlmap, gobuster, ffuf, masscan, nuclei, hydra.
5. Pure stdlib only — no third-party imports in this file.
Use Python 3.11+, type hints, dataclasses. Follow PEP 8.
```

### For Phase D (Rust Ingest)
```
You are implementing the Rust ingest binary for CosmicSec.
Create ingest/Cargo.toml and ingest/src/main.rs.
Requirements:
- Parse nmap XML output (use xml-rs crate)
- Produce Finding structs: {title, severity, description, target, tool, timestamp}
- Bulk insert to PostgreSQL table "findings" using sqlx with tokio runtime
- CLI: cosmicsec-ingest --input file.xml --format nmap --db postgresql://...
- Use Rust 2024 edition, async/await, proper error handling with thiserror
```

### For Phase F (LangGraph)
```
You are implementing Phase F of CosmicSec — LangGraph multi-agent workflow.
File to create: services/ai_service/langgraph_flow.py
Requirements:
- Use LangGraph StateGraph with nodes: recon_node, scan_node, analyze_node, report_node
- State TypedDict: { target: str, recon_results: dict, scan_results: list, ai_findings: list, report_url: str }
- Each node makes HTTP calls to the corresponding microservice
- Conditional edge: if recon finds open ports → add scan_node; else → skip to analyze_node
- Fallback: if any node fails, continue with empty data (graceful degradation)
- Add POST /ai/workflow/start endpoint to services/ai_service/main.py
```

---

## Quick Reference: Environment Variables

```env
# Required
JWT_SECRET_KEY=                    # Strong random secret
POSTGRES_PASSWORD=                 # PostgreSQL password
REDIS_PASSWORD=                    # Redis password

# Optional (enable features)
OPENAI_API_KEY=                    # Enables real AI (vs template fallback)
OLLAMA_BASE_URL=http://localhost:11434  # Local LLM
SHODAN_API_KEY=                    # Enriches recon
VIRUSTOTAL_API_KEY=                # Enriches recon
MONGO_PASSWORD=                    # MongoDB password
RABBITMQ_PASSWORD=                 # RabbitMQ password

# Hybrid mode control
PLATFORM_RUNTIME_MODE=hybrid       # static|dynamic|hybrid|demo|emergency
COSMICSEC_DYNAMIC_CANARY_PERCENT=0 # % of traffic to force-dynamic (0-100)
COSMICSEC_TRACE_EXPORT_URL=        # Optional trace export endpoint

# CLI Agent (client-side)
COSMICSEC_API_URL=https://api.cosmicsec.io
COSMICSEC_API_KEY=                 # User API key for agent auth
COSMICSEC_AGENT_OFFLINE=false      # Force offline mode
```

---

## Progress Tracker

Use this checklist to track implementation. Check off items as they are completed.

### Phase A — Foundation Hardening ✅ COMPLETE (100%)
- [x] A1 · Real Alembic migrations (all tables)
- [x] A2 · Replace Flake8+isort with Ruff
- [x] A3 · Replace Jest with Vitest in frontend
- [x] A4 · Persistent state for in-memory services (bugbounty, phase5, collab, integration)
- [x] A5 · Upgrade frontend to React 19 + TailwindCSS 4

### Phase B — Public Static Layer ✅ COMPLETE (100%)
- [x] B1 · AuthContext + ProtectedRoute
- [x] B2 · Landing page (`/`)
- [x] B3 · Demo sandbox page (`/demo`)
- [x] B4 · Pricing page (`/pricing`)
- [x] B5 · Expand static profiles in API gateway

### Phase C — Registered Dashboard ✅ COMPLETE (100%)
- [x] C1 · Scan launch + scan detail page + `useScanStream` hook
- [x] C2 · Recon results page
- [x] C3 · AI analysis page
- [x] C4 · User profile + API key management
- [x] C5 · Global state (Zustand stores)
- [x] C6 · Sidebar navigation + responsive layout

### Phase D — CLI Local-Agent ✅ COMPLETE (100%)
- [x] D1 · `cosmicsec-agent` Python package scaffold
- [x] D2 · `tool_registry.py` — local tool discovery
- [x] D3 · `executor.py` — async subprocess tool runner
- [x] D4 · Output parsers (nmap, nikto, nuclei, gobuster)
- [x] D5 · `offline_store.py` — SQLite local persistence
- [x] D6 · `stream.py` — WebSocket client with offline queue
- [x] D7 · `main.py` — full Typer CLI app
- [x] D8 · Server-side agent session endpoints + WebSocket relay
- [x] D9 · Rust ingest binary
- [x] D10 · Agent relay service in docker-compose

### Phase E — Cross-Layer Intelligence ⬜ TODO
- [ ] E1 · Unified findings schema with `source` field
- [ ] E2 · Cross-source AI correlation endpoint
- [ ] E3 · Unified timeline page in frontend
- [ ] E4 · Notification service (email/Slack/webhook)

### Phase F — Advanced AI & Agentic Workflows ⬜ TODO
- [ ] F1 · LangGraph multi-agent security workflow
- [ ] F2 · AI-dispatched local tool tasks
- [ ] F3 · Nightly RAG KB expansion (NVD, MITRE, OWASP)
- [ ] F4 · Local LLM (Ollama) support

### Phase G — Compliance, Enterprise & Polish ⬜ TODO
- [ ] G1 · TLS everywhere (Traefik Let's Encrypt)
- [ ] G2 · Grafana + Prometheus + Loki observability stack
- [ ] G3 · Terraform infrastructure modules
- [ ] G4 · Kubernetes Helm chart
- [ ] G5 · Rate limit tuning + WAF rules
- [ ] G6 · Audit log export + SIEM integration
- [ ] G7 · Full end-to-end tests (hybrid flow, agent flow, static flow)
- [ ] G8 · CLI agent PyPI publishing
- [ ] G9 · Mobile-responsive dashboard
- [ ] G10 · Accessibility (a11y) audit + fixes
