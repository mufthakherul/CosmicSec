# CosmicSec — Next-Generation Implementation Roadmap (v2)

### Phase-by-Phase Guide for Humans & AI Coding Agents
> **Version**: 2.0 (2026-04-15) | **Companion**: [`DEPENDENCY_AUDIT.md`](./DEPENDENCY_AUDIT.md)
> **Audience**: Human developers, AI coding agents (Copilot, Claude, Codex), project managers
> **Scope**: Full codebase (19,655 lines Python + 1,747 TypeScript modules + SDKs + infra)

---

## How to Read This Document

Each phase follows the same structure:

```
Phase X — [Title]
├── 🎯 Goal (1–2 sentences: what and why)
├── 📋 Prerequisites (what must be done before this phase)
├── 🔧 Tasks (numbered, with exact file paths, commands, and acceptance criteria)
│   └── Each task has:
│       ├── What to do (human-readable)
│       ├── AI Agent Prompt (copy-paste prompt for AI coding agents)
│       ├── Fallback Strategy (keep old method as backup where safe)
│       ├── Files to touch
│       └── Acceptance criteria / tests
├── 🧪 Verification (how to confirm the phase is done)
├── 🌐 Languages used in this phase
└── 📦 New dependencies (if any)
```

> **Fallback Philosophy**: When replacing a storage mechanism, auth method, or API pattern, **keep the old implementation as a fallback** unless it is a security vulnerability. Example: when adding Redis session store, keep localStorage as offline fallback. When fixing CORS from `*` to allowlist, there is no safe fallback — the old method is a vulnerability and must be removed.

---

## Table of Contents

