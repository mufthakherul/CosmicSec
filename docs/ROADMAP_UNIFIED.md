# CosmicSec — Unified Platform Roadmap

> **Canonical roadmap** — the single source of truth for all future planning.
> **Version**: 1.0.0 (2026-04-17)
> **Audience**: Human developers, AI coding agents (Copilot, Claude, Codex), project managers, security professionals
> **Archived history**: [`docs/archive/roadmaps/`](archive/roadmaps/)

---

## How to Read This Document

This document follows a strict schema so both humans and AI coding agents can parse, act on, and validate each item.

Every roadmap phase and task uses this structure:

```
Phase X — [Title]
├── 🎯 Goal            One-sentence objective.
├── 📋 Prerequisites   Phases or conditions that must be satisfied first.
├── 🛡️ Security        Hard security constraints; never relax these.
├── 🔧 Tasks           Numbered items. Each task contains:
│   ├── Description    Plain-English "what" and "why".
│   ├── Scope          Exact files / services to touch.
│   ├── AI Agent Prompt  Copy-paste prompt for a coding agent.
│   ├── Validation     Commands or checks to verify completion.
│   └── Rollback       How to undo if the task introduces a regression.
├── 🧪 Acceptance      Definition-of-Done checklist.
└── 📦 Dependencies    New libraries or services required.
```

> **Rule**: The unified roadmap is the only file that may carry `status: active`.
> Archived files in `docs/archive/roadmaps/` are frozen historical snapshots.

---

## Progress Board

