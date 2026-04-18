# CosmicSec — Full Gap Analysis & Vision Alignment Report

> Analyzed: April 19, 2026 | Conversation: a613fbbe

---

## Your Stated Vision

An AI assistant for cybersecurity and hacking professionals that doesn't just suggest — it executes.

**Two delivery modes:**
1. **CLI** — Like GitHub Copilot/Gemini CLI. Runs on user's local machine, executes commands locally.
2. **WebApp** — Primarily server-side execution. Future: local execution option too.

**Core workflow (both modes):**
User Input → Local LLM / Server LLM (Phi3 Mini in dev, Cisco AI in prod)
→ Analyzes prompt → Checks if command/tool execution needed
→ Uses Registry & Executor → Executes → Returns response

**WebApp extras:** Beyond the main natural language chat, there will be specialized tool panels for different professional categories (pentesters, SOC analysts, bug bounty hunters, red teamers, etc.)

---

## What's Already Built (Strong Foundation)

### CLI Agent — WELL BUILT
| Component | Status | Location |
|-----------|--------|----------|
| Typer CLI with 15+ sub-apps | Done | cli/agent/cosmicsec_agent/main.py (3,496 lines) |
| Hybrid execution engine (static/dynamic/AI) | Done | hybrid_engine.py |
| Tool registry (nmap, nikto, nuclei, sqlmap, gobuster, hydra, etc.) | Done | tool_registry.py |
| Natural language intent parser | Done | intent_parser.py |
| AI planner (OpenAI + Ollama + Cloud providers) | Done | ai_planner.py |
| Dynamic tool resolver (safety checks) | Done | dynamic_resolver.py |
| Shell command executor | Done | executor.py |
| Tool output parsers (nmap, nikto, nuclei, gobuster) | Done | parsers/ |
| Auth, profiles, credential store | Done | auth.py, profiles.py, credential_store.py |
| Interactive REPL shell | Done | shell command in main.py |
| Offline mode | Done | offline_store.py |
| Audit logging | Done | audit_log.py |
| Plugin system | Done | plugins.py |
| Progress display (Rich) | Done | progress.py |
| Stream output | Done | stream.py |

### Backend Services — WELL BUILT
| Service | Status | Notes |
|---------|--------|-------|
| API Gateway | Done | FastAPI, 3,953 lines, rate limiting, WAF, CORS, security headers |
| AI Service | Done | LangChain, Ollama, ChromaDB RAG, MITRE ATT&CK, anomaly detection |
| Auth Service | Done | JWT, OAuth SSO (Google/GitHub/Microsoft), 2FA TOTP |
| Scan Service | Done | nmap/nikto/nuclei integration, real tool execution |
| Recon Service | Done | WHOIS, DNS, subdomain enum, Tor/onion |
| Agent Relay | Done | WebSocket hub for CLI/Webapp task dispatch |
| Bug Bounty Service | Done | Full submission lifecycle |
| Collab Service | Done | Real-time team collaboration |
| Plugin Registry | Done | Ed25519 signing, marketplace |
| Report Service | Done | PDF/HTML/Markdown generation |
| Notification Service | Done | Email, Slack |
| Compliance Service | Done | |
| Integration Service | Done | SIEM, Jira, Slack |
| Admin Service | Done | User mgmt, audit logs |

### Frontend WebApp — WELL BUILT
| Feature | Status | Notes |
|---------|--------|-------|
| React 19 + Vite 8 + TypeScript + TailwindCSS | Done | Modern stack |
| 24 pages with routing | Done | Auth guards working |
| AI Chat page | Done | AIChatPage.tsx |
| AI Analysis page | Done | AIAnalysisPage.tsx |
| Dashboard | Done | Real-time metrics, 20s refresh |
| Scan management | Done | Full CRUD |
| Recon page | Done | |
| Bug Bounty page | Done | |
| Agents page | Done | CLI agent management |
| Admin dashboard | Done | |
| Plugin detail | Done | |
| Reports | Done | |
| Timeline | Done | |

---

## CRITICAL GAPS (Things Missing From Your Vision)

### GAP 1: LLM Workflow is Incomplete
Your vision: User Input → LLM analyzes → decides if execution needed → Registry → Executor → Response