1. [Gap Summary from Deep Audit](#gap-summary-from-deep-audit)
2. [Multi-Language Strategy](#multi-language-strategy)
3. [Phase K — Critical Security Hardening](#phase-k--critical-security-hardening)
4. [Phase L — Production Data Layer & Persistence](#phase-l--production-data-layer--persistence)
5. [Phase M — Frontend Completion & Modernization](#phase-m--frontend-completion--modernization)
6. [Phase N — Dependency Modernization & Upgrade Wave](#phase-n--dependency-modernization--upgrade-wave)
7. [Phase O — Test Coverage & Quality Gates](#phase-o--test-coverage--quality-gates)
8. [Phase P — Rust High-Performance Ingest Engine](#phase-p--rust-high-performance-ingest-engine)
9. [Phase Q — Advanced AI, ML & Agentic Workflows](#phase-q--advanced-ai-ml--agentic-workflows)
10. [Phase R — Enterprise, Multi-Tenancy & Premium Features](#phase-r--enterprise-multi-tenancy--premium-features)
11. [Phase S — Performance, Observability & Global Scale](#phase-s--performance-observability--global-scale)
12. [Phase T — Go Event Broker & Real-Time Backbone](#phase-t--go-event-broker--real-time-backbone)
13. [Phase U — Mobile, PWA & Cross-Platform Clients](#phase-u--mobile-pwa--cross-platform-clients)
14. [Phase V — Developer Experience, Branding & Polish](#phase-v--developer-experience-branding--polish)
15. [Cross-Cutting Modernization Checklist](#cross-cutting-modernization-checklist)
16. [Implementation Priority Matrix](#implementation-priority-matrix)
17. [Target Architecture (Post-Phase V)](#target-architecture-post-phase-v)
18. [New File & Directory Map](#new-file--directory-map)

---

## Gap Summary from Deep Audit

### 🔴 Critical (10 issues — block production)

| ID | Issue | Where | Impact |
|----|-------|-------|--------|
| C-01 | Auth pages are **non-functional stubs** (no form state, no API calls, no validation) | `LoginPage.tsx` (17 LOC), `RegisterPage.tsx` (17 LOC), `ForgotPasswordPage.tsx` (11 LOC), `TwoFactorPage.tsx` (10 LOC) | Users cannot log in or register |
| C-02 | In-memory fake databases (`fake_api_keys_db = {}`, `fake_2fa_db = {}`) | `services/auth_service/main.py:267-278` | API keys and 2FA secrets lost on restart |
| C-03 | CORS `allow_origins=["*"]` — any origin can make authenticated requests | `services/api_gateway/main.py:194` | CSRF and credential theft |
| C-04 | Default admin password hardcoded in init-db.sql | `infrastructure/init-db.sql:128` | Known credential attack |
| C-05 | Hardcoded `http://localhost:8000` API URL in admin dashboard | `frontend/src/pages/AdminDashboardPage.tsx:31` | Breaks all non-local deployments |
| C-06 | `createUser` hardcodes password `"ChangeMe123!"` | `frontend/src/pages/AdminDashboardPage.tsx:95-107` | Known default password |
| C-07 | No rate limiting on login endpoint | `services/auth_service/main.py:892-920` | Brute force attacks |
| C-08 | 2FA secrets stored in plaintext | `services/auth_service/main.py:340` | Secret exposure on DB compromise |
| C-09 | HTML report generation uses f-string concatenation (XSS) | `services/report_service/main.py:91-105` | Stored XSS in exported reports |
| C-10 | No authentication on WebSocket upgrade in collab service | `services/collab_service/main.py:140` | Unauthenticated room access |

### 🟠 High (12 issues)

| ID | Issue | Where |
|----|-------|-------|
| H-01 | 6+ services use in-memory dicts (data lost on restart) | auth, scan, plugin registry, integration, agent relay, phase5 |
| H-02 | No token expiration checking or refresh in frontend | `AuthContext.tsx` |
| H-03 | Admin endpoints lack proper RBAC enforcement | `auth_service/main.py:1045+` |
| H-04 | OAuth implementation incomplete (no CSRF state tokens) | `auth_service/main.py:1320+` |
| H-05 | `--reload` flag in production Docker compose | `docker-compose.yml:151,212` |
| H-06 | No plugin signing/verification (arbitrary code execution) | `plugins/registry.py` |
| H-07 | WebSocket URL may use insecure `ws://` | `useScanStream.ts:24-32` |
| H-08 | Redis `requirepass` exposed in compose command | `docker-compose.yml:56` |
| H-09 | No scan cancellation mechanism | `scan_service/main.py` |
| H-10 | 114+ bare `except Exception:` handlers | All service files |
| H-11 | 3 deprecated packages in use | `aioredis`, `opentelemetry-exporter-jaeger`, `fuzzywuzzy` |
| H-12 | Node.js version mismatch (Docker: 20, CI: 24) | `docker-compose.yml` vs `.github/workflows/test.yml` |

### 🟡 Medium (20+ issues)

| ID | Issue | Where |
|----|-------|-------|
| M-01 | Frontend test coverage < 5% (2 tests total) | `App.test.tsx` |
| M-02 | Only 1 E2E smoke test | `smoke.spec.ts` |
| M-03 | 5 services have zero test coverage | integration, plugin, collab, notification, admin |
| M-04 | No centralized API client — inline `fetch()` everywhere | Multiple pages |
| M-05 | GlobalSearch component visible but non-functional | `Header.tsx:39` |
| M-06 | Phase5 Operations page 30% complete | `Phase5OperationsPage.tsx` (44 LOC) |
| M-07 | Settings "Save defaults" button doesn't call API | `SettingsPage.tsx:222-228` |
| M-08 | No mobile hamburger menu (nav links disappear) | `LandingPage.tsx` |
| M-09 | No pagination in any list view | Multiple pages |
| M-10 | Zustand stores not persisted (lost on refresh) | `scanStore.ts` |
| M-11 | No React.memo, useMemo, useCallback in heavy components | `DashboardPage.tsx`, `TimelinePage.tsx` |
| M-12 | AI service has 10+ empty `pass` stub implementations | `ai_service/` |
| M-13 | No request cancellation on component unmount | `ReconPage.tsx`, `AIAnalysisPage.tsx` |
| M-14 | Single 419KB JS bundle — no code splitting | Frontend build |
| M-15 | Recon results not cached (expensive API calls repeated) | `recon_service/main.py` |

---

## Multi-Language Strategy

CosmicSec uses **the right language for each job** to maximize performance, developer experience, and ecosystem leverage:

| Language | Version | Role | Where Used | Why This Language |
|----------|---------|------|-----------|-------------------|
| **Python 3.13** | Latest stable | Core services, AI/ML, orchestration, CLI agent | All 13 FastAPI microservices, LangChain/LangGraph, CLI agent | Rich AI/ML ecosystem, async support, rapid development |
| **Rust** | Latest stable | High-throughput data ingest, parser engine | `ingest/` — scan data parser, bulk DB writer | 10–100× faster parsing, zero-cost abstractions, memory safety without GC |
| **Go 1.24** | Latest stable | Event broker, health aggregator, lightweight sidecars | `broker/` — NATS/Kafka bridge, service mesh sidecar | Goroutine concurrency, tiny binaries, fast startup, excellent for network services |
| **TypeScript 5.9+** | Latest stable | Frontend SPA, TypeScript SDK, shared types | `frontend/`, `sdk/typescript/` | Type safety, React 19 ecosystem, shared types between frontend and API |
| **SQL** | PostgreSQL 16+ | Schema, migrations, analytics queries | `alembic/`, `infrastructure/` | Native JSONB, full-text search, window functions |
| **Bash/Shell** | — | CI/CD automation, dev scripts | `.github/workflows/`, `scripts/` | Universal automation glue |
| **HTML/CSS** | Tailwind 4 | Styling, email templates | Frontend + notification templates | Utility-first, dark mode, responsive |
| **Protocol Buffers** | proto3 | Service-to-service contracts (Rust ↔ Python, Go ↔ Python) | `proto/` | Language-neutral schema, efficient binary serialization |
| **HCL** | Terraform | Infrastructure as Code | `infrastructure/terraform/` | Declarative cloud provisioning |
| **YAML** | — | Configuration, CI/CD, Helm charts | Docker Compose, GitHub Actions, K8s | Human-readable config standard |

### Inter-Language Communication

```
TypeScript (Frontend)  ←── REST + WebSocket + GraphQL ──→  Python (API Gateway)
Python (services)      ←── gRPC (protobuf) ─────────────→  Rust (Ingest Engine)
Python (services)      ←── NATS JetStream ──────────────→  Go (Event Broker)
Python (CLI Agent)     ←── WebSocket + REST (JSON) ─────→  Python (API Gateway)
Go (Event Broker)      ←── Redis Streams ───────────────→  Python (services)
Rust (Ingest Engine)   ←── PostgreSQL COPY protocol ────→  PostgreSQL (database)
```

---

## Phase K — Critical Security Hardening

> 🎯 **Goal**: Fix all 10 critical security vulnerabilities. After this phase, the platform is safe for internal/staging deployment.
>
> 📋 **Prerequisites**: None — this is the first phase.
>
> 🌐 **Languages**: Python, TypeScript, SQL, YAML

### K.1 — Fix Authentication Pages

**What to do**: Replace the 4 stub auth pages with fully functional implementations including form state management, client-side validation, API integration, loading states, error handling, and accessibility.

**AI Agent Prompt**:
```
In the CosmicSec frontend (frontend/src/pages/), rewrite these 4 files:

1. LoginPage.tsx — Full login form with:
   - react-hook-form + zod validation (email format, password min 8 chars)
   - POST /api/auth/login API call via centralized api client
   - Loading spinner on submit, error message display
   - "Remember me" checkbox (stores token in localStorage vs sessionStorage)
   - Password visibility toggle (eye icon)
   - Link to register and forgot password
   - ARIA labels on all inputs, aria-invalid on error
   - On success: call login() from AuthContext, redirect to /dashboard

2. RegisterPage.tsx — Full registration form with:
   - Fields: name, email, password, confirm password
   - zod validation: email format, password ≥8 chars + 1 uppercase + 1 number, passwords match
   - Password strength meter (calculate score from length/complexity)
   - Terms acceptance checkbox (required)
   - POST /api/auth/register API call
   - On success: auto-login or redirect to /auth/login with success message

3. ForgotPasswordPage.tsx — Password reset request with:
   - Email input with validation
   - POST /api/auth/forgot-password API call
   - Success state: "Check your email" message with resend button (60s cooldown)
   - Error handling for unknown email

4. TwoFactorPage.tsx — 2FA verification with:
   - 6 individual digit inputs with auto-advance and auto-submit
   - POST /api/auth/verify-2fa API call
   - 30s countdown timer for code expiry
   - "Use backup code" link that switches to single text input
   - On success: complete login flow

Use Tailwind dark mode classes matching the existing design system.
Add react-hook-form and zod as dependencies: npm install react-hook-form @hookform/resolvers zod
```

**Fallback Strategy**: Keep the old stub pages in `frontend/src/pages/_legacy/` as reference. The stubs have no functionality, so there's no fallback behavior — this is purely additive.

**Files**:
- `frontend/src/pages/LoginPage.tsx` — Rewrite (17 LOC → ~200 LOC)
- `frontend/src/pages/RegisterPage.tsx` — Rewrite (17 LOC → ~250 LOC)
- `frontend/src/pages/ForgotPasswordPage.tsx` — Rewrite (11 LOC → ~120 LOC)
- `frontend/src/pages/TwoFactorPage.tsx` — Rewrite (10 LOC → ~180 LOC)
- `frontend/package.json` — Add `react-hook-form`, `@hookform/resolvers`, `zod`

**Acceptance Criteria**:
- [ ] All 4 pages render without errors
- [ ] Form validation shows inline errors on invalid input
- [ ] API calls are made to correct endpoints with proper headers
- [ ] Loading state shown during API call
- [ ] Error responses from API are displayed to user
- [ ] Keyboard navigation works (Tab through fields, Enter to submit)
- [ ] Screen reader announces errors via `aria-live`
- [ ] `cd frontend && npx tsc --noEmit` passes
- [ ] `cd frontend && npm run build` produces no errors

---

### K.2 — Eliminate In-Memory Auth Stores

**What to do**: Replace `fake_api_keys_db = {}` and `fake_2fa_db = {}` in auth service with real SQLAlchemy database queries. Encrypt 2FA secrets at rest.

**AI Agent Prompt**:
```
In services/auth_service/main.py:
1. Find fake_api_keys_db (dict) and replace all reads/writes with SQLAlchemy queries
   against the api_keys table (model already exists in services/common/models.py).
2. Find fake_2fa_db (dict) and replace with database storage.
3. Add 2FA secret encryption:
   - Create services/auth_service/encryption.py
   - Use cryptography.fernet.Fernet with key from COSMICSEC_2FA_KEY env var
   - Encrypt before DB write, decrypt on read
4. Keep the dict as a hot cache (LRU, max 1000 entries, 5min TTL) for read performance.
   The database is the source of truth; the cache is the fallback for speed.

Fallback: Dict cache → DB on cache miss → Error response on DB failure
```

**Fallback Strategy**: ✅ **Keep dict as LRU cache layer** in front of database. On cache miss, read from DB and populate cache. On DB failure, serve from cache if entry exists (stale-while-revalidate pattern). This preserves the fast in-memory performance while adding persistence.

**Files**:
- `services/auth_service/main.py` — Replace fake DB usage
- `services/auth_service/encryption.py` — New: Fernet encryption for 2FA secrets
- `.env.example` — Add `COSMICSEC_2FA_KEY`

**Acceptance Criteria**:
- [ ] `fake_api_keys_db` and `fake_2fa_db` no longer used as primary storage
- [ ] API keys survive service restart (test: create key → restart → key still works)
- [ ] 2FA secrets encrypted in database (check: raw DB value is not readable TOTP secret)
- [ ] Cache hit returns faster than DB query
- [ ] `pytest tests/test_auth_service.py -v` passes

---

### K.3 — CORS Hardening

**What to do**: Replace `allow_origins=["*"]` with environment-configurable origin allowlist.

**AI Agent Prompt**:
```
In services/api_gateway/main.py, find the CORSMiddleware configuration (line ~194).
Change allow_origins=["*"] to:
  allow_origins=os.getenv("COSMICSEC_CORS_ORIGINS", "http://localhost:3000").split(",")
Keep allow_methods and allow_headers as-is.
Add allow_credentials=True only when origins are explicitly listed.
Update .env.example with COSMICSEC_CORS_ORIGINS=http://localhost:3000,http://localhost:4173
```

**Fallback Strategy**: ❌ **No fallback** — `allow_origins=["*"]` is a security vulnerability. The old behavior must be fully removed.

**Files**:
- `services/api_gateway/main.py` — Fix CORS
- `.env.example` — Add COSMICSEC_CORS_ORIGINS

**Acceptance Criteria**:
- [ ] `allow_origins` no longer contains `"*"`
- [ ] Requests from unlisted origins are rejected with 403
- [ ] Requests from listed origins work normally
- [ ] `pytest tests/test_api_gateway.py -v` passes

---

### K.4 — Remove All Hardcoded Secrets

**What to do**: Remove default admin password from init-db.sql, remove hardcoded "ChangeMe123!" from admin dashboard, remove hardcoded localhost URL.

**AI Agent Prompt**:
```
1. infrastructure/init-db.sql: Remove the INSERT with default admin password.
   Replace with a comment: -- Admin user created on first boot via COSMICSEC_ADMIN_EMAIL env var
   Add a startup script (scripts/init-admin.py) that creates admin with random password
   and prints it to stdout on first run only.

2. frontend/src/pages/AdminDashboardPage.tsx:
   - Line ~31: Replace const API = "http://localhost:8000" with:
     const API = import.meta.env.VITE_API_BASE_URL || ""
   - Line ~95-107: Remove hardcoded "ChangeMe123!" password.
     Instead, prompt admin to enter password via a modal dialog with strength validation.

3. Update .env.example and frontend/.env.example with VITE_API_BASE_URL
```

**Fallback Strategy**: ❌ **No fallback** for secrets — hardcoded credentials are always a vulnerability. For the API URL, the fallback `|| ""` means relative URLs (same-origin), which is the correct production behavior.

**Files**:
- `infrastructure/init-db.sql` — Remove default password
- `scripts/init-admin.py` — New: first-boot admin creation
- `frontend/src/pages/AdminDashboardPage.tsx` — Fix URL and password
- `.env.example`, `frontend/.env.example` — Add variables

**Acceptance Criteria**:
- [ ] `grep -r "ChangeMe" frontend/` returns nothing
- [ ] `grep -r "localhost:8000" frontend/src/` returns nothing
- [ ] init-db.sql contains no plaintext passwords
- [ ] Admin creation script generates random password and prints once

---

### K.5 — Login Rate Limiting

**What to do**: Add rate limiting to auth service login endpoint to prevent brute force.

**AI Agent Prompt**:
```
In services/auth_service/main.py:
1. Add slowapi rate limiter to the login endpoint:
   - 5 attempts per 15 minutes per IP address
   - Return 429 Too Many Requests with Retry-After header
2. Add account lockout:
   - Track failed attempts per email in Redis (or in-memory Counter as fallback)
   - After 10 failed attempts: lock account for 30 minutes
   - Return specific error: "Account temporarily locked. Try again in X minutes."
3. Add successful login counter reset (clear failed attempts on success)
```

**Fallback Strategy**: ✅ **If Redis is unavailable, fall back to in-memory Counter** (from `collections.Counter`). The in-memory counter is per-process and resets on restart, but it still provides basic protection. Log a warning when using fallback.

**Files**:
- `services/auth_service/main.py` — Add rate limiting
- `services/auth_service/rate_limiter.py` — New: rate limit logic with Redis + in-memory fallback

**Acceptance Criteria**:
- [ ] 6th login attempt within 15 minutes returns 429
- [ ] 11th failed attempt to same email returns account locked error
- [ ] Successful login resets failed attempt counter
- [ ] Works without Redis (fallback to in-memory)

---

### K.6 — XSS Prevention in Reports

**What to do**: Replace f-string HTML concatenation with Jinja2 templates with auto-escaping.

**AI Agent Prompt**:
```
In services/report_service/main.py:
1. Find the HTML report generation (around line 91-105) that uses f-strings
2. Replace with Jinja2 template:
   - Create services/report_service/templates/report.html.j2
   - Use Jinja2 Environment with autoescape=True
   - All user-supplied data (finding titles, descriptions, evidence) must go through
     the template engine — never concatenated into HTML directly
3. Add markupsafe import for any manual HTML construction elsewhere
```

**Fallback Strategy**: ❌ **No fallback** — f-string HTML is an XSS vulnerability. Must be fully replaced.

**Files**:
- `services/report_service/main.py` — Replace f-string HTML
- `services/report_service/templates/report.html.j2` — New: Jinja2 template

**Acceptance Criteria**:
- [ ] `grep -n "f'" services/report_service/main.py | grep -i html` returns nothing
- [ ] Report with `<script>alert(1)</script>` in finding title renders escaped text
- [ ] `pytest tests/test_report_service.py -v` passes

---

### K.7 — WebSocket Authentication

**What to do**: Add JWT validation on WebSocket upgrade for collab_service and agent_relay.

**AI Agent Prompt**:
```
1. In services/collab_service/main.py:
   - On WebSocket connect, extract token from query parameter (?token=...) or
     Sec-WebSocket-Protocol header
   - Validate JWT using the same secret/algorithm as auth service
   - Reject connection with 4001 close code if token invalid/expired
   - Extract user_id from token claims for room presence tracking

2. In services/agent_relay/main.py:
   - Same JWT validation on WebSocket upgrade
   - Also accept API key authentication (X-API-Key header in upgrade request)

3. In frontend/src/hooks/useScanStream.ts:
   - Always use wss:// when window.location.protocol is https:
   - Pass token as query parameter: ?token=${localStorage.getItem('cosmicsec_token')}
```

**Fallback Strategy**: ❌ **No fallback** — unauthenticated WebSocket is a security vulnerability. Must require auth.

**Files**:
- `services/collab_service/main.py` — Add WS auth
- `services/agent_relay/main.py` — Add WS auth
- `frontend/src/hooks/useScanStream.ts` — Pass token, force wss://
- `services/common/jwt_utils.py` — New: shared JWT validation helper

**Acceptance Criteria**:
- [ ] WebSocket connection without token is rejected (4001 close)
- [ ] WebSocket connection with valid token succeeds
- [ ] WebSocket connection with expired token is rejected
- [ ] Frontend always sends token in WS connection

---

### K.8 — Remove Production --reload & Fix Docker Mismatches

**What to do**: Remove `--reload` from production compose, fix Node.js version mismatch, fix Python version inconsistency.

**AI Agent Prompt**:
```
1. docker-compose.yml: Remove --reload from all uvicorn commands
2. Create docker-compose.dev.yml with --reload overrides for development
3. Change frontend service from node:20-alpine to node:22-alpine (LTS)
4. Fix services/notification_service/Dockerfile: change python:3.12-slim to python:3.13-slim
5. Move Redis requirepass from command line to redis.conf mount
6. Update Makefile: make dev uses docker-compose.dev.yml overlay
```

**Fallback Strategy**: ✅ **`docker-compose.dev.yml` is the fallback** — developers who need hot-reload use `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.

**Files**:
- `docker-compose.yml` — Remove `--reload`, fix images
- `docker-compose.dev.yml` — New: development overrides
- `services/notification_service/Dockerfile` — Fix Python version
- `infrastructure/redis.conf` — New: Redis config file
- `Makefile` — Update dev target

**Acceptance Criteria**:
- [ ] `grep -n "\-\-reload" docker-compose.yml` returns nothing
- [ ] `make dev` starts services with hot-reload
- [ ] All services use Python 3.13
- [ ] Frontend Docker uses Node 22 LTS

---

### K.9 — Narrow Exception Handlers

**What to do**: Replace all 114+ bare `except Exception:` handlers with specific exception types.

**AI Agent Prompt**:
```
Search all Python files in services/ for bare except handlers:
  grep -rn "except Exception" services/

For each occurrence:
1. Determine what operation is being tried (HTTP call, DB query, JSON parse, etc.)
2. Replace with specific exception:
   - HTTP calls: except httpx.HTTPError
   - DB operations: except sqlalchemy.exc.SQLAlchemyError
   - JSON parsing: except (json.JSONDecodeError, KeyError)
   - Redis: except redis.RedisError
   - WebSocket: except WebSocketDisconnect
   - File I/O: except (OSError, IOError)
3. Ensure every caught exception is logged with logger.exception() or logger.error(..., exc_info=True)
4. Keep a final except Exception as last resort ONLY at the top-level request handler,
   and always log the full traceback
```

**Fallback Strategy**: ✅ **Keep a broad `except Exception` at the outermost request handler level only** — this prevents 500 errors from crashing the service. All inner handlers must be specific.

**Files**:
- All files in `services/` — Narrow exception handlers

**Acceptance Criteria**:
- [ ] `grep -c "except Exception" services/*/main.py` shows significant reduction
- [ ] All caught exceptions are logged with traceback
- [ ] `ruff check . --output-format=github` passes
- [ ] `pytest tests/ -v` passes (no regressions)

---

### 🧪 Phase K Verification

```bash
# Security checks
grep -r 'allow_origins=\["\*"\]' services/          # Must return nothing
grep -r "ChangeMe" frontend/src/                     # Must return nothing
grep -r "localhost:8000" frontend/src/pages/          # Must return nothing
grep -r "fake_.*_db" services/auth_service/           # Must return nothing (as primary store)
grep -rn "\-\-reload" docker-compose.yml              # Must return nothing

# Build & test
cd frontend && npx tsc --noEmit && npm run build && npm run test -- --run
cd .. && ruff check . --output-format=github
pytest tests/ -v --cov=services
```

---

## Phase L — Production Data Layer & Persistence

> 🎯 **Goal**: Replace ALL in-memory storage with PostgreSQL/Redis persistence. After this phase, no data is lost on service restart.
>
> 📋 **Prerequisites**: Phase K (auth stores fixed)
>
> 🌐 **Languages**: Python, SQL

### L.1 — Scan Service Persistence

**What to do**: Replace `scans = {}` in-memory dict with PostgreSQL. Add scan checkpoint/resume.

**AI Agent Prompt**:
```
In services/scan_service/main.py:
1. Replace the scans in-memory dict with SQLAlchemy CRUD operations
   using the Scan and Finding models from services/common/models.py
2. On scan creation: INSERT into scans table, return scan UUID
3. On finding discovery: INSERT into findings table with scan_id FK
4. On progress update: UPDATE scan progress_percent column
5. Add checkpoint: every 100 findings, commit transaction
6. Add resume: on startup, find scans with status="running", restart from last checkpoint
7. Keep an in-memory dict as hot cache for active scans (max 50, LRU eviction)
   Cache is populated on read, invalidated on write.

Fallback: In-memory cache → DB on miss → HTTP 503 on DB failure
```

**Fallback Strategy**: ✅ **In-memory LRU cache** for active scans (fast WebSocket updates), backed by DB persistence (survives restart). If DB is down, active scans continue in memory and flush to DB when connection recovers.

**Files**:
- `services/scan_service/main.py` — Add DB persistence
- `services/scan_service/repository.py` — New: scan CRUD operations

**Acceptance Criteria**:
- [ ] Create scan → restart service → scan data still exists
- [ ] Findings persist across restart
- [ ] Active scan WebSocket updates still work (from cache)
- [ ] `pytest tests/test_scan_service.py -v` passes

---

### L.2 — Plugin Registry Persistence

**What to do**: Replace `_marketplace`, `_ratings`, `_repositories` in-memory dicts with database tables.

**AI Agent Prompt**:
```
In plugins/registry.py:
1. Create new models in services/common/models.py:
   - PluginMarketplace(id, name, version, description, author, downloads, created_at)
   - PluginRating(id, plugin_id FK, user_id, rating 1-5, comment, created_at)
   - PluginRepository(id, url, name, verified, created_at)
2. Create Alembic migration: alembic revision --autogenerate -m "add plugin tables"
3. Replace all dict operations with SQLAlchemy queries
4. Keep in-memory dict as read-through cache (5 minute TTL, invalidate on write)

Fallback: Cache → DB → Empty response with 503 status
```

**Fallback Strategy**: ✅ **Read-through cache** with stale-while-revalidate. Plugin listings served from cache; DB is source of truth.

**Files**:
- `services/common/models.py` — Add plugin models
- `plugins/registry.py` — Use DB
- `alembic/versions/` — New migration

---

### L.3 — Integration Service Event Log Persistence

**What to do**: Replace `event_log = []` in integration service with database table.

**AI Agent Prompt**:
```
In services/integration_service/main.py:
1. Add IntegrationEvent model to services/common/models.py:
   IntegrationEvent(id UUID, provider, event_type, payload JSONB, status, created_at, response_code)
2. Replace event_log.append() with DB inserts
3. Replace event_log reads with DB queries (with pagination: LIMIT/OFFSET)
4. Keep last 100 events in memory for fast /events/recent endpoint

Fallback: In-memory recent buffer → DB for full history → Error on DB down
```

**Fallback Strategy**: ✅ **In-memory circular buffer** (deque, maxlen=100) for recent events API. Full history in DB.

---

### L.4 — Agent Relay State Persistence

**What to do**: Store registered agents in database instead of just in-memory.

**AI Agent Prompt**:
```
In services/agent_relay/main.py:
1. Use the existing AgentSession model from services/common/models.py
2. On agent connect: UPSERT into agent_sessions (agent_id, status='online', last_seen_at=now())
3. On agent disconnect: UPDATE status='offline'
4. On heartbeat: UPDATE last_seen_at=now()
5. Keep in-memory dict of currently connected WebSocket connections (needed for message routing)
   The dict maps agent_id → WebSocket connection. DB stores persistent state.

Fallback: In-memory for active connections (required for WS routing), DB for historical state
```

**Fallback Strategy**: ✅ **In-memory dict is required** for WebSocket connection routing (you can't store a WebSocket in a database). DB provides persistence for agent registry, status history, and task dispatch queue.

---

### L.5 — Redis Session Store

**What to do**: Move active session tracking to Redis with configurable timeout.

**AI Agent Prompt**:
```
Create services/common/session_store.py:
1. RedisSessionStore class:
   - store_session(user_id, session_id, token_hash, ttl=86400)
   - validate_session(session_id) → bool
   - revoke_session(session_id)
   - revoke_all_sessions(user_id)
   - get_active_sessions(user_id) → list
2. LocalSessionStore class (fallback):
   - Same interface using dict + threading.Timer for TTL
3. Factory: get_session_store() returns Redis if available, Local otherwise
4. Wire into auth service: validate session on every authenticated request

Fallback: Redis → in-memory dict with TTL timers → log warning about session non-persistence
```

**Fallback Strategy**: ✅ **In-memory session store as fallback** when Redis is unavailable. Sessions will be lost on restart but service continues working. Log warning: "Redis unavailable, using in-memory sessions (not persistent)".

---

### 🧪 Phase L Verification

```bash
# Persistence check (for each service):
# 1. Create data via API
# 2. Restart the service: docker compose restart <service>
# 3. Query the data — it should still exist

# DB migration check:
alembic upgrade head
alembic check  # Should report no pending migrations

# Full test suite:
pytest tests/ -v --cov=services
```

---

## Phase M — Frontend Completion & Modernization

> 🎯 **Goal**: Complete all incomplete frontend features, add centralized API client, code splitting, mobile responsive nav, and performance optimizations. After this phase, every page is fully functional.
>
> 📋 **Prerequisites**: Phase K (auth pages), Phase L (API returns real data)
>
> 🌐 **Languages**: TypeScript, CSS (Tailwind)

### M.1 — Centralized API Client

**What to do**: Create a single API client that all pages use instead of inline `fetch()`.

**AI Agent Prompt**:
```
Create frontend/src/api/client.ts:
1. Axios instance with:
   - baseURL from import.meta.env.VITE_API_BASE_URL || ""
   - Request interceptor: auto-attach Authorization Bearer token from AuthContext
   - Response interceptor: on 401 → call logout(), redirect to /auth/login
   - Response interceptor: on 5xx → retry up to 3 times with exponential backoff
   - Request cancellation: each request gets AbortController, cancel on component unmount
   - Timeout: 30 seconds default, configurable per-request

Create frontend/src/api/endpoints.ts:
   - Typed functions for every API endpoint:
     auth.login(email, password) → Promise<AuthResponse>
     auth.register(data) → Promise<AuthResponse>
     scans.create(target, tools) → Promise<Scan>
     scans.list(page, limit) → Promise<PaginatedList<Scan>>
     scans.get(id) → Promise<Scan>
     findings.list(scanId, page) → Promise<PaginatedList<Finding>>
     recon.query(domain) → Promise<ReconResult>
     ai.analyze(data) → Promise<AIAnalysis>
     reports.generate(scanId, format) → Promise<Report>
     ... etc for all endpoints

Migrate all inline fetch() calls in all pages to use these typed functions.
```

**Fallback Strategy**: ✅ **Axios with retry** is itself a fallback mechanism. On network error, retry 3 times. On API down, show user-friendly error message. Pages that had mock data fallback (DashboardPage) keep that fallback.

**Files**:
- `frontend/src/api/client.ts` — New
- `frontend/src/api/endpoints.ts` — New
- All page files — Migrate from `fetch()` to API client

---

### M.2 — Mobile Navigation

**What to do**: Add hamburger menu for mobile viewports. Currently, nav links disappear on mobile with no way to access them.

**AI Agent Prompt**:
```
In frontend/src/pages/LandingPage.tsx (and any shared nav component):
1. Add a hamburger button (3 horizontal lines icon from lucide-react: Menu)
   visible only below md breakpoint (hidden md:block for desktop links)
2. On click: slide-out drawer from right with all nav links
3. Add backdrop overlay (semi-transparent black)
4. Close on: backdrop click, Escape key, link click
5. Add smooth transition (transform translateX)
6. Also fix Sidebar.tsx for logged-in mobile view if not already responsive

Ensure PricingPage.tsx nav also gets the hamburger treatment.
```

**Fallback Strategy**: ✅ **Progressive enhancement** — desktop nav stays unchanged. Mobile hamburger is additive.

---

### M.3 — Code Splitting & Lazy Loading

**What to do**: Split the single 419KB JS bundle into route-level chunks.

**AI Agent Prompt**:
```
In frontend/src/App.tsx:
1. Replace all direct page imports with React.lazy():
   const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))
   const ScanPage = React.lazy(() => import('./pages/ScanPage'))
   ... for ALL page components

2. Wrap route elements with <Suspense fallback={<PageSkeleton />}>

3. Create frontend/src/components/PageSkeleton.tsx:
   - Animated skeleton matching the layout (sidebar + content area)
   - Pulse animation with Tailwind animate-pulse

4. Add React.memo to heavy list item components:
   - ScanCard, FindingCard, TimelineEvent, AgentCard

5. Add useMemo/useCallback in:
   - DashboardPage (stats computation)
   - TimelinePage (event filtering)
   - ScanPage (tool selection logic)

Target: initial bundle < 120KB, largest route chunk < 80KB
```

**Fallback Strategy**: ✅ **Suspense fallback** shows loading skeleton while chunks load. If chunk fails to load, ErrorBoundary catches and shows retry button.

---

### M.4 — Global Search Implementation

**What to do**: Wire the visible-but-non-functional GlobalSearch to actual search API.

**AI Agent Prompt**:
```
1. Create frontend/src/hooks/useSearch.ts:
   - Debounced search (300ms) across scans, findings, agents, reports
   - Calls GET /api/search?q={query}&limit=10
   - Returns categorized results: { scans: [], findings: [], agents: [], reports: [] }

2. Update frontend/src/components/Header.tsx GlobalSearch:
   - On input change: trigger debounced search
   - Show dropdown with categorized results (icons per category)
   - Keyboard navigation (up/down arrows, Enter to select)
   - Cmd/Ctrl+K shortcut to focus search
   - Click result → navigate to detail page
   - Show "No results" state

3. Backend: Add GET /api/search endpoint to API Gateway:
   - Searches across scans (target ILIKE), findings (title ILIKE),
     agents (name ILIKE), reports (id match)
   - Returns top 5 per category
   - Requires authentication
```

**Fallback Strategy**: ✅ **If search API is unavailable**, show message "Search unavailable" in dropdown instead of error. Client-side filter on cached data as secondary fallback.

---

### M.5 — Phase5 Operations Page Completion

**What to do**: Build the full SOC operations dashboard (currently only loading/error states).

**AI Agent Prompt**:
```
Rewrite frontend/src/pages/Phase5OperationsPage.tsx from 44 LOC to full dashboard:

1. Risk Posture section:
   - Overall risk score gauge (SVG arc, similar to DashboardPage)
   - Risk trend chart (last 30 days line chart)

2. SOC Metrics table:
   - MTTD (Mean Time to Detect)
   - MTTR (Mean Time to Respond)
   - Open incidents count
   - Closed this week
   Use GET /api/phase5/soc/metrics endpoint

3. Active Alerts feed:
   - Real-time alert cards (severity color-coded)
   - Acknowledge/dismiss buttons
   Use GET /api/phase5/alerts endpoint

4. Incident Timeline:
   - Vertical timeline of incidents
   - Status badges (open/investigating/resolved)

5. DevSecOps CI Gate status:
   - Table showing recent CI pipeline results
   - Pass/fail badges

6. Bug Bounty Earnings chart:
   - Monthly earnings bar chart
   - Total payout counter

Use mock data fallback if API unavailable (same pattern as DashboardPage).
Wire to phase5Api.ts with proper TypeScript types.
```

---

### M.6 — Settings Page API Integration

**What to do**: Wire "Save defaults" button and other settings to actual API calls.

**AI Agent Prompt**:
```
In frontend/src/pages/SettingsPage.tsx:
1. "Save scan defaults" button (line ~222): Add API call to POST /api/settings/scan-defaults
2. "Sign out all sessions" button (line ~342): Call POST /api/auth/sessions/revoke-all
3. "Delete account" button: Call DELETE /api/auth/account with confirmation
4. 2FA toggle: Call POST /api/auth/2fa/enable or DELETE /api/auth/2fa/disable
5. Add toast notifications on success/failure for each action
6. Add loading states on each save button
```

---

### M.7 — Pagination & Virtual Scrolling

**What to do**: Add pagination to all list views.

**AI Agent Prompt**:
```
Create frontend/src/components/Pagination.tsx:
1. Reusable component: <Pagination page={1} totalPages={10} onPageChange={fn} />
2. Shows: Previous, page numbers (with ellipsis), Next
3. Keyboard accessible

Add to these pages:
- ScanPage: scans list (20 per page)
- TimelinePage: events list (50 per page)
- AdminDashboardPage: audit logs (25 per page), users list (20 per page)
- ReportsPage: reports list (20 per page)
- BugBountyPage: programs list (10 per page)

For very long lists (1000+ items), add @tanstack/react-virtual for virtualized scrolling.
```

---

### M.8 — Zustand Store Persistence

**What to do**: Persist Zustand stores to survive page refresh.

**AI Agent Prompt**:
```
In frontend/src/store/scanStore.ts:
1. Add zustand persist middleware:
   import { persist } from 'zustand/middleware'
2. Persist to localStorage with key 'cosmicsec-scans'
3. Add TTL: clear cached scans older than 5 minutes
4. Add hydration loading state to prevent flash of empty content

Same for notificationStore.ts:
1. Persist unread notification count to localStorage
2. Don't persist the full notification list (too large, stale quickly)
```

**Fallback Strategy**: ✅ **localStorage is the primary store, Zustand in-memory is the working copy**. If localStorage is unavailable (private browsing), fall back to memory-only with no persistence.

---

### M.9 — Token Lifecycle Management

**What to do**: Add JWT expiration checking, silent refresh, and return-to URL on redirect.

**AI Agent Prompt**:
```
1. Update frontend/src/context/AuthContext.tsx:
   - On load: check if token is expired (decode JWT, check exp claim)
   - If expired: attempt silent refresh via POST /api/auth/refresh
   - If refresh fails: logout and redirect to /auth/login

2. Create frontend/src/hooks/useTokenRefresh.ts:
   - Set interval to check token expiry every 60 seconds
   - If token expires within 5 minutes: trigger silent refresh
   - On refresh success: update token in AuthContext

3. Update frontend/src/router/ProtectedRoute.tsx:
   - Save current path before redirect: sessionStorage.setItem('returnTo', location.pathname)
   - After login: redirect to returnTo path instead of /dashboard

Fallback: If silent refresh fails, user must re-login. Preserve their
intended destination URL so they land on the right page after login.
```

**Fallback Strategy**: ✅ **Return-to URL in sessionStorage** ensures users don't lose their place. **localStorage token** is the primary auth, **sessionStorage returnTo** is the redirect fallback.

---

### 🧪 Phase M Verification

```bash
# Frontend build
cd frontend && npx tsc --noEmit && npm run build

# Bundle size check
ls -la frontend/dist/assets/*.js  # Largest chunk should be < 120KB

# Unit tests
cd frontend && npm run test -- --run

# Mobile responsive check (Playwright)
cd frontend && npx playwright test

# All pages accessible
# Navigate to each page and verify no console errors
```

---

## Phase N — Dependency Modernization & Upgrade Wave

> 🎯 **Goal**: Upgrade all dependencies to latest versions, remove deprecated packages, fix version mismatches. See [`DEPENDENCY_AUDIT.md`](./DEPENDENCY_AUDIT.md) for complete version comparison.
>
> 📋 **Prerequisites**: Phase K (security fixes avoid regressions during upgrades)
>
> 🌐 **Languages**: Python, TypeScript, Go, YAML

### N.1 — Remove Deprecated Packages

**AI Agent Prompt**:
```
1. Remove aioredis from requirements.txt (merged into redis>=4.2.0).
   Find all "import aioredis" and replace with "import redis.asyncio as aioredis"
   This is a drop-in replacement — same API.

2. Replace fuzzywuzzy with thefuzz in requirements.txt.
   Find all "from fuzzywuzzy" and replace with "from thefuzz"
   Same API, actively maintained fork.

3. Replace opentelemetry-exporter-jaeger with opentelemetry-exporter-otlp-proto-grpc
   in pyproject.toml and requirements.txt.
   In services/common/observability.py:
   - Replace JaegerExporter with OTLPSpanExporter
   - Update endpoint config to OTLP endpoint (Jaeger supports OTLP natively)
```

---

### N.2 — Python Minor Version Bumps (Safe)

**AI Agent Prompt**:
```
In requirements.txt and pyproject.toml, bump these minimum versions:
- fastapi: >=0.104.0 → >=0.115.0
- uvicorn: >=0.24.0 → >=0.32.0
- pydantic: >=2.5.0 → >=2.10.0
- sqlalchemy: >=2.0.0 → >=2.0.35
- alembic: >=1.12.0 → >=1.15.0
- httpx: >=0.25.0 → >=0.27.0
- opentelemetry-api: >=1.20.0 → >=1.30.0
- opentelemetry-sdk: >=1.20.0 → >=1.30.0
- cryptography: >=41.0.0 → >=44.0.0
- jinja2: >=3.1.0 → >=3.1.4
- pyyaml: >=6.0 → >=6.0.2
- rich: >=13.7.0 → >=14.0.0
- typer: >=0.12.5 → >=0.15.0

Then run: pip install -r requirements.txt && pytest tests/ -v
Fix any failures.
```

---

### N.3 — Major Version Upgrades (Careful)

**AI Agent Prompt**:
```
These need migration work — do one at a time with full test suite between each:

1. openai 1.x → 2.x:
   - Update client initialization: OpenAI() constructor changed
   - Update streaming API usage
   - Run: pytest tests/test_ai_service.py -v

2. langchain 0.3.x → 1.x:
   - Update chain construction to LCEL
   - Update deprecated imports
   - Run: pytest tests/test_ai_service.py -v

3. sentry-sdk 1.x → 2.x:
   - Update sentry_sdk.init() call
   - Remove deprecated integrations parameter
   - Run full test suite

4. marshmallow 3.x → 4.x:
   - Update Schema class (fields declaration changed)
   - Run affected tests
```

---

### N.4 — Frontend Package Upgrades

**AI Agent Prompt**:
```
In frontend/:
1. Safe minor bumps (batch):
   npx npm-check-updates -u --target minor
   npm install
   npx tsc --noEmit && npm run build && npm run test -- --run

2. Major: react-router-dom 6.x → 7.x:
   - Update createBrowserRouter usage
   - Add loader/action pattern where beneficial
   - Extensive testing needed for all routes

3. Major: lucide-react 0.x → 1.x:
   - Update import paths if changed
   - Run build to find any broken icon imports

4. Update sdk/typescript/package.json:
   - vitest: ^1.6.0 → ^4.1.0
   - typescript: ^5.4.0 → ^5.9.0
```

---

### N.5 — Infrastructure Image Upgrades

**AI Agent Prompt**:
```
In docker-compose.yml, upgrade these images:
- traefik:v3.1 → traefik:v3.4
- postgres:16-alpine → postgres:17-alpine (test Alembic migrations first!)
- elasticsearch:8.11.0 → elasticsearch:8.17.0
- grafana:10.4.2 → grafana:11.4.0
- loki:2.9.7 → loki:3.3.0 (breaking: test log queries)
- node:20-alpine → node:22-alpine

DO NOT upgrade yet:
- RabbitMQ 3.x → 4.x (wait for Celery compatibility confirmation)
- Prometheus v2 → v3 (wait for Grafana ecosystem support)
- Redis 7 → 8 (evaluate SSPL license implications)
```

---

### N.6 — Go SDK & Pre-commit Updates

**AI Agent Prompt**:
```
1. sdk/go/go.mod: Change go 1.22 → go 1.24
2. .pre-commit-config.yaml:
   - ruff-pre-commit rev: v0.4.4 → v0.11.0
   - mirrors-mypy rev: v1.11.2 → v1.15.0
3. .github/workflows/security-scan.yml:
   - github/codeql-action/upload-sarif: v3 → v4
```

---

### 🧪 Phase N Verification

```bash
# Python
pip install -r requirements.txt
pytest tests/ -v --cov=services
ruff check . --output-format=github

# Frontend
cd frontend && npm install && npx tsc --noEmit && npm run build && npm run test -- --run

# Docker (if available)
docker compose build --no-cache
docker compose up -d && sleep 30
curl -sf http://localhost:8000/api/health && echo "Gateway OK"
```

---

## Phase O — Test Coverage & Quality Gates

> 🎯 **Goal**: Reach 85%+ backend test coverage and 80%+ frontend test coverage. Add full E2E test suite. After this phase, every code change is validated by automated tests.
>
> 📋 **Prerequisites**: Phases K, L, M (test against working code, not stubs)
>
> 🌐 **Languages**: Python, TypeScript

### O.1 — Backend Test Coverage

**AI Agent Prompt** (for each untested service):
```
Create test files for services that currently have ZERO tests:

1. tests/test_integration_service.py:
   - Test: provider registration (Jira, Slack, Teams)
   - Test: webhook forwarding (mock HTTP endpoint)
   - Test: event logging to database
   - Test: error handling for unreachable providers
   Target: 15+ tests

2. tests/test_collab_service.py:
   - Test: WebSocket room creation/join/leave
   - Test: message persistence
   - Test: presence tracking
   - Test: authentication on WebSocket upgrade
   Target: 15+ tests

3. tests/test_plugin_registry.py:
   - Test: plugin CRUD
   - Test: plugin rating
   - Test: SDK contract validation
   Target: 10+ tests

4. tests/test_notification_service.py:
   - Test: email dispatch (mock SMTP)
   - Test: Slack notification (mock webhook)
   - Test: rate limiting
   Target: 10+ tests

5. tests/test_admin_service.py:
   - Test: user management CRUD
   - Test: audit log retrieval
   - Test: RBAC enforcement
   Target: 10+ tests

Add to existing test files:
6. tests/test_api_gateway.py: Add tests for CORS, WAF, rate limiting, GraphQL
7. tests/test_auth_service.py: Add tests for 2FA flow, OAuth, rate limiting, session management
8. tests/test_scan_service.py: Add tests for WebSocket streaming, scan cancellation, checkpoint/resume

Coverage target: 85%+ overall
Run: pytest tests/ -v --cov=services --cov-fail-under=85
```

---

### O.2 — Frontend Unit Tests

**AI Agent Prompt**:
```
Create comprehensive frontend tests:

1. frontend/src/__tests__/pages/LoginPage.test.tsx:
   - Renders form fields (email, password, submit)
   - Shows validation error on empty submit
   - Shows loading state during API call
   - Redirects to dashboard on success
   - Displays API error message on failure
   Use: @testing-library/react, vitest, msw for API mocking

2. Create similar test files for ALL pages:
   - RegisterPage.test.tsx (5 tests)
   - DashboardPage.test.tsx (8 tests)
   - ScanPage.test.tsx (6 tests)
   - ReconPage.test.tsx (5 tests)
   - AIAnalysisPage.test.tsx (5 tests)
   - SettingsPage.test.tsx (5 tests)
   - AdminDashboardPage.test.tsx (5 tests)

3. frontend/src/__tests__/hooks/useScanStream.test.ts:
   - Mock WebSocket connection
   - Test message handling (progress, finding, complete, error)
   - Test reconnection logic

4. frontend/src/__tests__/stores/scanStore.test.ts:
   - Test addScan, updateScan, setActiveScan
   - Test persistence (if added)

5. frontend/src/__tests__/context/AuthContext.test.tsx:
   - Test login/logout
   - Test token persistence
   - Test token expiry handling

Coverage target: 80%+ statements
Run: cd frontend && npm run test -- --run --coverage
```

---

### O.3 — E2E Test Suite (Playwright)

**AI Agent Prompt**:
```
Expand frontend/tests/e2e/ with comprehensive Playwright tests:

1. auth-flow.spec.ts:
   - Register new account → redirects to login
   - Login with valid credentials → lands on dashboard
   - Login with invalid credentials → shows error
   - Forgot password flow → shows success message
   - Logout → redirects to login
   - Protected route → redirects to login when not authenticated

2. scan-flow.spec.ts:
   - Create new scan → shows progress
   - View scan results → findings displayed
   - Export report → file downloaded

3. navigation.spec.ts:
   - All sidebar links navigate correctly
   - Mobile hamburger menu opens/closes
   - 404 page shown for invalid routes
   - Browser back/forward works

4. responsive.spec.ts:
   - Test at 375px (iPhone), 768px (tablet), 1280px (desktop)
   - Verify layout doesn't break at each viewport

5. accessibility.spec.ts:
   - Tab through all interactive elements
   - Screen reader announcements for dynamic content
   - Color contrast passes WCAG AA

Configure in frontend/playwright.config.ts:
- Run against dev server (vite preview)
- Screenshot on failure
- 3 retry attempts
```

---

### O.4 — CI Quality Gates

**AI Agent Prompt**:
```
Update .github/workflows/test.yml:

1. Add coverage thresholds:
   - pytest: --cov-fail-under=80
   - vitest: add coverage threshold in vite.config.ts

2. Add Playwright E2E as CI job:
   - Install browsers
   - Start frontend preview server
   - Run playwright test
   - Upload screenshots on failure as artifacts

3. Add type checking as required check:
   - cd frontend && npx tsc --noEmit (must pass)
   - mypy services/ --ignore-missing-imports (must pass with warnings only)

4. Add bundle size check:
   - After vite build, check that no chunk exceeds 150KB
   - Fail if total JS > 500KB
```

---

### 🧪 Phase O Verification

```bash
# Backend coverage
pytest tests/ -v --cov=services --cov-fail-under=80 --cov-report=html
# Open htmlcov/index.html to review

# Frontend coverage
cd frontend && npm run test -- --run --coverage

# E2E tests
cd frontend && npx playwright test --reporter=html

# CI simulation
ruff check . && pytest tests/ -v && cd frontend && npx tsc --noEmit && npm run build && npm run test -- --run
```

---

## Phase P — Rust High-Performance Ingest Engine

> 🎯 **Goal**: Build a Rust-based data ingest engine that can parse 50,000+ findings/second from security tools. This replaces the Python parsers for high-volume workloads while keeping Python as fallback for low-volume scenarios.
>
> 📋 **Prerequisites**: Phase L (database schema stable)
>
> 🌐 **Languages**: Rust, Protocol Buffers, SQL

### P.1 — Ingest Engine Scaffold

**AI Agent Prompt**:
```
Create the Rust ingest engine:

ingest/
├── Cargo.toml           # Dependencies: tokio, sqlx, serde, quick-xml, tonic (gRPC)
├── Dockerfile            # Multi-stage: rust:1.85-slim → debian:bookworm-slim
├── src/
│   ├── main.rs           # Tokio async main, gRPC + HTTP health server
│   ├── config.rs          # Env-based config (DATABASE_URL, REDIS_URL, GRPC_PORT)
│   ├── parsers/
│   │   ├── mod.rs         # Parser trait: trait Parser { fn parse(&self, raw: &[u8]) -> Vec<Finding> }
│   │   ├── nmap.rs        # Nmap XML parser using quick-xml (streaming, not DOM)
│   │   ├── nikto.rs       # Nikto CSV/JSON parser
│   │   ├── nuclei.rs      # Nuclei JSONL parser (one JSON per line)
│   │   ├── zap.rs         # OWASP ZAP XML parser
│   │   └── generic.rs     # Generic JSON finding parser
│   ├── normalizer.rs      # Normalize all parser output to CosmicSec Finding schema
│   ├── db.rs              # PostgreSQL bulk insert using COPY protocol (sqlx)
│   ├── stream.rs          # Redis Streams consumer for incoming scan data
│   └── metrics.rs         # Prometheus metrics: findings_parsed_total, parse_errors_total, insert_duration
├── proto/
│   └── ingest.proto       # gRPC: IngestService { rpc IngestBatch(IngestRequest) returns (IngestResponse) }
└── tests/
    ├── fixtures/           # Real nmap/nikto/nuclei output files for testing
    └── integration.rs      # Full pipeline test: raw input → parse → normalize → DB insert

Performance targets:
- Parse: 10,000 nmap hosts/second
- Insert: 50,000 findings/second (PostgreSQL COPY)
- Memory: < 100MB for 1M finding batch
```

**Fallback Strategy**: ✅ **Python parsers remain as fallback**. The API Gateway routes to Rust ingest engine when available, falls back to Python-based parsing in scan_service when Rust is unavailable. Feature flag: `COSMICSEC_USE_RUST_INGEST=true|false`.

---

### P.2 — Integration with Python Services

**AI Agent Prompt**:
```
1. Add gRPC client to API Gateway:
   - pip install grpcio grpcio-tools
   - Generate Python stubs from proto/ingest.proto
   - Route POST /api/ingest/batch to Rust engine via gRPC

2. Add Redis Streams bridge:
   - Rust engine publishes parsed findings to Redis Stream 'findings:parsed'
   - Python AI service consumes from stream for analysis
   - Python notification service consumes for alerting

3. Add health check:
   - Rust engine exposes GET /health on HTTP port
   - API Gateway checks Rust engine health
   - If unhealthy: fall back to Python parsers with warning log

4. Add to docker-compose.yml:
   ingest:
     build: ./ingest
     environment:
       - DATABASE_URL=postgresql://...
       - REDIS_URL=redis://...
     ports:
       - "50051:50051"  # gRPC
       - "8099:8099"    # Health
```

---

## Phase Q — Advanced AI, ML & Agentic Workflows

> 🎯 **Goal**: Complete all AI stub implementations, add local LLM support, build RAG knowledge base, and implement LangGraph multi-agent workflows. After this phase, AI features work end-to-end with real ML models.
>
> 📋 **Prerequisites**: Phase L (vector store needs persistent data), Phase N (updated langchain/openai)
>
> 🌐 **Languages**: Python

### Q.1 — Complete AI Stub Implementations

**AI Agent Prompt**:
```
Complete these stub files with real implementations:

1. services/ai_service/vector_store.py:
   - Initialize ChromaDB collection "cosmicsec_findings"
   - ingest_findings(findings: list[Finding]) → embed and store
   - search_similar(query: str, k: int) → list of similar findings
   - Use OpenAI embeddings (text-embedding-3-small) or local sentence-transformers

2. services/ai_service/anomaly_detector.py:
   - Train isolation forest on historical finding features:
     (severity_numeric, cvss_score, port_count, days_since_last_scan)
   - score_finding(finding) → anomaly_score (0-1)
   - Flag findings with score > 0.8 as anomalous
   - Retrain weekly using APScheduler cron trigger

3. services/ai_service/red_team.py:
   - generate_attack_path(findings) → list of attack steps using MITRE ATT&CK graph
   - Each step: technique_id, description, prerequisites, impact
   - Prioritize paths by cumulative CVSS score
   - Output: ordered list of attack steps with recommended defenses

4. services/ai_service/zero_day_predictor.py:
   - Feature extraction from CVE data: vendor, product, CWE, CVSS components
   - Train gradient boosting classifier (scikit-learn)
   - Predict: is_zero_day_likely(cve_features) → probability
   - Retrain monthly on new CVE data
```

**Fallback Strategy**: ✅ **Each AI feature has a rule-based fallback**. If ML model is unavailable (not trained, error), fall back to:
- Vector search → keyword search in PostgreSQL (pg_trgm)
- Anomaly detection → simple threshold rules (CVSS > 9.0 = anomalous)
- Red team → static MITRE ATT&CK mapping (already exists)
- Zero-day → manual severity assessment

---

### Q.2 — Local LLM Support (Ollama)

**AI Agent Prompt**:
```
In services/ai_service/:
1. Add Ollama provider alongside OpenAI:
   - Create llm_providers.py with abstract LLMProvider class
   - OpenAIProvider: uses openai client
   - OllamaProvider: uses httpx to call Ollama API (http://localhost:11434)
   - Factory: get_llm_provider(name) → returns configured provider

2. Support these Ollama models:
   - llama3.1:8b — general analysis
   - codellama:13b — code vulnerability analysis
   - mistral:7b — fast inference

3. Add model management endpoints:
   - GET /api/ai/models → list available models (local + cloud)
   - POST /api/ai/models/pull → trigger Ollama model download
   - GET /api/ai/models/{name}/status → download progress

4. Add provider selection in AI analysis:
   - POST /api/ai/analyze body includes optional "provider": "openai" | "ollama"
   - Default: use COSMICSEC_DEFAULT_LLM_PROVIDER env var

Fallback: If selected provider fails, try the other provider.
If both fail, return analysis with rule-based fallback (MITRE mapping only).
```

**Fallback Strategy**: ✅ **Provider cascade**: Selected provider → alternate provider → rule-based analysis. User always gets some result.

---

### Q.3 — RAG Knowledge Base

**AI Agent Prompt**:
```
1. Create scripts/load_kb.py (expand existing stub):
   - Download NVD CVE data (JSON feeds) → parse → embed → store in ChromaDB
   - Download MITRE ATT&CK data (STIX format) → parse techniques → embed → store
   - Support custom knowledge upload (markdown, PDF → text extraction → embed)

2. Add RAG-augmented analysis in ai_service:
   - When analyzing a finding, retrieve top-5 similar CVEs from ChromaDB
   - Include retrieved context in LLM prompt
   - Add source citations in response: "Based on CVE-2024-XXXX (similarity: 0.92)"

3. Add knowledge base management endpoints:
   - POST /api/ai/kb/ingest → upload custom documents
   - GET /api/ai/kb/stats → collection size, last update
   - POST /api/ai/kb/refresh → re-download NVD/MITRE data

Fallback: If ChromaDB unavailable, analyze without RAG context.
Log warning: "RAG unavailable, analysis quality may be reduced"
```

---

### Q.4 — LangGraph Multi-Agent Workflow

**AI Agent Prompt**:
```
In services/ai_service/agents.py:
1. Build a LangGraph StateGraph with 4 agent nodes:

   TriageAgent:
   - Input: raw findings list
   - Action: classify each finding by severity, category, confidence
   - Output: triaged findings with priority scores

   AnalysisAgent:
   - Input: single finding
   - Action: deep analysis with RAG context, similar CVE lookup
   - Output: detailed analysis with remediation steps

   CorrelationAgent:
   - Input: all findings from a scan
   - Action: find related findings (same host, same vuln class, attack chain)
   - Output: correlation groups with aggregate risk score

   RemediationAgent:
   - Input: correlated finding groups
   - Action: generate prioritized fix plan with code snippets
   - Output: ordered remediation playbook

2. Wire the graph: Triage → Analysis → Correlation → Remediation
3. Add streaming: each agent node streams partial results via WebSocket
4. Add visualization endpoint: GET /api/ai/workflow/{run_id}/graph → Mermaid diagram

Fallback: If any agent node fails, skip it and pass data to next node.
Minimum viable output: Triage only (always works — rule-based fallback).
```

---

## Phase R — Enterprise, Multi-Tenancy & Premium Features

> 🎯 **Goal**: Add organization-scoped multi-tenancy, SSO, advanced RBAC, compliance automation, and white-label support. After this phase, CosmicSec is ready for enterprise customers.
>
> 📋 **Prerequisites**: Phases K-O stable
>
> 🌐 **Languages**: Python, TypeScript, SQL

### R.1 — Multi-Tenancy

**AI Agent Prompt**:
```
1. Add organization_id column to ALL relevant tables:
   - users, scans, findings, api_keys, audit_logs, etc.
   - Create Alembic migration

2. Create Organization model:
   - id, name, slug, logo_url, primary_color, seat_limit, plan (free/pro/enterprise)
   - settings JSONB (custom config per org)

3. Add tenant isolation middleware in API Gateway:
   - Extract org_id from JWT claims
   - Inject org_id filter into all database queries
   - Prevent cross-tenant data access

4. Add organization management endpoints:
   - POST /api/orgs — create organization
   - GET /api/orgs/:id — get org details
   - PUT /api/orgs/:id — update org settings
   - POST /api/orgs/:id/invite — invite member
   - GET /api/orgs/:id/members — list members

5. Frontend: Add organization switcher in Header
```

---

### R.2 — SSO Integration

**AI Agent Prompt**:
```
1. Add SAML 2.0 support:
   - pip install python-saml2
   - Add SSO endpoints: /api/auth/sso/saml/metadata, /api/auth/sso/saml/acs
   - Support: Okta, Azure AD, Google Workspace

2. Add OIDC support:
   - pip install authlib
   - Add endpoints: /api/auth/sso/oidc/authorize, /api/auth/sso/oidc/callback
   - Support: Auth0, Keycloak, Google, GitHub, Microsoft

3. Frontend: Add "Sign in with SSO" button on LoginPage
   - Organization slug input → fetch SSO config → redirect to IdP

Fallback: SSO is additive. Email/password login always available as fallback.
```

---

### R.3 — Compliance Automation

**AI Agent Prompt**:
```
Create services/compliance_service/ (new microservice):

1. SOC2 Type II:
   - Automated evidence collection for trust criteria
   - Map findings to SOC2 controls
   - Generate SOC2 readiness report

2. PCI-DSS:
   - Network segmentation validation from scan results
   - Credit card number detection in findings (regex + ML)
   - PCI-DSS compliance checklist with auto-fill

3. HIPAA:
   - PHI detection in scan results
   - Access logging compliance check
   - HIPAA risk assessment template

4. ISO 27001:
   - Control mapping from findings to Annex A controls
   - Risk assessment scoring
   - Statement of Applicability generator

5. Compliance report scheduling:
   - Monthly/quarterly automated generation
   - Email delivery to compliance officers
   - Historical trend tracking
```

---

### R.4 — Advanced RBAC & Permissions

**AI Agent Prompt**:
```
1. Expand Casbin model:
   - Add resource-level permissions (scan:read, scan:write, scan:delete per org)
   - Add custom role creation
   - Built-in templates: SOC Analyst, Pentester, Manager, Auditor, Viewer

2. Frontend: Add Roles & Permissions page in Admin Dashboard
   - Role editor with checkbox matrix (resource × action)
   - User-role assignment
   - Permission test tool ("Can user X do Y on resource Z?")

3. API: Add permission check middleware
   - @require_permission("scan", "write") decorator for endpoints
   - Audit log every permission check
```

---

### R.5 — White-Label Support

**AI Agent Prompt**:
```
1. Organization branding:
   - Custom logo (upload via /api/orgs/:id/branding)
   - Custom primary/accent colors (CSS variables)
   - Custom email templates (header/footer)
   - Custom report headers/footers

2. Custom domain support:
   - Add CNAME mapping: security.company.com → cosmicsec
   - Traefik dynamic config for custom domains
   - SSL certificate via Let's Encrypt

3. Frontend theming:
   - Read org branding from API on load
   - Apply custom CSS variables
   - Show custom logo in header

Fallback: Default CosmicSec branding if no custom branding configured.
```

---

## Phase S — Performance, Observability & Global Scale

> 🎯 **Goal**: Add comprehensive observability, caching strategy, database optimization, and horizontal scaling. After this phase, CosmicSec handles 10,000+ concurrent users.
>
> 📋 **Prerequisites**: Phases K-R stable
>
> 🌐 **Languages**: Python, SQL, YAML

### S.1 — Caching Strategy

**AI Agent Prompt**:
```
Implement comprehensive Redis caching:

1. API Gateway response cache (services/api_gateway/):
   - Cache GET responses for 60s (configurable per route)
   - Cache key: hash(method + path + query + user_id)
   - Invalidate on POST/PUT/DELETE to same resource
   - Add Cache-Control headers

2. Recon results cache (services/recon_service/):
   - DNS lookups: 1 hour TTL
   - Shodan results: 24 hour TTL
   - VirusTotal results: 12 hour TTL
   - Cache key: hash(provider + query)

3. AI analysis cache (services/ai_service/):
   - Cache analysis results by finding hash: 1 hour TTL
   - Cache MITRE mapping: 24 hour TTL

4. Dashboard stats cache:
   - Pre-compute dashboard aggregates every 5 minutes
   - Store in Redis as JSON
   - Serve from cache, never compute on request

5. Add cache metrics to Prometheus:
   - cache_hit_total, cache_miss_total, cache_eviction_total per service

Fallback: If Redis unavailable, all caches are skipped (compute on every request).
Log warning. Service works correctly but slower.
```

**Fallback Strategy**: ✅ **Every cache is optional**. Services work without Redis, just slower. Cache is performance optimization, never correctness requirement.

---

### S.2 — Database Optimization

**AI Agent Prompt**:
```
1. Add read replicas config:
   - services/common/db.py: Add read_engine for SELECT queries
   - Write engine for INSERT/UPDATE/DELETE
   - Config: COSMICSEC_DB_READ_URL env var

2. Add query optimization:
   - Add EXPLAIN ANALYZE logging for queries > 100ms
   - Add composite indexes for common query patterns
   - Findings: INDEX on (scan_id, severity, created_at)
   - Audit logs: INDEX on (user_id, created_at)

3. Add table partitioning:
   - findings: PARTITION BY RANGE (created_at) — monthly partitions
   - audit_logs: PARTITION BY RANGE (created_at) — monthly partitions

4. Add materialized views:
   - dashboard_stats: pre-computed scan counts, finding counts, severity distribution
   - REFRESH MATERIALIZED VIEW CONCURRENTLY every 5 minutes via Celery beat
```

---

### S.3 — Observability Enhancement

**AI Agent Prompt**:
```
1. Distributed tracing end-to-end:
   - Frontend: Add trace context to all API calls (traceparent header)
   - API Gateway: Propagate trace to all service calls
   - Each service: Add spans for DB queries, external calls, AI inference

2. Sentry integration:
   - Backend: sentry_sdk.init() in each service
   - Frontend: Sentry.init() with React error boundary integration
   - Send: errors, performance transactions, user context

3. Custom Grafana dashboards (infrastructure/grafana/dashboards/):
   - Service Health: latency P50/P95/P99, error rate, throughput per service
   - Scan Pipeline: scans/hour, findings/hour, avg scan duration, queue depth
   - AI Performance: inference latency, token usage, model accuracy
   - Business: active users, scans this month, finding severity distribution
   - Infrastructure: CPU/memory per container, DB connections, Redis memory

4. Alerting rules (infrastructure/prometheus/alerts.yml):
   - Service down > 30 seconds → PagerDuty
   - Error rate > 5% → Slack
   - P99 latency > 2 seconds → Slack
   - Disk usage > 80% → Email
   - DB connection pool exhausted → PagerDuty
```

---

## Phase T — Go Event Broker & Real-Time Backbone

> 🎯 **Goal**: Build a Go-based event broker for asynchronous, event-driven communication between services. Replace synchronous inter-service HTTP calls with NATS JetStream. This makes the system more resilient, faster, and decoupled.
>
> 📋 **Prerequisites**: Phase S (observability to monitor event flow)
>
> 🌐 **Languages**: Go, Protocol Buffers

### T.1 — Event Broker Scaffold

**AI Agent Prompt**:
```
Create Go event broker:

broker/
├── go.mod                  # Module: github.com/mufthakherul/cosmicsec-broker
├── go.sum
├── cmd/
│   └── broker/main.go      # Entry point: NATS JetStream consumer/producer
├── internal/
│   ├── config/config.go    # Env-based config
│   ├── events/types.go     # Event type definitions (Go structs)
│   ├── handlers/
│   │   ├── scan.go         # Handle scan.started, scan.completed events
│   │   ├── finding.go      # Handle finding.created events
│   │   ├── alert.go        # Handle alert.triggered events
│   │   └── agent.go        # Handle agent.connected, agent.disconnected events
│   ├── publisher/pub.go    # Publish events to NATS subjects
│   ├── subscriber/sub.go   # Subscribe to NATS subjects with durable consumers
│   └── metrics/prom.go     # Prometheus metrics: events_published, events_consumed, errors
├── Dockerfile               # Multi-stage: golang:1.24-alpine → alpine:3.21
└── tests/
    └── broker_test.go       # Integration tests with embedded NATS

Event types:
- scan.started: { scan_id, target, user_id, tools, timestamp }
- scan.completed: { scan_id, findings_count, duration, timestamp }
- finding.created: { finding_id, scan_id, severity, title, timestamp }
- alert.triggered: { alert_id, finding_id, severity, timestamp }
- agent.connected: { agent_id, tools, ip, timestamp }
- agent.disconnected: { agent_id, reason, timestamp }

All events serialized as Protocol Buffers for efficiency.
```

---

### T.2 — Service Integration

**AI Agent Prompt**:
```
1. Add NATS JetStream to docker-compose.yml:
   nats:
     image: nats:2.10-alpine
     command: "--jetstream --store_dir /data"
     ports: ["4222:4222", "8222:8222"]

2. Python services publish events:
   - pip install nats-py
   - Create services/common/events.py:
     async def publish(subject: str, data: dict)
     async def subscribe(subject: str, handler: Callable)
   - Scan service: publish scan.started, scan.completed, finding.created
   - Auth service: publish user.login, user.registered

3. Go broker consumes events:
   - On finding.created: fan out to notification service, AI service, dashboard WebSocket
   - On scan.completed: trigger report generation
   - On alert.triggered: dispatch to integration service (Slack, PagerDuty)

4. Add dead letter queue:
   - Failed events go to $JS.DLQ.{subject}
   - Retry 3 times with exponential backoff
   - Alert if DLQ size > 100

Fallback: If NATS unavailable, fall back to direct HTTP calls between services.
Each service checks NATS health on startup and uses appropriate transport.
```

**Fallback Strategy**: ✅ **Direct HTTP calls as fallback**. Services detect NATS availability and choose transport. Pattern: try NATS → fall back to HTTP → log warning. No functionality lost, just reduced decoupling.

---

## Phase U — Mobile, PWA & Cross-Platform Clients

> 🎯 **Goal**: Make CosmicSec work as a Progressive Web App with offline support, push notifications, and mobile-optimized experience. Optionally add React Native mobile app.
>
> 📋 **Prerequisites**: Phase M (frontend complete), Phase S (API optimized)
>
> 🌐 **Languages**: TypeScript, HTML, CSS

### U.1 — Progressive Web App

**AI Agent Prompt**:
```
1. Create frontend/public/service-worker.js:
   - Cache static assets (JS, CSS, images) on install
   - Network-first strategy for API calls
   - Offline fallback page for network errors
   - Background sync for failed scan submissions

2. Update frontend/public/manifest.json:
   - Add all icon sizes (72, 96, 128, 144, 152, 192, 384, 512)
   - Set start_url, display: standalone, theme_color, background_color
   - Add shortcuts: "New Scan", "Dashboard", "Recon"

3. Add push notifications:
   - Backend: POST /api/notifications/push/subscribe (save push subscription)
   - Backend: Send push for critical findings, scan completion
   - Frontend: Request notification permission, register push subscription
   - Service worker: Handle push event, show notification

4. Add install prompt:
   - Detect beforeinstallprompt event
   - Show custom install banner
   - Track install analytics

Fallback: PWA features are progressive enhancements.
Without service worker: app works normally (just no offline/push).
```

---

### U.2 — Mobile-Optimized Dashboard

**AI Agent Prompt**:
```
1. Add mobile-specific layouts for key pages:
   - Dashboard: stack cards vertically, swipeable stat carousel
   - Scan page: simplified tool selection, large touch targets
   - Timeline: swipeable event cards

2. Add touch gestures:
   - Swipe left on finding card → quick actions (assign, dismiss, flag)
   - Pull down to refresh on list pages
   - Pinch-to-zoom on network topology diagrams

3. Add bottom navigation bar (mobile only):
   - Dashboard, Scans, Recon, AI, Profile
   - Replace sidebar on mobile with bottom nav
   - Active indicator animation

4. Performance for mobile:
   - Reduce images to WebP format
   - Lazy load below-fold content
   - Preconnect to API domain
   - Add loading skeletons for every page
```

---

## Phase V — Developer Experience, Branding & Polish

> 🎯 **Goal**: Make CosmicSec a joy to develop on and a premium-feeling product. Add developer documentation, component library, animation polish, and branding refinements.
>
> 📋 **Prerequisites**: All previous phases substantially complete
>
> 🌐 **Languages**: TypeScript, Markdown, YAML

### V.1 — Component Library (Storybook)

**AI Agent Prompt**:
```
1. Add Storybook to frontend:
   npx storybook@latest init
2. Create stories for ALL components:
   - Button.stories.tsx (variants: primary, secondary, danger, ghost)
   - Toast.stories.tsx (all severity levels)
   - Pagination.stories.tsx (various page counts)
   - FormInput.stories.tsx (states: empty, filled, error, disabled)
   - ScanCard.stories.tsx (states: running, completed, failed)
3. Add design tokens documentation page
4. Deploy Storybook to GitHub Pages: /storybook/
```

---

### V.2 — Animation & Micro-Interactions

**AI Agent Prompt**:
```
Add polished animations throughout the frontend:

1. Page transitions:
   - Fade-in on route change (Framer Motion or CSS transitions)
   - Slide-up for modal dialogs

2. Loading states:
   - Skeleton screens with shimmer effect (Tailwind animate-pulse)
   - Progress bar at top of page during navigation (NProgress style)

3. Data updates:
   - Findings count badge bounce animation on new finding
   - Security score gauge smooth animation on load
   - Timeline events slide in from left

4. Interactive feedback:
   - Button click ripple effect
   - Form input focus glow
   - Success checkmark animation on form submit
   - Error shake animation on validation failure

5. Dashboard:
   - Stats counter animate from 0 to value on first load
   - Chart bars grow animation
   - Activity feed items fade-in staggered

Use CSS animations (Tailwind) where possible. Add framer-motion only for complex sequences.
```

---

### V.3 — Developer Documentation

**AI Agent Prompt**:
```
Create comprehensive developer docs:

1. docs/adr/ — Architecture Decision Records:
   - ADR-001: Why FastAPI (vs Flask, Django)
   - ADR-002: Why PostgreSQL (vs MySQL, CockroachDB)
   - ADR-003: Why Rust for ingest (vs Go, C++)
   - ADR-004: Why NATS (vs Kafka, RabbitMQ for events)
   - ADR-005: Why Zustand (vs Redux, Jotai)

2. docs/runbooks/:
   - runbooks/deploy-production.md
   - runbooks/incident-response.md
   - runbooks/database-migration.md
   - runbooks/add-new-service.md
   - runbooks/add-new-scanner-plugin.md

3. docs/api/:
   - Auto-generated from FastAPI OpenAPI spec
   - Host at /api/docs (already configured)
   - Add examples for every endpoint

4. CONTRIBUTING.md update:
   - Development setup guide (Docker, local, hybrid)
   - Code style guide (ruff config explained)
   - PR template with checklist
   - Testing guide (how to run, what to test)

5. README.md update:
   - Quick start (3 commands to running)
   - Architecture diagram (Mermaid)
   - Feature matrix with screenshots
   - Benchmark numbers
```

---

### V.4 — Development Seed Data

**AI Agent Prompt**:
```
Create scripts/seed-dev-data.py:
1. Creates test organization "CosmicSec Demo Org"
2. Creates 5 test users with different roles (admin, analyst, viewer, pentester, auditor)
3. Creates 10 sample scans with realistic findings (varying severities)
4. Creates 50+ findings with realistic CVE data
5. Creates sample recon data (DNS, Shodan, VirusTotal mock)
6. Creates sample AI analysis results
7. Creates sample reports (JSON, HTML)
8. Creates 3 sample agents with tool registrations
9. Prints all credentials to stdout

Run with: python scripts/seed-dev-data.py
Requires: DATABASE_URL env var
```

---

## Cross-Cutting Modernization Checklist

These improvements span multiple phases and should be applied continuously:

### Security Continuous Improvement
- [ ] Add Content Security Policy (CSP) headers via Traefik
- [ ] Add Subresource Integrity (SRI) for CDN assets
- [ ] Add secrets scanning (TruffleHog) in pre-commit hooks
- [ ] Add SAST in CI (Bandit for Python, ESLint security plugin for TypeScript)
- [ ] Add container image scanning (Trivy) in build workflow
- [ ] Add SBOM generation (Syft/CycloneDX) for supply chain security
- [ ] Add WebSocket message validation (JSON Schema) in all WS endpoints
- [ ] Add request payload size limits (1MB default, 10MB for file uploads)
- [ ] Add SQL injection testing in CI (sqlmap against test DB)
- [ ] Add HTTP security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### Developer Experience
- [ ] Add docker-compose.dev.yml with hot-reload for all services
- [ ] Add VS Code workspace settings (`.vscode/settings.json`, extensions.json)
- [ ] Add pre-commit hooks: ruff, mypy (strict), prettier, eslint
- [ ] Add Makefile targets: `make dev-frontend`, `make dev-backend`, `make seed`, `make test-all`
- [ ] Add GitHub Codespaces devcontainer configuration
- [ ] Add development seed data script

### Code Quality
- [ ] Add mypy strict mode for all services
- [ ] Add eslint with @typescript-eslint for frontend
- [ ] Add prettier for consistent formatting
- [ ] Add import sorting (isort via ruff)
- [ ] Add dead code detection (vulture for Python)
- [ ] Add complexity analysis (radon for Python)
- [ ] Add bundle analysis (vite-plugin-visualizer)

### CI/CD Pipeline
- [ ] Add GitHub Actions matrix for Python 3.11/3.12/3.13
- [ ] Add release automation (semantic-release or changesets)
- [ ] Add staging deployment (preview per PR)
- [ ] Add database migration check in CI (alembic check)
- [ ] Add performance benchmarks in CI (fail if regression > 10%)
- [ ] Add visual regression testing (Playwright screenshot comparison)

### Accessibility
- [ ] Add `<main>`, `<header>`, `<footer>`, `<aside>` semantic HTML landmarks
- [ ] Add `aria-live="polite"` for dynamic content updates
- [ ] Add `aria-invalid` and `aria-describedby` for form validation
- [ ] Add focus management for modal dialogs and route transitions
- [ ] Add keyboard shortcuts documentation panel (? key)
- [ ] Run axe-core audit in CI and fail on violations
- [ ] Add skip-to-content link (already exists — verify works)
- [ ] Add high contrast mode toggle
- [ ] Add reduced motion mode (prefers-reduced-motion media query)

---

## Implementation Priority Matrix

```
                    IMPACT
                    HIGH ─────────────────────────────────────────┐
                    │                                             │
                    │  K (Security)     │  R (Enterprise)         │
                    │  L (Persistence)  │  T (Go Event Broker)    │
                    │  M (Frontend)     │                         │
                    │  N (Dep Upgrade)  │                         │
                    │                                             │
                    MEDIUM ───────────────────────────────────────│
                    │                                             │
                    │  O (Tests)        │  S (Scale)              │
                    │  Q (AI/ML)        │  U (Mobile/PWA)         │
                    │  P (Rust Ingest)  │                         │
                    │                                             │
                    LOW ──────────────────────────────────────────│
                    │                                             │
                    │  V (DX/Polish)    │  Cross-cutting          │
                    │                                             │
                    └──────────────────┴──────────────────────────┘
                    LOW ────── URGENCY ────── HIGH
```

### Recommended Execution Order

| Order | Phase | Est. Duration | Team Size | Dependencies |
|-------|-------|--------------|-----------|--------------|
| 1st 🔴 | **Phase K** — Critical Security | 1–2 weeks | 1–2 devs | None |
| 2nd 🔴 | **Phase L** — Data Persistence | 1–2 weeks | 1–2 devs | Phase K |
| 3rd 🟠 | **Phase M** — Frontend Completion | 2–3 weeks | 1–2 devs | Phases K, L |
| 4th 🟠 | **Phase N** — Dependency Upgrades | 1–2 weeks | 1 dev | Phase K |
| 5th 🟠 | **Phase O** — Test Coverage | 2–3 weeks | 1–2 devs | Phases K, L, M |
| 6th 🟡 | **Phase P** — Rust Ingest Engine | 2–3 weeks | 1 Rust dev | Phase L |
| 7th 🟡 | **Phase Q** — AI/ML Pipeline | 2–3 weeks | 1–2 devs | Phases L, N |
| 8th 🟡 | **Phase R** — Enterprise Features | 3–4 weeks | 2–3 devs | Phases K–O |
| 9th 🟢 | **Phase S** — Performance & Scale | 2–3 weeks | 1–2 devs | Phase R |
| 10th 🟢 | **Phase T** — Go Event Broker | 2–3 weeks | 1 Go dev | Phase S |
| 11th 🟢 | **Phase U** — Mobile & PWA | 2–3 weeks | 1 frontend dev | Phases M, S |
| 12th 🟢 | **Phase V** — DX & Polish | 2–3 weeks | 1–2 devs | All previous |

**Total estimated effort**: 22–34 weeks for a team of 2–3 developers

---

## Target Architecture (Post-Phase V)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                    │
│                                                                          │
│  [SSR Landing]    [SPA Dashboard]    [CLI Agent]    [Mobile PWA]        │
│  (Static Pages)   React 19 + Vite    Python/Rust    React + SW          │
│  STATIC mode      DYNAMIC mode       LOCAL mode     HYBRID mode         │
└──────┬──────────────────┬──────────────────┬──────────────┬─────────────┘
       │                  │                  │              │
       ▼                  ▼                  ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EDGE & GATEWAY LAYER                                │
│                                                                          │
│  Traefik v3.4 (TLS, WAF, GeoIP, rate limit)                            │
│  → API Gateway (FastAPI + GraphQL + WebSocket + gRPC)                   │
│  → Auth Middleware (JWT + API Key + SSO/SAML/OIDC)                      │
│  → HybridRouter (STATIC/DYNAMIC/LOCAL/DEMO/EMERGENCY modes)            │
│  → Circuit Breaker (Tenacity) + Request Tracing (OpenTelemetry)         │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────┐
│                      SERVICE MESH (Python FastAPI)                        │
│                                                                          │
│  Auth · Scan · AI · Recon · Report · Collab · Plugins · Integration     │
│  BugBounty · Phase5 · AgentRelay · Notification · Admin · Compliance    │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────┐
│                HIGH-PERFORMANCE LAYER (Rust + Go)                        │
│                                                                          │
│  ┌────────────────────────┐  ┌──────────────────────────┐               │
│  │  Rust Ingest Engine    │  │  Go Event Broker          │               │
│  │  50K findings/sec      │  │  NATS JetStream           │               │
│  │  gRPC + Redis Streams  │  │  Event fanout + DLQ       │               │
│  └────────────────────────┘  └──────────────────────────┘               │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────┐
│                       DATA & STORAGE LAYER                               │
│                                                                          │
│  PostgreSQL 17  Redis 7    MongoDB 8   Elasticsearch 8   ChromaDB       │
│  (core data,   (cache,    (OSINT,     (full-text,       (AI vectors,   │
│   tenants,      sessions,  raw scan    log indexing)      RAG KB)       │
│   audit logs)   pub/sub)   output)                                      │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────┐
│                   OBSERVABILITY & INFRA LAYER                            │
│                                                                          │
│  Prometheus 2.x + Grafana 11   Jaeger (OTLP)   Loki 3.x   Sentry     │
│  AlertManager + PagerDuty      OpenTelemetry    NATS 2.10   Vault      │
│  Consul (service discovery)    Trivy (security) SBOM (CycloneDX)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## New File & Directory Map

```
CosmicSec/                               (modified or new files marked)
├── DEPENDENCY_AUDIT.md                   [NEW — Phase N] Version comparison report
├── ROADMAP_NEXT.md                       [THIS FILE — rewritten v2]
│
├── ingest/                               [NEW — Phase P] Rust ingest engine
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── src/ (main.rs, parsers/, db.rs, stream.rs, metrics.rs)
│   ├── proto/ingest.proto
│   └── tests/
│
├── broker/                               [NEW — Phase T] Go event broker
│   ├── go.mod
│   ├── cmd/broker/main.go
│   ├── internal/ (events/, handlers/, publisher/, subscriber/, metrics/)
│   ├── Dockerfile
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── api/                          [NEW — Phase M] Centralized API client
│   │   │   ├── client.ts
│   │   │   └── endpoints.ts
│   │   ├── components/
│   │   │   ├── forms/                    [NEW — Phase K] Reusable form components
│   │   │   ├── MobileNav.tsx             [NEW — Phase M] Hamburger menu
│   │   │   ├── Pagination.tsx            [NEW — Phase M]
│   │   │   └── PageSkeleton.tsx          [NEW — Phase M]
│   │   ├── hooks/
│   │   │   ├── useTokenRefresh.ts        [NEW — Phase M]
│   │   │   └── useSearch.ts              [NEW — Phase M]
│   │   └── pages/
│   │       ├── LoginPage.tsx             [REWRITE — Phase K]
│   │       ├── RegisterPage.tsx          [REWRITE — Phase K]
│   │       ├── ForgotPasswordPage.tsx    [REWRITE — Phase K]
│   │       ├── TwoFactorPage.tsx         [REWRITE — Phase K]
│   │       └── Phase5OperationsPage.tsx  [REWRITE — Phase M]
│   ├── __tests__/                        [NEW — Phase O] Comprehensive tests
│   ├── public/service-worker.js          [NEW — Phase U] PWA
│   └── .storybook/                       [NEW — Phase V] Component library
│
├── services/
│   ├── auth_service/
│   │   ├── encryption.py                 [NEW — Phase K]
│   │   └── rate_limiter.py               [NEW — Phase K]
│   ├── common/
│   │   ├── jwt_utils.py                  [NEW — Phase K]
│   │   ├── session_store.py              [NEW — Phase L]
│   │   └── events.py                     [NEW — Phase T]
│   ├── compliance_service/               [NEW — Phase R] New microservice
│   └── report_service/
│       └── templates/report.html.j2      [NEW — Phase K]
│
├── scripts/
│   ├── init-admin.py                     [NEW — Phase K]
│   └── seed-dev-data.py                  [NEW — Phase V]
│
├── docker-compose.yml                    [MODIFY — Phases K, N]
├── docker-compose.dev.yml                [NEW — Phase K]
├── infrastructure/redis.conf             [NEW — Phase K]
│
├── docs/
│   ├── adr/                              [NEW — Phase V]
│   └── runbooks/                         [NEW — Phase V]
│
├── proto/                                [NEW — Phase P]
│   └── ingest.proto
│
└── .vscode/                              [NEW — Phase V]
    ├── settings.json
    └── extensions.json
```

---

## Summary — Before vs. After

| Metric | Current (Phase J) | After Phase V |
|--------|-------------------|---------------|
| **Production readiness** | ⚠️ MVP / demo-only | ✅ Enterprise production-grade |
| **Security posture** | 🔴 10 critical vulns | 🟢 Zero known criticals + continuous scanning |
| **Auth flow** | ❌ Non-functional stubs | ✅ Full OAuth2/OIDC/SAML/WebAuthn + 2FA |
| **Data persistence** | ⚠️ In-memory (6 services) | ✅ PostgreSQL + Redis + fallback caching |
| **Backend test coverage** | ~60–70% | 90%+ with mutation testing |
| **Frontend test coverage** | < 5% (2 tests) | 85%+ unit + full E2E suite |
| **Initial JS bundle** | 419KB single file | < 80KB initial + lazy-loaded routes |
| **Languages** | Python + TypeScript | Python + Rust + Go + TypeScript + Protobuf |
| **Scan ingest rate** | ~500 findings/sec (Python) | 50,000+ findings/sec (Rust) |
| **Multi-tenancy** | ❌ Single-tenant | ✅ Organization-scoped with white-label |
| **Compliance** | ❌ Manual | ✅ SOC2/PCI-DSS/HIPAA/ISO27001 automated |
| **Observability** | Basic Prometheus | Full OTel + Sentry + custom Grafana dashboards |
| **Mobile experience** | ⚠️ Broken nav, no hamburger | ✅ PWA + push notifications + bottom nav |
| **Developer experience** | Basic Makefile | Storybook + seed data + runbooks + ADRs |
| **AI capabilities** | ⚠️ 10+ stubs | ✅ RAG + local LLM + multi-agent workflow |
| **Event architecture** | Synchronous HTTP | ✅ NATS JetStream + event sourcing |
| **Deprecated packages** | 3 (aioredis, jaeger, fuzzywuzzy) | 0 (all replaced) |
| **Version currency** | 42+ packages behind | All at latest compatible versions |

---

*This roadmap was generated from deep analysis of the entire CosmicSec codebase (code, build, live Playwright testing, dependency audit) and is designed to be executed phase-by-phase by both human developers and AI coding agents.*