| Wave | Title | Status | Target |
|------|-------|--------|--------|
| [Wave 1](#wave-1--archive--unified-roadmap--gap-baseline) | Archive + Unified Roadmap + Gap Baseline | ✅ In Progress | v1.1 |
| [Wave 2](#wave-2--isolation-first-local-profile--guest-sandbox--endpoint-hardening) | Isolation-First + Guest Sandbox + Endpoint Hardening | 🔜 Planned | v1.2 |
| [Wave 3](#wave-3--new-access-modes--hybrid-session-handoff) | New Access Modes + Hybrid Session Handoff | 🔜 Planned | v1.3 |
| [Wave 4](#wave-4--tooling-expansion--plugin-trust--final-validation) | Tooling Expansion + Plugin Trust + Final Validation | 🔜 Planned | v1.4 |

Legend: ✅ Complete · 🔄 In Progress · 🔜 Planned · 🚧 Blocked

---

## Table of Contents

1. [Platform Overview & Principles](#1-platform-overview--principles)
2. [Access-Mode Capability Matrix](#2-access-mode-capability-matrix)
3. [Architecture Overview](#3-architecture-overview)
4. [Gap Analysis Baseline](#4-gap-analysis-baseline)
5. [Technology Stack](#5-technology-stack)
6. [Wave 1 — Archive, Unified Roadmap & Gap Baseline](#wave-1--archive--unified-roadmap--gap-baseline)
7. [Wave 2 — Isolation-First Local Profile, Guest Sandbox & Endpoint Hardening](#wave-2--isolation-first-local-profile--guest-sandbox--endpoint-hardening)
8. [Wave 3 — New Access Modes & Hybrid Session Handoff](#wave-3--new-access-modes--hybrid-session-handoff)
9. [Wave 4 — Tooling Expansion, Plugin Trust & Final Validation](#wave-4--tooling-expansion--plugin-trust--final-validation)
10. [AI Agent Execution Guide](#10-ai-agent-execution-guide)
11. [Definition of Done — Master Checklist](#11-definition-of-done--master-checklist)

---

## 1. Platform Overview & Principles

CosmicSec is an **AI-native, hybrid cybersecurity intelligence platform** that unifies vulnerability scanning, recon, AI analysis, reporting, collaboration, and local-agent execution into a single platform accessible through multiple surfaces.

### Design Principles

| # | Principle | Meaning |
|---|-----------|---------|
| P1 | **Isolation-First** | Users with sensitive data must be able to run entirely offline with zero uploads. |
| P2 | **Ethical Use Only** | No offensive, unauthorized, or destructive use. All tooling is read/reconnaissance/audit by default. |
| P3 | **Hybrid by Default** | Every feature must work in at least two modes (cloud + local or demo + live). |
| P4 | **Security is Non-Negotiable** | Auth, encryption, and rate-limits are not optional. Never degrade security for convenience. |
| P5 | **AI-Assisted, Human-Controlled** | AI surfaces recommendations; humans approve actions. AI must never execute destructive commands autonomously. |
| P6 | **Progressive Disclosure** | Simple for beginners, powerful for experts. Complexity must be opt-in. |
| P7 | **Observability Everywhere** | Every mode must emit metrics, traces, and audit logs. |

---

## 2. Access-Mode Capability Matrix

CosmicSec currently has three operation modes. This roadmap formally extends the model to eight modes.

### Current Modes (Stable)

| Mode | Key | User | Execution | Auth | Data Residency |
|------|-----|------|-----------|------|----------------|
| Static / Public | `STATIC` | Unregistered browser | Server-pre-rendered | None | Server (demo data only) |
| Dynamic / Dashboard | `DYNAMIC` | Registered browser user | Cloud microservices | JWT / OAuth2 | Cloud / self-hosted |
| Local / CLI | `LOCAL` | CLI agent user | User's machine | API key + JWT | User's machine (optional cloud sync) |

### Planned Modes (Waves 2–3)

| Mode | Key | User | Execution | Auth | Data Residency | Priority |
|------|-----|------|-----------|------|----------------|----------|
| Local Web | `LOCAL_WEB` | Isolated browser (LAN/offline) | Local server (`cosmicsec serve`) | API key or local session token | Local only — zero cloud egress | Wave 2 |
| Desktop Offline | `DESKTOP_OFFLINE` | Air-gapped analyst | Electron or Tauri shell | Local keypair + optional cloud sync | Local encrypted store only | Wave 3 |
| Mobile Companion | `MOBILE_COMPANION` | Mobile SOC analyst | React Native / Expo | JWT from cloud auth | Cloud read; mobile cache for offline triage | Wave 3 |
| Automation API | `AUTOMATION_API` | CI/CD pipeline, scripts, SDKs | SDK (Python / TS / Go) | API key + per-key scoped permissions | Cloud or self-hosted | Wave 3 |
| ChatOps | `CHATOPS` | Slack / Teams / Webhook bots | Bot relay service | Bot token (scoped) | Cloud; message ephemeral | Wave 3 |

### Capability Grid

| Capability | STATIC | DYNAMIC | LOCAL | LOCAL_WEB | DESKTOP_OFFLINE | MOBILE_COMPANION | AUTOMATION_API | CHATOPS |
|-----------|--------|---------|-------|-----------|-----------------|-----------------|----------------|---------|
| View demo data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Run live scan | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ (trigger) |
| Run exploit tools | ❌ | ❌ | ⚠️ opt-in | ❌ | ⚠️ opt-in | ❌ | ❌ | ❌ |
| AI analysis | ❌ | ✅ | ✅ | ✅ | ✅ (local LLM) | ✅ (summary) | ✅ | ✅ (summary) |
| Store findings | ❌ | ✅ | ✅ | ✅ | ✅ (local) | ✅ (sync) | ✅ | ❌ |
| Sync to cloud | ❌ | ✅ | optional | optional | optional | ✅ | ✅ | ✅ |
| Team collab | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ (view) | ❌ | ✅ |
| Offline mode | ✅ | ❌ | ✅ | ✅ | ✅ | partial | ❌ | ❌ |
| Generate reports | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ (view) | ✅ | trigger |
| Guest command sandbox | ✅ (Wave 2) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  USER LAYER                                  │
│                                                                              │
│  [Browser/STATIC]  [Browser/DYNAMIC]  [CLI/LOCAL]  [Mobile]  [SDK/Bots]    │
│  STATIC            DYNAMIC             LOCAL        MOBILE    AUTOMATION     │
│                                                     CHATOPS                  │
└─────────┬──────────────┬─────────────────┬──────────┬─────────┬─────────────┘
          │              │                 │          │         │
          ▼              ▼                 │          ▼         ▼
┌──────────────────────────────────────┐  │  ┌──────────────────────────────┐
│       Traefik v3 (Edge Gateway)      │  │  │   Agent Relay :8011          │
│  TLS · Rate Limit · WAF · LB        │  │  │  CLI / SDK / Bot WebSocket   │
└──────────────────┬───────────────────┘  │  └──────────────┬───────────────┘
                   │                      │                 │
                   ▼                      ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│             CosmicSec API Gateway :8000                                      │
│  HybridRouter (STATIC/DYNAMIC/LOCAL/LOCAL_WEB/DEMO/EMERGENCY)                │
│  Auth middleware · RBAC · Rate limiter · WAF · WebSocket hub                 │
│  OpenTelemetry · Prometheus · GraphQL runtime                                │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────────────────────────┐
        ▼                        ▼                                             ▼
┌─────────────┐    ┌─────────────────────────────────────┐    ┌─────────────────┐
│ Static CDN  │    │       Backend Microservices           │    │  CLI Local Agent│
│ (STATIC /   │    │  Auth · Scan · AI · Recon · Report   │    │  (Python + Rust)│
│  DEMO mode) │    │  Collab · Plugins · Integration       │    │  nmap/nikto/etc │
└─────────────┘    │  BugBounty · Phase5 · Admin · Notify │    │  offline store  │
                   └────────────────┬────────────────────┘    └─────────────────┘
                                    │
           ┌────────────────────────┼───────────────────────────────────┐
           ▼                        ▼                                   ▼
     PostgreSQL                MongoDB + Redis                  Elasticsearch
     (core data)                (OSINT / cache)                 (logs / search)
```

### Microservices

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | HybridRouter, RBAC, WebSocket hub, rate limiting, Prometheus, GraphQL |
| Auth Service | 8001 | JWT, OAuth2, TOTP/2FA, Casbin RBAC, session management |
| Scan Service | 8002 | Distributed scanner, smart orchestration, continuous monitoring, Celery |
| AI Service | 8003 | LangChain + LangGraph, ChromaDB, MITRE ATT&CK, anomaly detection, Ollama |
| Recon Service | 8004 | DNS, Shodan, VirusTotal, crt.sh, RDAP passive recon |
| Report Service | 8005 | Multi-format reports, compliance templates, attack-path visualization |
| Collab Service | 8006 | WebSocket rooms, presence tracking, team chat, @mentions |
| Plugin Registry | 8007 | Plugin SDK, signed plugin enforcement, official plugins |
| Integration Svc | 8008 | SIEM (Splunk/Elastic), third-party integrations hub |
| Bug Bounty Svc | 8009 | HackerOne / Bugcrowd / Intigriti, submission workflow |
| Phase 5 / SOC | 8010 | SOC ops, incident response, SAST, DevSecOps CI gates |
| Agent Relay | 8011 | CLI/SDK/bot WebSocket hub, task dispatch, auth validation |
| Notification Svc | 8012 | Email, Slack, webhook notifications |

---

## 4. Gap Analysis Baseline

The following gaps are tracked for Wave 2–4 work. Priority: 🔴 Critical → 🟠 High → 🟡 Medium.

| ID | Gap | Affects Mode(s) | Wave | Status |
|----|-----|-----------------|------|--------|
| G-01 | No isolation/no-cloud local profile — users cannot guarantee zero upload | LOCAL, LOCAL_WEB | W2 | Open |
| G-02 | No guest command sandbox — unregistered users see only pre-rendered demo, no live read-only ops | STATIC | W2 | Open |
| G-03 | Dashboard summary/overview endpoints lack explicit auth enforcement (open to any bearer token) | DYNAMIC | W2 | Open |
| G-04 | Mobile companion (`mobile/`) is a static mock — no backend auth or real API sync | MOBILE_COMPANION | W2–W3 | Open |
| G-05 | `LOCAL_WEB` mode (local browser over `cosmicsec serve`) not formally defined or implemented | LOCAL_WEB | W2 | Open |
| G-06 | No hybrid session handoff — CLI and web sessions are independent, no cross-mode context transfer | ALL | W3 | Open |
| G-07 | No desktop/air-gapped client — analysts without network access have no supported path | DESKTOP_OFFLINE | W3 | Open |
| G-08 | `AUTOMATION_API` mode not a first-class concept — SDK usage shares same auth path as browsers | AUTOMATION_API | W3 | Open |
| G-09 | `CHATOPS` mode not designed — no bot relay, no scoped bot tokens | CHATOPS | W3 | Open |
| G-10 | Tool registry covers 14 tools — cloud/K8s/IaC/SBOM/SCA tooling absent | LOCAL, LOCAL_WEB | W4 | Open |
| G-11 | No plugin trust model — plugins lack signed provenance or permission scoping | ALL | W4 | Open |
| G-12 | Directory structure doc (`docs/DIRECTORY_STRUCTURE.md`) is out of date (missing archive, mobile, etc.) | Docs | W1 | Open |
| G-13 | In-memory fallback paths remain in agent relay and plugin registry for production-critical flows | DYNAMIC | W2 | Open |
| G-14 | No formal Definition of Done template — each feature has inconsistent acceptance criteria | ALL | W1 | Open |

---

## 5. Technology Stack

| Language | Role | Where |
|----------|------|-------|
| Python 3.13 | Core services, AI/ML, orchestration, CLI | All FastAPI microservices, CLI agent |
| Rust | High-throughput ingest parser, Rust acceleration scaffold | `ingest/` |
| Go 1.24 | Event broker, lightweight sidecars | `broker/` |
| TypeScript 5.9+ | Frontend SPA, TypeScript SDK | `frontend/`, `sdk/typescript/` |
| SQL / PostgreSQL 16+ | Schema, migrations, analytics | `alembic/`, `infrastructure/` |
| React Native / Expo | Mobile companion client | `mobile/` |
| HCL / Terraform | Infrastructure as Code | `infrastructure/terraform/` |

---

## Wave 1 — Archive, Unified Roadmap & Gap Baseline

> 🎯 **Goal**: Consolidate three fragmented roadmap files into one canonical document, establish gap tracking, and repair documentation drift.
>
> 📋 **Prerequisites**: None.
>
> 🛡️ **Security**: No code changes in this wave. Documentation only.
>
> 🌐 **Languages**: Markdown only.

### W1.1 — Roadmap Archive & Redirect Stubs ✅

**Description**: Move the three old roadmap files to `docs/archive/roadmaps/` as read-only historical snapshots. Leave redirect stubs at the original paths so existing bookmarks and CI references resolve.

**Scope**:
- `ROADMAP.md` → redirect stub (links to `docs/ROADMAP_UNIFIED.md`)
- `ROADMAP_NEXT.md` → redirect stub
- `ROADMAP_CLI_AGENT.md` → redirect stub
- `docs/archive/roadmaps/ROADMAP_ORIGINAL.md` — archived copy of `ROADMAP.md`
- `docs/archive/roadmaps/ROADMAP_NEXT_ORIGINAL.md` — archived copy of `ROADMAP_NEXT.md`
- `docs/archive/roadmaps/ROADMAP_CLI_AGENT_ORIGINAL.md` — archived copy of `ROADMAP_CLI_AGENT.md`
- `docs/archive/roadmaps/README.md` — archive index

**AI Agent Prompt**:
```
In the CosmicSec repository root:
1. Copy ROADMAP.md to docs/archive/roadmaps/ROADMAP_ORIGINAL.md.
2. Prepend an archival header: "> ⚠️ ARCHIVED — read-only. Active planning: docs/ROADMAP_UNIFIED.md"
3. Replace ROADMAP.md with a one-paragraph redirect stub pointing to docs/ROADMAP_UNIFIED.md.
4. Repeat for ROADMAP_NEXT.md and ROADMAP_CLI_AGENT.md.
5. Create docs/archive/roadmaps/README.md listing all archived files.
```

**Validation**:
```bash
test -f docs/archive/roadmaps/ROADMAP_ORIGINAL.md
test -f docs/archive/roadmaps/ROADMAP_NEXT_ORIGINAL.md
test -f docs/archive/roadmaps/ROADMAP_CLI_AGENT_ORIGINAL.md
grep "ARCHIVED" docs/archive/roadmaps/ROADMAP_ORIGINAL.md
grep "ROADMAP_UNIFIED" ROADMAP.md
```

**Rollback**: Restore from git history (`git checkout HEAD~1 ROADMAP.md ROADMAP_NEXT.md ROADMAP_CLI_AGENT.md`).

**Acceptance**:
- [x] Archive directory exists and contains all three historical files
- [x] Each archived file has an archival header
- [x] Root stub files redirect to unified roadmap
- [x] `docs/archive/roadmaps/README.md` lists all contents

---

### W1.2 — Unified Roadmap Creation ✅

**Description**: Create this file (`docs/ROADMAP_UNIFIED.md`) as the single canonical roadmap. Follows the schema defined in [How to Read This Document](#how-to-read-this-document).

**Scope**: `docs/ROADMAP_UNIFIED.md` (this file)

**Acceptance**:
- [x] File created at `docs/ROADMAP_UNIFIED.md`
- [x] Contains progress board, access-mode matrix, gap analysis, technology stack
- [x] Covers all four waves with properly structured phases
- [x] Contains AI Agent Execution Guide and Definition of Done template

---

### W1.3 — Cross-Reference Updates ✅

**Description**: Update all files that previously referenced the old roadmap files.

**Scope**:
- `README.md` — roadmap link
- `docs/PROJECT_GOAL_AND_PROGRESS.md` — roadmap references
- `docs/DIRECTORY_STRUCTURE.md` — file listing
- `.github/PULL_REQUEST_TEMPLATE.md` — roadmap phase field
- `docs/runbooks/add-new-scanner-plugin.md` — checklist item
- `docs/runbooks/add-new-service.md` — checklist item

**Validation**:
```bash
grep -r "ROADMAP_NEXT" . --include="*.md" | grep -v "archive"
grep -r "ROADMAP_CLI_AGENT" . --include="*.md" | grep -v "archive"
# Both should return only redirect stubs and the archive README, not substantive references
```

**Acceptance**:
- [x] All substantive references updated
- [x] Only redirect stubs and archive index contain old file names

---

### W1.4 — Gap Baseline Documentation ✅

**Description**: Document the gap analysis (G-01 through G-14) in the unified roadmap so future waves have a clear starting baseline.

**Scope**: [Section 4 — Gap Analysis Baseline](#4-gap-analysis-baseline) in this file.

**Acceptance**:
- [x] All 14 gaps are listed with affected modes, wave, and status
- [x] Every Wave 2–4 phase traces back to at least one gap ID

---

## Wave 2 — Isolation-First Local Profile, Guest Sandbox & Endpoint Hardening

> 🎯 **Goal**: Make isolation-first local usage a first-class platform feature, give unregistered users safe limited command access, and lock down sensitive API surfaces.
>
> 📋 **Prerequisites**: Wave 1 complete.
>
> 🛡️ **Security constraints**:
> - Guest sandbox MUST use a hard allow-list. Deny by default. No exception.
> - No exploit, bruteforce, destructive, or wide-network-scanning commands in guest sandbox.
> - Endpoint hardening changes must not be reverted for convenience.
>
> 🌐 **Languages**: Python (backend), TypeScript (frontend), Markdown (docs).

### W2.1 — Isolation-First Local Profile

**Description**: Add `LOCAL_WEB` as a recognized runtime mode in `HybridRouter`. When active, the platform runs in a `cosmicsec serve` local process, all storage is routed to local SQLite/files, and all outbound cloud API calls are blocked by policy.

**Addresses**: G-01, G-05

**Scope**:
- `cosmicsec_platform/middleware/hybrid_router.py` — add `LOCAL_WEB` to `RuntimeMode`
- `cosmicsec_platform/middleware/policy_registry.py` — add `LOCAL_WEB` policies (deny cloud sync routes)
- `cosmicsec_platform/middleware/static_profiles.py` — add `local_web` profile variants
- `cli/agent/cosmicsec_agent/main.py` — add `serve` command that starts local web server
- `cli/agent/cosmicsec_agent/local_server.py` — NEW: minimal FastAPI app for local web mode
- `docs/runbooks/local-web-mode.md` — NEW: local web setup guide
- `docs/ROADMAP_UNIFIED.md` — mark W2.1 complete when done

**AI Agent Prompt**:
```
In cosmicsec_platform/middleware/hybrid_router.py:
1. Add LOCAL_WEB = "local_web" to the RuntimeMode enum.
2. In resolve_mode(): if request header X-CosmicSec-Mode == "local_web" OR
   env PLATFORM_RUNTIME_MODE == "local_web", return LOCAL_WEB.
3. In the routing logic, treat LOCAL_WEB like STATIC for cloud-bound routes
   (serve from local profiles) but like DYNAMIC for local-service routes.
4. Add LOCAL_WEB to the supported_modes list in /api/runtime/mode response.

In cosmicsec_platform/middleware/policy_registry.py:
Add policies for LOCAL_WEB: cloud sync routes → fallback_policy="disabled",
local storage routes → fallback_policy="allowed".

In cli/agent/cosmicsec_agent/main.py add a `serve` command:
  cosmicsec serve [--port 8080] [--no-cloud]
  - Starts a local FastAPI server serving the web UI from the installed package.
  - Sets PLATFORM_RUNTIME_MODE=local_web automatically.
  - With --no-cloud, sets env COSMICSEC_LOCAL_ONLY=1 which blocks all external calls.
```

**Security constraints**:
- `COSMICSEC_LOCAL_ONLY=1` must block outbound HTTP from all services, not just toggle a flag.
- Local data must be encrypted at rest using a user-derived key (e.g., argon2id + user password).
- Audit logs must always be written locally regardless of cloud sync status.

**Validation**:
```bash
# Mode registered
curl http://localhost:8000/api/runtime/mode | jq '.supported_modes | contains(["local_web"])'

# Local-only mode blocks outbound
PLATFORM_RUNTIME_MODE=local_web COSMICSEC_LOCAL_ONLY=1 \
  uvicorn services.api_gateway.main:app --port 8000 &
curl -s http://localhost:8000/api/scans | jq .  # should return local profile, not cloud error

# CLI serve command
cosmicsec serve --help
```

**Rollback**: Remove `LOCAL_WEB` from enum and revert policy entries. The existing `STATIC`/`DYNAMIC`/`LOCAL` modes are unaffected.

**Acceptance**:
- [ ] `LOCAL_WEB` added to `RuntimeMode` enum
- [ ] `HybridRouter.resolve_mode()` handles `local_web` correctly
- [ ] Policy registry has `LOCAL_WEB`-specific entries
- [ ] `cosmicsec serve` command implemented
- [ ] `--no-cloud` flag blocks outbound HTTP
- [ ] Local data encrypted at rest
- [ ] Runbook written
- [ ] Unit tests cover new mode and policy

---

### W2.2 — Explicit Local Storage Policy Controls

**Description**: Add a formal data-residency policy layer that users can configure to control where data flows: `local-only`, `cloud-sync`, or `selective-sync` (per-project or per-finding-tag). Display the active policy clearly in the UI.

**Addresses**: G-01

**Scope**:
- `services/scan_service/main.py` — respect `X-CosmicSec-Data-Policy` header
- `services/api_gateway/main.py` — forward data policy header to downstream services
- `cli/agent/cosmicsec_agent/config.py` — add `data_policy` config key
- `frontend/src/pages/SettingsPage.tsx` — data residency section with policy selector
- `frontend/src/api/endpoints.ts` — propagate policy header on all API calls
- `.env.example` — document `COSMICSEC_DATA_POLICY` env var

**AI Agent Prompt**:
```
Add data-residency policy enforcement:

1. In services/api_gateway/main.py:
   - Read X-CosmicSec-Data-Policy header (values: "local-only" | "cloud-sync" | "selective-sync").
   - For "local-only": block all routes that write to the cloud DB (return 403 with
     detail "data_policy=local-only prevents cloud writes").
   - Forward the header to all downstream service calls.

2. In frontend/src/pages/SettingsPage.tsx:
   - Under a new "Data Residency" section, add a <select> for the three policies.
   - Save to localStorage and prepend as X-CosmicSec-Data-Policy header via the api client.

3. In cli/agent/cosmicsec_agent/config.py:
   - Add `data_policy: str = "cloud-sync"` to the config schema.
   - Read from config and append as a header in all outbound HTTP and WebSocket calls.

Use Tailwind dark-mode classes matching existing SettingsPage design.
```

**Security constraints**:
- `local-only` must be enforced server-side, not just client-side.
- The header value must be validated; reject unknown policy values with 400.
- Audit log entries must record the active data policy for every write operation.

**Validation**:
```bash
# Verify local-only blocks cloud write
curl -X POST http://localhost:8000/api/scans \
  -H "X-CosmicSec-Data-Policy: local-only" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"target":"test.local"}' \
  | jq '.detail'
# Expected: "data_policy=local-only prevents cloud writes"
```

**Acceptance**:
- [ ] Three policy values defined and documented
- [ ] `local-only` enforced server-side
- [ ] Header propagated to all downstream services
- [ ] Frontend settings UI section added
- [ ] CLI config key added
- [ ] Audit log records policy per write
- [ ] Tests cover all three policy paths

---

### W2.3 — Guest Command Sandbox

**Description**: Add a strictly allow-listed command sandbox for unregistered (guest) users alongside the existing demo mode. Guests can run real but harmless, read-only operations (e.g., DNS lookup, platform health, public CVE lookup) with hard rate limits and no persistence.

**Addresses**: G-02

**Scope**:
- `services/api_gateway/main.py` — new `/api/guest/` prefix with strict allow-list
- `cosmicsec_platform/middleware/policy_registry.py` — `GUEST` policies
- `cosmicsec_platform/middleware/static_profiles.py` — guest-mode responses for blocked routes
- `services/recon_service/main.py` — DNS-only safe endpoint for guest use
- `frontend/src/pages/DemoSandboxPage.tsx` — "Try it live" section alongside existing demo
- `frontend/src/components/GuestSandbox.tsx` — NEW: sandbox UI component
- `docs/runbooks/guest-sandbox.md` — NEW: guest sandbox design and security rationale

**AI Agent Prompt**:
```
Add a guest command sandbox to the CosmicSec API gateway.

HARD CONSTRAINTS (do not relax):
- Allow-list of permitted guest operations (exhaustive — all others are 403):
    GET /api/guest/dns?domain=<domain>   → passive DNS lookup only
    GET /api/guest/health                → platform status (no sensitive data)
    GET /api/guest/cve?id=CVE-XXXX-XXXX → public CVE lookup via NVD API
    GET /api/guest/whois?domain=<domain> → WHOIS via public RDAP
- Deny list (hard-block even if somehow in allow-list):
    Any operation targeting 10.x, 172.16.x, 192.168.x, 127.x (RFC-1918 / loopback)
    Any scan, exploit, bruteforce, fuzzing, or port-scan operation
    Any write/create/delete operation
- Rate limit: 5 requests / minute per IP (no bypass, no exceptions)
- Max response size: 50 KB per response (truncate beyond this)
- No authentication required, no session state, no persistence

Implementation:
1. Add GET /api/guest/{action} handler in services/api_gateway/main.py.
2. Validate action against GUEST_ALLOWLIST set.
3. Apply @limiter.limit("5/minute") with key=get_remote_address.
4. For DNS: forward to recon_service /dns?passive=true (no zone transfer, no brute).
5. Add GUEST RoutePolicy in policy_registry.py with auth_policy="none".
6. In frontend/src/pages/DemoSandboxPage.tsx, add a "Try it live" panel
   that calls /api/guest/ endpoints. Label clearly: "Real data · No login required".
   Add a second label: "Results are not stored · No account needed".
```

**Security constraints**:
- RFC-1918 and loopback block must be enforced in the gateway, not relying on downstream service SSRF protection alone.
- Rate limit must be applied before any upstream call (before SSRF-check too).
- Guest endpoints must appear in the Prometheus metrics with label `user_type=guest` for abuse monitoring.
- Zero data persistence: do not write guest operation results to any database.

**Validation**:
```bash
# Allow-listed operation succeeds
curl "http://localhost:8000/api/guest/dns?domain=example.com" | jq .

# RFC-1918 blocked
curl "http://localhost:8000/api/guest/dns?domain=192.168.1.1" | jq '.error_code'
# Expected: "SSRF_BLOCKED" or "GUEST_DENIED"

# Rate limit enforced (6th request in one minute)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8000/api/guest/health"
done
# Expected: 200 200 200 200 200 429

# Write operation blocked
curl -X POST "http://localhost:8000/api/guest/scans" | jq '.detail'
# Expected: 403
```

**Rollback**: Remove `/api/guest/` routes. Guest operations are purely additive; rollback has no impact on existing functionality.

**Acceptance**:
- [ ] Allow-list implemented and enforced (deny-by-default)
- [ ] RFC-1918 / loopback block in place at gateway level
- [ ] Rate limit: 5/minute per IP
- [ ] Zero persistence: no DB writes
- [ ] Frontend "Try it live" section with clear labeling
- [ ] Prometheus metrics with `user_type=guest` label
- [ ] Runbook documenting design decisions
- [ ] Tests cover: allowed op, blocked RFC-1918, rate limit, write rejection

---

### W2.4 — Endpoint Hardening

**Description**: Address G-03 and G-13: enforce explicit authentication on dashboard summary/overview endpoints, and reduce in-memory fallback paths for production-critical data flows in agent relay and plugin registry.

**Addresses**: G-03, G-13

**Scope**:
- `services/api_gateway/main.py` — add auth guard to `/api/dashboard/summary` and `/api/dashboard/overview`
- `services/agent_relay/main.py` — replace in-memory agent session dict with DB-backed store
- `plugins/registry.py` — replace in-memory `_marketplace` and `_ratings` dicts with DB-only paths

**AI Agent Prompt**:
```
1. In services/api_gateway/main.py:
   - For /api/dashboard/summary and /api/dashboard/overview:
     Add a call to _resolve_authenticated_user(request) at the start of each handler.
     If it raises (no valid token), return 401 {"detail": "Authentication required"}.
     These endpoints currently accept any request without a token check.

2. In services/agent_relay/main.py:
   - Replace the in-memory _connections dict with a DB-backed agent session table
     (SQLAlchemy model AgentSession: agent_id, user_id, connected_at, last_seen_at,
     manifest JSONB, status).
   - Keep an in-memory WebSocket object map (agent_id → WebSocket) for fast access —
     this is transport state, not business state.
   - On agent connect: upsert AgentSession row.
   - On disconnect: update status="offline", last_seen_at=now.
   - GET /relay/agents: query DB instead of in-memory dict.

3. In plugins/registry.py:
   - Remove the in-memory _marketplace, _ratings, _repositories dicts.
   - All marketplace/publish/rating/repository endpoints must go through DB only
     (the DB functions already exist in db_repository.py).
   - Add a startup health check: if DB is unavailable, return 503 on marketplace writes.
```

**Security constraints**:
- Dashboard endpoints returning user-specific data must require a valid JWT. No anonymous access.
- Agent session DB model must store `user_id` to support per-user agent isolation.

**Validation**:
```bash
# Dashboard blocked without auth
curl http://localhost:8000/api/dashboard/summary | jq '.detail'
# Expected: "Authentication required"

# Dashboard allowed with auth
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/summary | jq '.summary'

# Agent relay: agent appears in DB after connect
# (requires integration test)
pytest tests/test_agent_relay.py -v
```

**Rollback**: Dashboard auth guard can be disabled via feature flag `COSMICSEC_DASHBOARD_AUTH_REQUIRED=false` for a grace period. In-memory removal is not reversible without a git revert.

**Acceptance**:
- [ ] Dashboard endpoints require valid JWT
- [ ] Unauthenticated dashboard request returns 401
- [ ] Agent relay uses DB for session persistence
- [ ] Plugin registry routes to DB-only (no in-memory fallback for writes)
- [ ] Existing tests still pass
- [ ] New tests added for auth guard and DB-backed relay

---

## Wave 3 — New Access Modes & Hybrid Session Handoff

> 🎯 **Goal**: Formally implement LOCAL_WEB, DESKTOP_OFFLINE, MOBILE_COMPANION, AUTOMATION_API, and CHATOPS modes. Add cross-mode session continuity so context is not lost when switching surfaces.
>
> 📋 **Prerequisites**: Wave 2 complete (especially W2.1 for LOCAL_WEB foundation).
>
> 🛡️ **Security constraints**:
> - Mobile and desktop clients must use short-lived tokens with refresh flows.
> - Bot tokens (CHATOPS) must be scoped to a minimum permission set with no admin access.
> - Session handoff tokens must be single-use and time-limited (max 5 minutes).
>
> 🌐 **Languages**: Python, TypeScript, Dart/React Native (mobile), Markdown (docs).

### W3.1 — Mobile Companion: API-Backed Authentication

**Description**: Replace the current static mock in `mobile/App.tsx` with a real authenticated experience: login screen, JWT storage, dashboard summary from live API, recent scans feed, and timeline triage.

**Addresses**: G-04

**Scope**:
- `mobile/App.tsx` — rewrite with navigation + auth screens
- `mobile/src/screens/LoginScreen.tsx` — NEW
- `mobile/src/screens/DashboardScreen.tsx` — NEW
- `mobile/src/screens/ScansScreen.tsx` — NEW
- `mobile/src/context/AuthContext.tsx` — NEW: mobile auth context (JWT + refresh)
- `mobile/src/api/client.ts` — NEW: Axios/fetch wrapper with auth header
- `mobile/README.md` — update with auth setup instructions

**AI Agent Prompt**:
```
In the mobile/ directory (Expo + React Native + TypeScript):

1. Add navigation: npm install @react-navigation/native @react-navigation/stack
2. Create src/context/AuthContext.tsx:
   - Stores JWT in SecureStore (@expo/secure-store).
   - Provides login(email, password), logout(), and refreshToken() methods.
   - Calls POST $COSMICSEC_API_URL/api/auth/login.

3. Create src/screens/LoginScreen.tsx:
   - Email + password fields, login button with loading state.
   - On success: navigate to Dashboard.
   - Show error on failure.

4. Create src/screens/DashboardScreen.tsx:
   - Calls GET /api/dashboard/overview with Bearer token.
   - Shows 3 metric cards: Security Score, Critical Findings, Active Scans.
   - Shows Recent Activity list from /api/collab/activity-feed.

5. Update App.tsx to use navigation stack with Login → Dashboard → Scans flow.

Use React Native StyleSheet; no Tailwind. Match the existing dark color scheme
(backgroundColor: "#020617", cards: "#0f172a", accent: "#22d3ee").
```

**Security constraints**:
- JWT must be stored in `SecureStore`, never in `AsyncStorage`.
- API base URL must be configurable via `app.json` env and not hardcoded.

**Acceptance**:
- [ ] Mobile app has login screen with real API call
- [ ] JWT stored in SecureStore
- [ ] Dashboard screen shows live data from `/api/dashboard/overview`
- [ ] Static mock data removed
- [ ] API base URL configurable via env

---

### W3.2 — Automation API Mode (SDK First-Class)

**Description**: Formally register `AUTOMATION_API` as a runtime mode. SDK requests are identified by `X-CosmicSec-Client: sdk` header or API key without browser fingerprint. Apply a separate rate-limit tier and permission scope for automation clients.

**Addresses**: G-08

**Scope**:
- `cosmicsec_platform/middleware/hybrid_router.py` — add `AUTOMATION_API` to `RuntimeMode`
- `services/api_gateway/main.py` — detect SDK clients, apply automation rate limit
- `sdk/typescript/src/client.ts` — send `X-CosmicSec-Client: sdk/typescript/VERSION`
- `sdk/python/cosmicsec_sdk/client.py` — send `X-CosmicSec-Client: sdk/python/VERSION`
- `sdk/go/client.go` — send `X-CosmicSec-Client: sdk/go/VERSION`

**AI Agent Prompt**:
```
1. Add AUTOMATION_API = "automation_api" to RuntimeMode in hybrid_router.py.
2. In resolve_mode(): if header X-CosmicSec-Client starts with "sdk/",
   return AUTOMATION_API.
3. In api_gateway/main.py: for AUTOMATION_API mode, apply a separate rate
   limit of 600/minute (vs 100/minute for browser users).
4. Add X-CosmicSec-Client header to all three SDKs using their package version.
5. Document the mode in /api/runtime/mode response.
```

**Acceptance**:
- [ ] `AUTOMATION_API` mode detected from SDK client header
- [ ] Separate rate limit tier applied
- [ ] All three SDKs send client identifier header
- [ ] Mode appears in `/api/runtime/mode`

---

### W3.3 — ChatOps Mode (Slack/Teams Bot Relay)

**Description**: Add `CHATOPS` mode enabling Slack/Teams bots to trigger scans, query findings, and receive alerts via webhook or slash commands. Bot tokens are scoped to a minimum permission set.

**Addresses**: G-09

**Scope**:
- `cosmicsec_platform/middleware/hybrid_router.py` — add `CHATOPS` to `RuntimeMode`
- `services/api_gateway/main.py` — `/api/chatops/slack/events` and `/api/chatops/teams/events` endpoints
- `services/notification_service/main.py` — Slack incoming webhook dispatcher
- `services/auth_service/main.py` — bot-token issue/revoke flow
- `docs/runbooks/chatops-setup.md` — NEW: Slack app setup guide

**AI Agent Prompt**:
```
Add CHATOPS mode to CosmicSec:

1. Add CHATOPS = "chatops" to RuntimeMode enum.
2. Add POST /api/chatops/slack/events endpoint in api_gateway:
   - Verify Slack request signature (X-Slack-Signature header, HMAC-SHA256).
   - Parse slash command or event payload.
   - Allowed commands: /cosmicsec status, /cosmicsec scan <target>, /cosmicsec findings.
   - Scan commands are queued (async), not executed synchronously.
   - Respond with 200 + JSON within 3 seconds (Slack requirement).
3. Add bot token issuance to auth_service: POST /bot-tokens (admin only).
   Bot tokens have scopes: ["scan:create", "findings:read", "status:read"].
   No admin, no user-mgmt, no report-delete scopes for bot tokens.
4. Create docs/runbooks/chatops-setup.md with Slack app manifest and setup steps.
```

**Security constraints**:
- Slack request signature must be verified on every event. Reject unsigned requests with 403.
- Bot tokens must have an expiry (max 90 days) and must be revocable.
- Scan targets submitted via ChatOps must pass the same SSRF/RFC-1918 checks as direct API calls.

**Acceptance**:
- [ ] `CHATOPS` mode in `RuntimeMode`
- [ ] Slack events endpoint with signature verification
- [ ] Allowed slash commands defined and enforced
- [ ] Bot token issuance with explicit scope list
- [ ] Scan targets pass SSRF check
- [ ] Setup runbook created

---

### W3.4 — Hybrid Session Handoff

**Description**: Implement cross-mode session continuity. A user can start a scan in the web dashboard, receive a handoff token, and continue in the CLI agent (or vice versa) without losing scan context, findings, or chat state.

**Addresses**: G-06

**Scope**:
- `services/auth_service/main.py` — POST `/handoff/token` (issues single-use 5-minute token)
- `services/auth_service/main.py` — POST `/handoff/redeem` (redeems token, returns session)
- `services/api_gateway/main.py` — proxy handoff endpoints
- `cli/agent/cosmicsec_agent/main.py` — `cosmicsec handoff --code <token>` command
- `frontend/src/pages/AgentsPage.tsx` — "Continue in CLI" button generating QR/code
- `frontend/src/pages/DashboardPage.tsx` — "Continue in browser" link from CLI output

**AI Agent Prompt**:
```
Implement cross-mode session handoff in the CosmicSec auth service:

1. POST /handoff/token (requires valid JWT):
   - Accepts: {"mode": "cli" | "web" | "mobile", "context": {scan_id, room_id, ...}}
   - Generates a single-use handoff code (32-byte hex, stored in Redis with 5-min TTL).
   - Returns: {"code": "...", "expires_in": 300}

2. POST /handoff/redeem:
   - Accepts: {"code": "...", "client_mode": "cli" | "web" | "mobile"}
   - Looks up code in Redis, deletes it (single-use).
   - Returns: {"access_token": "...", "context": {...}}
   - If code expired or already used: 400 {"detail": "invalid_or_expired_code"}

3. In cli/agent/cosmicsec_agent/main.py, add:
   cosmicsec handoff --code <TOKEN>
   - Calls /handoff/redeem, stores resulting token via CredentialStore.
   - Outputs the scan context (target, scan_id, findings count) so the user
     can resume immediately.

4. In frontend/src/pages/AgentsPage.tsx, add a "Continue in CLI" button:
   - Calls /handoff/token with context={current_page_scan_id}.
   - Displays the one-time code and CLI command: cosmicsec handoff --code <CODE>
```

**Security constraints**:
- Handoff codes are single-use. Attempting to reuse a redeemed code must return 400.
- Codes expire in 5 minutes. No extension.
- Handoff tokens issued to a different user_id than the redeemer must be rejected.

**Acceptance**:
- [ ] `/handoff/token` and `/handoff/redeem` endpoints implemented
- [ ] Single-use enforced (second redemption returns 400)
- [ ] 5-minute TTL enforced via Redis
- [ ] CLI `cosmicsec handoff --code` command works
- [ ] Frontend "Continue in CLI" button visible on AgentsPage
- [ ] Tests cover: happy path, expired code, double-use, wrong user

---

## Wave 4 — Tooling Expansion, Plugin Trust & Final Validation

> 🎯 **Goal**: Extend the platform's security tooling coverage across cloud/K8s/IaC/SBOM domains, establish a signed plugin trust model, and validate the full platform against the master Definition of Done checklist.
>
> 📋 **Prerequisites**: Waves 1–3 complete.
>
> 🛡️ **Security constraints**:
> - All new tools default to read-only/reconnaissance. Destructive or exploit modes require explicit opt-in with confirmation.
> - Plugin signing is mandatory before any plugin can be executed in DYNAMIC or LOCAL_WEB mode.
>
> 🌐 **Languages**: Python, Go (tool wrappers), TypeScript, Bash (CI scripts), Markdown (docs).

### W4.1 — Tool Registry Expansion

**Description**: Extend the CLI agent tool registry with tools across four new tiers: cloud/container posture, IaC/secrets scanning, SBOM/SCA, and extended web/API testing.

**Addresses**: G-10

**Scope**:
- `cli/agent/cosmicsec_agent/tool_registry.py` — add new tool entries
- `cli/agent/cosmicsec_agent/parsers/` — add parsers for each new tool
- `docs/runbooks/add-new-scanner-plugin.md` — reference the tool tiers

**New Tool Tiers**:

| Tier | Tools |
|------|-------|
| Cloud / Container / K8s Posture | `trivy`, `grype`, `syft`, `checkov`, `kube-bench`, `kubescape` |
| IaC / Secrets / Compliance | `tfsec`, `terrascan`, `trufflehog`, `gitleaks`, `semgrep` |
| SBOM / SCA | `cdxgen`, `syft` (SBOM mode), `dependency-check` |
| Web / API Testing | `dalfox` (XSS), `arjun` (param discovery), `katana` (crawler) |

**AI Agent Prompt**:
```
In cli/agent/cosmicsec_agent/tool_registry.py, add the following tool entries
following the existing pattern (name, version_cmd, capabilities, category, description):

Cloud/Container tier:
- trivy: capabilities=["container_scan","fs_scan","sbom","misconfig"], category="cloud"
- grype: capabilities=["vuln_scan","sbom","container_scan"], category="cloud"
- syft: capabilities=["sbom_generate","package_enum"], category="sbom"
- checkov: capabilities=["iac_scan","misconfig","policy_check"], category="iac"
- kube-bench: capabilities=["k8s_audit","cis_benchmark"], category="cloud"
- kubescape: capabilities=["k8s_scan","rbac_check","misconfig"], category="cloud"

IaC/Secrets tier:
- tfsec: capabilities=["iac_scan","terraform_check"], category="iac"
- trufflehog: capabilities=["secrets_scan","git_scan"], category="secrets"
- gitleaks: capabilities=["secrets_scan","git_scan"], category="secrets"
- semgrep: capabilities=["sast","code_scan","rule_check"], category="sast"

Web/API tier:
- dalfox: capabilities=["xss_scan","param_fuzz"], category="web"
- arjun: capabilities=["param_discovery","api_recon"], category="web"
- katana: capabilities=["web_crawl","url_enum"], category="web"

For each tool, create a minimal parser in parsers/<toolname>_parser.py
that reads JSON/text output and returns a list of finding dicts with:
{title, severity, description, target, tool, raw}.
```

**Acceptance**:
- [ ] All 13 new tools registered in `tool_registry.py`
- [ ] Parser created for each new tool
- [ ] Parser returns normalized finding dicts
- [ ] Tool discovery (`cosmicsec tools list`) shows new tools when installed
- [ ] Tests cover parser output normalization

---

### W4.2 — Plugin Trust Model

**Description**: Implement a signed plugin policy so all plugins must have a valid Ed25519 signature from a trusted key before they can be loaded in DYNAMIC or LOCAL_WEB mode. Add provenance tracking and permission scoping.

**Addresses**: G-11

**Scope**:
- `plugins/sdk/base.py` — add `permissions` and `signature` fields to plugin metadata
- `plugins/sdk/verifier.py` — NEW: Ed25519 signature verification
- `plugins/registry.py` — enforce signature check on plugin load
- `plugins/trust-policy.json` — NEW: trusted public key registry
- `services/api_gateway/main.py` — reject unsigned plugin run requests in DYNAMIC mode
- `docs/runbooks/add-new-scanner-plugin.md` — update signing instructions

**AI Agent Prompt**:
```
Add plugin signature enforcement to CosmicSec:

1. Create plugins/sdk/verifier.py:
   - load_trusted_keys(): reads plugins/trust-policy.json, returns list of Ed25519 public keys
   - verify_plugin(plugin_file_path: str, signature_b64: str) -> bool:
     Compute SHA-256 of the plugin file content.
     Verify the Ed25519 signature over the digest using trusted keys.
     Return True only if at least one trusted key verifies the signature.

2. In plugins/sdk/base.py, add to PluginMetadata:
   signature: str | None = None  # Base64-encoded Ed25519 signature
   permissions: list[str] = []   # e.g., ["network:read", "findings:write"]
   trust_level: str = "unsigned" # "official" | "community" | "unsigned"

3. In plugins/registry.py PluginLoader.discover():
   For each plugin, after loading metadata:
   - If COSMICSEC_ENFORCE_PLUGIN_SIGNING=1 (env):
     Call verifier.verify_plugin(). If False: log warning, set trust_level="unsigned",
     raise PluginLoadError("Plugin not signed by a trusted key").
   - If COSMICSEC_ENFORCE_PLUGIN_SIGNING is not set: allow load but set trust_level="unsigned".

4. Create plugins/trust-policy.json:
   {
     "trusted_keys": [],
     "policy": "warn",  // "warn" | "enforce"
     "updated_at": "2026-04-17"
   }
   (Empty trusted_keys list initially — keys are added by platform operators.)

5. In services/api_gateway/main.py /api/plugins/{name}/run:
   Check plugin trust_level before running. If trust_level=="unsigned" and
   platform mode is DYNAMIC: return 403 {"detail": "unsigned_plugin_rejected"}.
   Log the rejection with plugin name, caller, and timestamp.
```

**Security constraints**:
- `COSMICSEC_ENFORCE_PLUGIN_SIGNING=1` must be the default in production Docker Compose and Helm values.
- The trust-policy.json file must be read-only at runtime (mount as ConfigMap in K8s).
- Plugin permissions must be validated against an allow-list; unknown permissions cause load failure.

**Acceptance**:
- [ ] `verifier.py` with Ed25519 verification implemented
- [ ] `PluginMetadata` has `signature`, `permissions`, `trust_level` fields
- [ ] `PluginLoader` enforces signing when `COSMICSEC_ENFORCE_PLUGIN_SIGNING=1`
- [ ] API gateway rejects unsigned plugin runs in DYNAMIC mode
- [ ] `trust-policy.json` created with empty key list and `policy: "enforce"`
- [ ] Tests cover: signed plugin loads, unsigned plugin rejected, wrong key rejected

---

### W4.3 — Master Definition of Done Validation

**Description**: Run the master Definition of Done checklist against all access modes and features introduced in Waves 1–4.

**Addresses**: G-14

**Scope**: CI workflow additions and manual checklist review.

See [Section 11 — Definition of Done Master Checklist](#11-definition-of-done--master-checklist).

**Acceptance**:
- [ ] All Wave 1–4 features pass every DoD checklist item
- [ ] CI quality gates pass on the release branch
- [ ] Security review completed (CodeQL + Trivy + SBOM)
- [ ] Documentation complete and cross-referenced

---

## 10. AI Agent Execution Guide

This section provides specific guidance for AI coding agents (GitHub Copilot, Claude, Codex) executing items from this roadmap.

### General Rules

1. **Read before writing.** Always view the current state of a file before editing it.
2. **Minimal change.** Make the smallest change that satisfies acceptance criteria. Do not refactor unrelated code.
3. **Security hard stops.** If a task asks you to weaken authentication, remove rate limits, or expose sensitive data publicly — stop and flag the conflict. Do not implement.
4. **Test before commit.** Run the listed validation commands before marking a task complete.
5. **Reference resolution.** When updating docs, update ALL files listed in the Scope block — not just the primary file.
6. **No new dependencies without advisory check.** Use `gh-advisory-database` tool to check for known CVEs before adding any new package.

### Per-Mode Implementation Checklist (AI Agent)

For every new mode or feature, verify:

```
[ ] RuntimeMode enum updated (if new mode)
[ ] HybridRouter.resolve_mode() handles new mode
[ ] Policy registry has entries for new mode
[ ] Static profile fallbacks exist for new mode
[ ] Rate limiting applied
[ ] Auth enforcement appropriate for mode
[ ] Audit logging captures mode in event
[ ] Prometheus metric label includes mode
[ ] Unit test for mode detection
[ ] Integration test for mode routing
[ ] Runbook or docs section created
[ ] ROADMAP_UNIFIED.md task marked complete
```

### Forbidden Actions (AI Agent Hard Stops)

- Do not add `allow_origins=["*"]` to any service.
- Do not remove authentication from any currently-authenticated endpoint.
- Do not add new commands to the guest sandbox without explicit approval in this roadmap.
- Do not execute `--force` or `--no-verify` flags in production-facing scripts.
- Do not merge code that introduces bare `except Exception: pass` handlers.
- Do not create files in `.github/agents/` — those are reserved and confidential.

---

## 11. Definition of Done — Master Checklist

Every feature introduced via this roadmap must satisfy **all** of the following before it can be marked complete.

### Security

- [ ] No new `allow_origins=["*"]` introduced
- [ ] All new endpoints require appropriate authentication (or are explicitly public with documented rationale)
- [ ] Rate limiting applied to all new public/guest endpoints
- [ ] No secrets, credentials, or API keys hardcoded
- [ ] SSRF protection: RFC-1918 and loopback blocked for any user-supplied URL/domain input
- [ ] No unescaped user input in HTML/SQL outputs
- [ ] Plugin code paths enforce signing policy

### Testing

- [ ] Unit tests cover happy path and at least two error paths
- [ ] Rate-limit test included for any new rate-limited endpoint
- [ ] Auth rejection test included for any new authenticated endpoint
- [ ] E2E test or integration test covers the primary user flow
- [ ] `pytest tests/ -v` passes
- [ ] `cd frontend && npm run lint && npm run test && npm run build` passes (if frontend changed)

### Observability

- [ ] New endpoints emit Prometheus metrics (request count, latency, error rate)
- [ ] New mode or user type is captured in metric labels
- [ ] Audit log entry written for write operations
- [ ] Errors logged with structured fields (not bare `print()`)

### Documentation

- [ ] Public API endpoints documented in OpenAPI (FastAPI auto-docs are sufficient)
- [ ] New access mode documented in this roadmap's access-mode matrix
- [ ] Runbook created or updated for operational procedures
- [ ] `docs/DIRECTORY_STRUCTURE.md` updated if new files or directories added
- [ ] `docs/PROJECT_GOAL_AND_PROGRESS.md` updated to reflect new capabilities

### Delivery

- [ ] Feature works in at least two access modes (or is explicitly single-mode with documented reason)
- [ ] `docker-compose up --build` completes without errors
- [ ] No hard-coded `localhost` URLs in production code paths
- [ ] `ROADMAP_UNIFIED.md` acceptance checklist fully checked off

---

*This unified roadmap supersedes `ROADMAP.md`, `ROADMAP_NEXT.md`, and `ROADMAP_CLI_AGENT.md`.
Historical snapshots of those files are in [`docs/archive/roadmaps/`](archive/roadmaps/).*