Current reality:
- AI service has a /query endpoint that does intent classification (heuristic + Ollama)
- Intent coverage now includes a broader command set: scan_create, whois_lookup, recon_lookup, nmap_scan, nikto_scan, nuclei_scan, sqlmap_scan, gobuster_scan, hydra_audit, metasploit_check, hashcat_audit
- Remaining gap: orchestration is still scan/recon-service-centric (not yet full per-tool backend executors for every command)
- MISSING: Streaming LLM responses back to the user in real-time (chat-style)
- MISSING: The CLI's HybridEngine does NOT connect to the AI service — it uses its own local AI planner
- AIChatPage is now wired to backend `/api/ai/query` and surfaces command execution responses; streaming output is still pending

### GAP 2: The AI Chat in WebApp Doesn't Execute Commands
- AIChatPage.tsx exists but it's a static chat UI — messages don't trigger tool execution
- There's no "decide if execution needed → run tool → stream results back" pipeline in the webapp chat
- The /query endpoint in AI service returns a command_result but the webapp doesn't use it for actual tool orchestration

### GAP 3: Missing "Specialized Tool Panels" for Different Professionals
Your vision: "lots of tools designed for custom work, categorized for different types of professionals"

What's needed but missing:
- Penetration Testing Panel (with nmap, nikto, sqlmap, metasploit workflow)
- SOC Analyst Panel (SIEM-like interface, IOC lookup, alert triage)
- Bug Bounty Hunter Panel (partially exists but not tool-execution-linked)
- Red Team Panel (attack chain planning, C2 framework integration stubs)
- OSINT Panel (social media, email, domain intelligence)
- CTF/Training Panel
- Malware Analysis Panel

Current state: Pages exist for scans/recon/bug bounty but they're data-viewing pages, not execution panels

### GAP 4: Phi3 Mini Integration Default (Largely Addressed)
- AI service and gateway defaults are now aligned to `phi3:mini`
- AI chat frontend payload default is now `phi3:mini`
- No clear switchover mechanism for Cisco AI in production
- The LLM is used for INTENT CLASSIFICATION only, not for full conversation + execution loop

### GAP 5: CLI Tool Registry vs WebApp Tool Registry Are Disconnected
- CLI has its own tool_registry.py with known tools
- WebApp's scan service runs tools directly but uses a different execution approach
- MISSING: Unified tool registry that both CLI and WebApp reference
- MISSING: The webapp cannot "see" what tools a CLI agent has installed

### GAP 6: Backend Test Suite Broken — 0% Tests Run
- pytest fails immediately due to SQLAlchemy error: "metadata" is reserved when using the Declarative API
- In services/common/models.py line 166: metadata = Column(JSON...) on AgentTaskModel
- Same issue on line 255: BugBountyActivityModel
- Result: reserved-name blocker is addressed, but full backend suite still has environment bootstrap blockers (`DATABASE_URL` not set in local run context)

### GAP 7: Frontend Test Gaps
- Fixed: Settings/Login/Register/Admin/Dashboard/Scan test regressions and brittle assertions
- Current status: frontend vitest suite is green (`51/51` passing)
- Remaining improvement area: remove residual act() warnings in complex async page tests and raise coverage thresholds

### GAP 8: No Real-Time Command Execution Streaming in WebApp
- When a user types "scan example.com" in the AI chat, no WebSocket stream shows live tool output
- CLI has Rich live output, but WebApp has no equivalent real-time execution output
- WebSocket exists in API gateway for agent management, but not for real-time tool execution output in chat

### GAP 9: "Server-Side Execution" Pipeline Not Fully Wired
- The scan service can run tools (nmap, nikto, etc.) BUT:
  - Requires REST API calls with specific payloads, not natural language
  - The AI service's /query endpoint routes to scan/recon services for web-source requests
  - But only handles scan_create and recon_lookup, not arbitrary hacking tool execution
  - No execution of: sqlmap, hydra, gobuster, metasploit, hashcat, etc. from the webapp

### GAP 10: No WSL Integration for CLI on Windows
- You mentioned using WSL for better CLI experience on Windows
- Current CLI is Windows-native Python (runs in PowerShell)
- No WSL configuration or WSL-aware tool discovery
- Linux security tools (nmap, nikto, etc.) typically run better in WSL

---

## PARTIAL Gaps (Exists But Needs Enhancement)

- CLI natural language to execution: Works well via HybridEngine + AITaskPlanner
- WebApp natural language: broader command routing now in place, but still needs richer per-tool orchestration and streaming
- AI Model Integration: `phi3:mini` default aligned across gateway, ai-service, and chat UI
- No streaming chat responses (only batch generation)
- Tool Execution from WebApp: Scan service runs actual tools via subprocess but not via natural language

---

## Test Results Summary

### Backend Tests
- Status: Partially healthy
- Report service tests pass after environment/dependency hardening
- Full suite currently blocked in local run by missing `DATABASE_URL` configuration (environment issue, not immediate syntax/collection failure)

### Frontend Tests (Vitest)
- Status: PASS
- Latest run: 13 files passed, 51 tests passed
- Remaining quality backlog: reduce async warning noise and expand edge-case coverage

### Live WebApp Testing
- Frontend: Renders correctly, routing works, auth guards work
- Backend: Not running (ERR_CONNECTION_REFUSED on port 8000)
- UI Issues: PWA install banner overlaps terms checkbox on register page

---

## Architecture Assessment vs Your Vision

```
YOUR VISION FLOW:
User Input
    ↓
Local/Server LLM (Phi3 Mini in dev)
    ↓ [analyze: is execution needed?]
    ├─ YES → Registry lookup → Executor → Run tool → Return results + explanation
    └─ NO → Generate text response

CURRENT IMPLEMENTATION:
CLI:  User Input → LocalIntentParser + AITaskPlanner (Ollama/OpenAI) → HybridEngine → Executor WORKS
WebApp: User Input → /query API → basic heuristic + Ollama → scan_create/recon_lookup only LIMITED
```

Gap: The WebApp needs the same HybridEngine-style pipeline as the CLI, but server-side.

---

## Priority Fix List

### P0 — Must Fix (Breaks Tests & Core Functionality)
1. [x] Fix `metadata` column naming conflict in AgentTaskModel and BugBountyActivityModel
2. [x] Fix Phi3 model naming/default alignment (`phi3:mini`) across service and UI

### P1 — Core Vision Completeness
3. [x] Expand AI service `/query` to support broader tool-command roster (sqlmap/gobuster/hydra/nuclei/metasploit/hashcat/nmap/nikto)
4. Add streaming chat responses — WebSocket stream from AI service → Frontend chat UI
5. [x] Wire AIChatPage to backend `/api/ai/query` with command/result rendering
6. Implement specialized tool panels — at minimum: Pentest, SOC, Bug Bounty, OSINT panels

### P2 — Quality & DX
7. [x] Fix SettingsPage tests and runtime settings API export issues
8. [x] Harden LoginPage/RegisterPage tests to current API facade + auth lifecycle
9. [~] Reduce remaining async warning noise in ScanPage tests
10. WSL-aware CLI tool discovery for Windows users

### P3 — Production Readiness
11. Cisco AI integration — switchable LLM backend (Phi3 Mini dev → Cisco prod)
12. Real-time execution streaming in WebApp (WebSocket tool output)
13. Unified tool registry shared between CLI and WebApp
14. Tool categorization UI — "Tools for Pentesters" vs "Tools for SOC Analysts" view

---

## Summary Score

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| CLI Agent | 85% | 100% | WSL, more tools |
| WebApp Chat (AI Execution) | 65% | 100% | Streaming + richer orchestration still pending |
| Specialized Tool Panels | 15% | 100% | Need all panels |
| Backend Tests | 55% | 80%+ | Environment bootstrapping (`DATABASE_URL`) and integration suites |
| Frontend Tests | 85% | 80%+ | Core suite green; continue depth/edge-case expansion |
| LLM Integration | 72% | 100% | Streaming + multi-provider production switchover |
| Streaming Output | 10% | 100% | WebSocket execution stream |
| Phi3 to Cisco switchover | 0% | 100% | Config-driven LLM selection |
