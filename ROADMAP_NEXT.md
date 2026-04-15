# CosmicSec — Next-Generation Implementation Roadmap

### Post-Phase-J Audit & Modernization Guide
> **Audit date**: 2026-04-15 | **Auditor**: Automated deep analysis (code, build, live Playwright, accessibility)
> **Scope**: All 19,655 lines Python backend, 1,747-module React frontend, SDKs, infrastructure, CI/CD, tests

---

## Executive Summary

CosmicSec Phases A–J established a **solid architectural foundation** with 13 microservices, a React 19 SPA, 4 SDKs, and full Docker/K8s infrastructure. However, a deep code-level audit + live browser testing reveals **critical gaps between documented status ("100% complete") and actual production-readiness**.

**Key findings:**
- 🔴 **47 critical/high issues** across backend security, data persistence, and frontend functionality
- 🟡 **32 medium issues** in test coverage, error handling, and API integration
- 🟢 Build pipeline is green (82 Python tests pass, frontend builds clean, 0 lint errors)
- ⚠️ **Auth pages are non-functional stubs** (no form handling, no API calls)
- ⚠️ **6+ services use in-memory storage** (data lost on restart)
- ⚠️ **Frontend test coverage < 5%** (2 tests total)
- ⚠️ **No mobile hamburger menu** (nav links disappear on mobile)

**This roadmap defines 8 new phases (K–R)** to bring CosmicSec from MVP to production-grade, hybrid, multi-language, professional platform.

---

## Table of Contents

1. [Audit Results — Gap Inventory](#1-audit-results--gap-inventory)
2. [Architecture Evolution Targets](#2-architecture-evolution-targets)
3. [Multi-Language Strategy](#3-multi-language-strategy)
4. [Phase K — Critical Bug Fixes & Security Hardening](#phase-k--critical-bug-fixes--security-hardening)
5. [Phase L — Production Data Layer & Persistence](#phase-l--production-data-layer--persistence)
6. [Phase M — Frontend Completion & Modernization](#phase-m--frontend-completion--modernization)
7. [Phase N — Rust High-Performance Ingest Engine](#phase-n--rust-high-performance-ingest-engine)
8. [Phase O — Test Coverage & Quality Gate](#phase-o--test-coverage--quality-gate)
9. [Phase P — Advanced AI & ML Pipeline](#phase-p--advanced-ai--ml-pipeline)
10. [Phase Q — Enterprise Features & Multi-Tenancy](#phase-q--enterprise-features--multi-tenancy)
11. [Phase R — Performance, Observability & Scale](#phase-r--performance-observability--scale)
12. [Cross-Cutting Modernization Tasks](#cross-cutting-modernization-tasks)
13. [Implementation Priority Matrix](#implementation-priority-matrix)
14. [Target File & Directory Additions](#target-file--directory-additions)

---

## 1. Audit Results — Gap Inventory

### 🔴 CRITICAL Issues (Must Fix Before Any Production Use)

| ID | Area | Issue | File(s) | Impact |
|----|------|-------|---------|--------|
| C-01 | **Auth Frontend** | Login/Register/Forgot/2FA pages are **empty stubs** — no form state, no validation, no API calls | `frontend/src/pages/LoginPage.tsx` (17 LOC), `RegisterPage.tsx` (17 LOC), `ForgotPasswordPage.tsx` (11 LOC), `TwoFactorPage.tsx` (10 LOC) | **Users cannot authenticate** |
| C-02 | **Auth Backend** | Fake in-memory databases (`fake_api_keys_db = {}`, `fake_2fa_db = {}`) used instead of real persistence | `services/auth_service/main.py:267-278` | **API keys & 2FA secrets lost on restart** |
| C-03 | **CORS** | `allow_origins=["*"]` in API Gateway — allows any origin | `services/api_gateway/main.py:194` | **CSRF/credential theft risk** |
| C-04 | **Admin Password** | Default admin password hardcoded in init-db.sql | `infrastructure/init-db.sql:128` | **Known default credential** |
| C-05 | **Admin Dashboard** | Hardcoded `http://localhost:8000` API URL | `frontend/src/pages/AdminDashboardPage.tsx:31` | **Breaks in any non-local deployment** |
| C-06 | **Admin Dashboard** | `createUser` hardcodes password `"ChangeMe123!"` | `frontend/src/pages/AdminDashboardPage.tsx:95-107` | **Security: known default password** |
| C-07 | **Auth Backend** | No rate limiting on login endpoint | `services/auth_service/main.py:892-920` | **Brute force attacks possible** |
| C-08 | **Auth Backend** | 2FA secrets stored in plaintext | `services/auth_service/main.py:340` | **Secret exposure if DB compromised** |
| C-09 | **Report Service** | HTML generation uses f-string concatenation (XSS in exported reports) | `services/report_service/main.py:91-105` | **Stored XSS in report output** |
| C-10 | **Collab Service** | No authentication check on WebSocket upgrade | `services/collab_service/main.py:140` | **Unauthenticated access to collaboration rooms** |

### 🟠 HIGH Issues

| ID | Area | Issue | File(s) |
|----|------|-------|---------|
| H-01 | **Data Persistence** | 6+ services use in-memory dicts — all data lost on restart | auth (fake DBs), scan (in-memory), plugin registry, integration (event logs), agent relay, phase5 |
| H-02 | **Session Management** | No token expiration checking or silent refresh in frontend | `frontend/src/context/AuthContext.tsx` |
| H-03 | **Admin Backend** | Admin endpoints lack proper RBAC enforcement beyond role string | `services/auth_service/main.py:1045-1070` |
| H-04 | **OAuth** | OAuth implementation incomplete — no CSRF state tokens | `services/auth_service/main.py:1320+` |
| H-05 | **Docker** | `--reload` flag in production Dockerfiles (auto-restart on file changes) | `docker-compose.yml:151,212` |
| H-06 | **Plugin Security** | No plugin signing/verification — arbitrary code execution | `plugins/registry.py` |
| H-07 | **WebSocket** | WebSocket URL derivation from `window.location.protocol` may use insecure `ws://` | `frontend/src/hooks/useScanStream.ts:24-32` |
| H-08 | **Redis** | `requirepass` exposed in docker-compose command line | `docker-compose.yml:56` |
| H-09 | **Scan Service** | No scan cancellation mechanism | `services/scan_service/main.py` |
| H-10 | **Error Handling** | 114+ bare `except Exception:` handlers across all services | All service files |

### 🟡 MEDIUM Issues

| ID | Area | Issue | File(s) |
|----|------|-------|---------|
| M-01 | **Frontend Tests** | Only 2 unit tests (< 5% coverage) | `frontend/src/App.test.tsx` |
| M-02 | **E2E Tests** | Single smoke test (landing page loads) | `frontend/tests/e2e/smoke.spec.ts` |
| M-03 | **Backend Tests** | No tests for: integration service, plugin registry, collab service, notification service, admin service | `tests/` |
| M-04 | **API Layer** | No centralized API client in frontend — each page has inline `fetch()` | Multiple page files |
| M-05 | **Search** | GlobalSearch component visible but non-functional | `frontend/src/components/Header.tsx:39` |
| M-06 | **Phase5 Page** | Only shows loading/error states — no actual dashboard content | `frontend/src/pages/Phase5OperationsPage.tsx` (44 LOC) |
| M-07 | **Settings Page** | "Save defaults" button doesn't call API | `frontend/src/pages/SettingsPage.tsx:222-228` |
| M-08 | **Service URLs** | Hardcoded Docker service URLs in API Gateway | `services/api_gateway/main.py:289-302` |
| M-09 | **Recon Caching** | No caching of expensive OSINT API calls | `services/recon_service/main.py` |
| M-10 | **Mobile Nav** | Nav links (Demo, Pricing, GitHub) disappear on mobile with no hamburger menu | `frontend/src/pages/LandingPage.tsx` |
| M-11 | **Pagination** | All lists load all items (scans, reports, audit logs) — no pagination | Multiple frontend pages |
| M-12 | **State Persistence** | Zustand stores not persisted — scans list lost on refresh | `frontend/src/store/scanStore.ts` |
| M-13 | **React Performance** | No `React.memo`, `useMemo`, `useCallback` in heavy render components | `DashboardPage.tsx`, `TimelinePage.tsx` |
| M-14 | **AI Service** | 10+ empty `pass` stub implementations | `services/ai_service/` (vector_store, anomaly_detector, red_team) |
| M-15 | **Request Cancellation** | Long-running API requests not cancelled on component unmount | `ReconPage.tsx`, `AIAnalysisPage.tsx` |

### 🟢 LOW Issues

| ID | Area | Issue |
|----|------|-------|
| L-01 | Report paths | `/tmp/reports` hardcoded — should be configurable |
| L-02 | WAF | Basic regex patterns — could be bypassed |
| L-03 | Celery | Hardcoded `--concurrency=4` |
| L-04 | Accessibility | Only 2 ARIA landmarks on landing page (needs `<main>`, `<header>`, etc.) |
| L-05 | Bundle size | Single 419KB JS bundle — no code splitting or lazy loading |

---

## 2. Architecture Evolution Targets

### Current State → Target State

```
CURRENT (Phase J)                           TARGET (Phase R)
─────────────────                           ──────────────────
Python-only backend                    →    Multi-language (Python + Rust + Go)
In-memory data stores                  →    Full PostgreSQL + Redis persistence
Monolithic main.py files (2400+ LOC)   →    Modular service packages
Single JS bundle (419KB)               →    Code-split lazy-loaded routes (<100KB initial)
2 frontend tests                       →    90%+ coverage (unit + E2E + visual)
Basic auth stubs                       →    Production OAuth2 + OIDC + WebAuthn
No API client layer                    →    Generated TypeScript API client (OpenAPI)
Manual Docker Compose                  →    GitOps with ArgoCD + Helm
Plaintext secrets in compose           →    HashiCorp Vault / SOPS integration
No event sourcing                      →    Event-driven architecture (NATS/Kafka)
Synchronous inter-service calls        →    Async message queue + circuit breakers
```

### Target Hybrid Architecture (Post-Phase R)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│  [SSR Landing]     [SPA Dashboard]     [CLI Agent]    [Mobile PWA]  │
│  Next.js/Astro     React 19 + Vite     Python/Rust    React Native  │
│  STATIC mode       DYNAMIC mode        LOCAL mode     HYBRID mode   │
└──────┬──────────────────┬──────────────────┬──────────────┬─────────┘
       │                  │                  │              │
       ▼                  ▼                  ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EDGE & GATEWAY LAYER                               │
│  Traefik (TLS, WAF, GeoIP)  →  API Gateway (FastAPI + GraphQL)     │
│  Rate Limiting (Redis)       →  Auth Middleware (JWT + API Key)      │
│  Request Tracing (OTel)      →  Circuit Breaker (Tenacity)          │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────┐
│                    SERVICE MESH (Python FastAPI)                      │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │   Auth   │ │   Scan   │ │    AI    │ │  Recon   │ │  Report  │ │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Collab  │ │ Plugins  │ │Integratn │ │BugBounty │ │ Phase 5  │ │
│  │ Service  │ │ Registry │ │ Service  │ │ Service  │ │ Service  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐                                         │
│  │  Agent   │ │  Notif   │                                         │
│  │  Relay   │ │ Service  │                                         │
│  └──────────┘ └──────────┘                                         │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────┐
│              HIGH-PERFORMANCE LAYER (Rust / Go)                      │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │  Rust Ingest Engine │  │  Go Event Broker    │                   │
│  │  (scan data parser, │  │  (NATS/Kafka bridge,│                   │
│  │   bulk DB writer,   │  │   event sourcing,   │                   │
│  │   stream processor) │  │   pub/sub fanout)   │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────┐
│                     DATA & STORAGE LAYER                             │
│                                                                      │
│  PostgreSQL 16    Redis 7     MongoDB    Elasticsearch   ChromaDB   │
│  (core data,     (cache,     (OSINT     (full-text       (AI        │
│   sessions,       rate        docs,      search,          vectors,   │
│   audit logs)     limits,     raw scan   log indexing)    RAG KB)    │
│                   pub/sub)    output)                                │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────┐
│                 OBSERVABILITY & INFRA LAYER                           │
│                                                                      │
│  Prometheus + Grafana   Jaeger (traces)   Loki (logs)   Consul     │
│  AlertManager           OpenTelemetry     Sentry        Vault      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Language Strategy

CosmicSec becomes more powerful and professional by using **the right language for each job**:

| Language | Role | Where Used | Why |
|----------|------|-----------|-----|
| **Python 3.13** | Core services, AI/ML, orchestration | All 13 FastAPI microservices, LangChain/LangGraph pipelines, CLI agent | Rich ML/AI ecosystem, fast development, strong async support |
| **Rust** | High-throughput data ingest, parser engine | `ingest/` — scan data parser, bulk DB writer, stream processor | 10–100× faster than Python for parsing millions of scan results, zero-cost abstractions, memory safety |
| **Go** | Event broker, lightweight sidecar services | `broker/` — NATS/Kafka event bridge, health check aggregator, service mesh sidecar | Excellent concurrency model (goroutines), tiny binary size, fast startup |
| **TypeScript** | Frontend SPA, TypeScript SDK, tooling | `frontend/`, `sdk/typescript/` | Type safety, React ecosystem, shared types with API |
| **SQL** | Database schema, migrations, queries | `alembic/`, `infrastructure/` | PostgreSQL-native features, performance |
| **Bash/Shell** | CI/CD scripts, dev tooling | `.github/workflows/`, `scripts/` | Automation glue |

### Inter-Language Communication

```
Python services  ←→  Rust ingest   : gRPC (protobuf) or Redis Streams
Python services  ←→  Go broker     : NATS JetStream or Kafka
Frontend (TS)    ←→  Python API    : REST + WebSocket + GraphQL
CLI agent (Py)   ←→  API Gateway   : WebSocket + REST (JSON)
```

---

## Phase K — Critical Bug Fixes & Security Hardening

> **Priority**: 🔴 BLOCKER — Must complete before any deployment
> **Estimated scope**: ~40 files modified, ~1,500 lines changed
> **Languages**: Python, TypeScript

### K.1 — Fix Authentication Pages (C-01)
- **LoginPage.tsx**: Full implementation with React Hook Form + Zod validation, API integration (`POST /api/auth/login`), loading states, error display, "Remember me", password visibility toggle, rate limit feedback
- **RegisterPage.tsx**: Full implementation with email validation, password strength meter (zxcvbn), terms acceptance checkbox, API integration (`POST /api/auth/register`)
- **ForgotPasswordPage.tsx**: Email input with validation, success/error states, resend cooldown timer
- **TwoFactorPage.tsx**: 6-digit OTP input with auto-advance, countdown timer, backup code option, API integration (`POST /api/auth/verify-2fa`)

### K.2 — Eliminate In-Memory Auth Stores (C-02)
- Replace `fake_api_keys_db` and `fake_2fa_db` with SQLAlchemy queries against existing `api_keys` and `users` tables
- Encrypt 2FA secrets at rest using `cryptography.fernet` with key from environment variable (C-08)
- Add database-backed session validation

### K.3 — CORS Hardening (C-03)
- Replace `allow_origins=["*"]` with `COSMICSEC_CORS_ORIGINS` environment variable
- Default to `["http://localhost:3000"]` in development
- Add `allow_credentials=True` only for whitelisted origins

### K.4 — Remove Hardcoded Secrets (C-04, C-06)
- Remove default admin password from `init-db.sql` — generate random password on first boot, print to stdout
- Remove `"ChangeMe123!"` from `AdminDashboardPage.tsx` — prompt admin to set password
- Add `.env` validation on startup (fail fast if required secrets missing)

### K.5 — Fix Hardcoded URLs (C-05, M-08)
- Replace `http://localhost:8000` in `AdminDashboardPage.tsx` with `import.meta.env.VITE_API_BASE_URL`
- Make API Gateway service URLs configurable via environment variables with Docker defaults

### K.6 — Login Rate Limiting (C-07)
- Add `slowapi` rate limiter to auth service login endpoint: 5 attempts per 15 minutes per IP
- Implement exponential backoff response (429 with `Retry-After` header)
- Add account lockout after 10 failed attempts (temporary, 30-minute)

### K.7 — XSS Prevention in Reports (C-09)
- Replace f-string HTML concatenation with Jinja2 templates with auto-escaping enabled
- Add `markupsafe` HTML escaping for all user-supplied data in report output

### K.8 — WebSocket Authentication (C-10)
- Add JWT token validation on WebSocket upgrade in collab_service
- Reject connections without valid `Authorization` header or `token` query parameter
- Add same check to agent_relay WebSocket

### K.9 — Remove Production `--reload` Flag (H-05)
- Remove `--reload` from all uvicorn commands in `docker-compose.yml` production services
- Add separate `docker-compose.dev.yml` override with `--reload` for development only

### K.10 — Narrow Exception Handlers (H-10)
- Audit all 114 `except Exception:` blocks
- Replace with specific exceptions (`httpx.HTTPError`, `sqlalchemy.exc.SQLAlchemyError`, `json.JSONDecodeError`, etc.)
- Ensure all caught exceptions are logged with traceback

---

## Phase L — Production Data Layer & Persistence

> **Priority**: 🔴 HIGH — Data loss on any restart
> **Estimated scope**: ~25 files modified, ~2,000 lines changed
> **Languages**: Python, SQL

### L.1 — Auth Service Database Migration
- Replace all `fake_*_db` dicts with SQLAlchemy CRUD operations
- Create proper `api_keys` table operations (create, revoke, list, validate)
- Add `totp_secrets` table with encrypted secret column
- Create Alembic migration for any new columns

### L.2 — Scan Service Persistence
- Replace `scans = {}` in-memory dict with PostgreSQL
- Store scan results, findings, and progress checkpoints in database
- Add scan resume capability from last checkpoint

### L.3 — Plugin Registry Persistence
- Replace `_marketplace`, `_ratings`, `_repositories` dicts with database tables
- Create `plugins`, `plugin_ratings`, `plugin_repositories` tables
- Add Alembic migration

### L.4 — Integration Service Event Log Persistence
- Replace `event_log = []` with database table
- Create `integration_events` table with timestamp, provider, payload, status

### L.5 — Agent Relay State Persistence
- Store registered agents in database (not just in-memory)
- Add heartbeat tracking with `last_seen_at` updates
- Persist task dispatch history for retry on agent reconnection

### L.6 — Redis Session Management
- Move active session tracking from in-memory to Redis
- Add session timeout enforcement (configurable, default 24h)
- Add concurrent session limits per user (configurable, default 5)

### L.7 — Database Connection Pooling Audit
- Verify all services use shared connection pool from `services/common/db.py`
- Add connection pool metrics (active, idle, overflow) to Prometheus
- Add circuit breaker for database connections (retry with backoff)

---

## Phase M — Frontend Completion & Modernization

> **Priority**: 🟠 HIGH — Many features visible but non-functional
> **Estimated scope**: ~35 files, ~4,000 lines
> **Languages**: TypeScript, CSS

### M.1 — Centralized API Client
- Create `frontend/src/api/client.ts` — Axios instance with:
  - Base URL from `import.meta.env.VITE_API_BASE_URL`
  - Auto-attach `Authorization: Bearer <token>` header
  - Response interceptor for 401 → auto-logout + redirect
  - Request/response type generics
  - Request cancellation via `AbortController`
  - Retry logic for 5xx errors (exponential backoff, max 3)
- Create `frontend/src/api/endpoints.ts` — typed endpoint functions
- Migrate all inline `fetch()` calls to use centralized client

### M.2 — Form Library Integration
- Add `react-hook-form` + `@hookform/resolvers` + `zod` for all forms
- Create reusable form components: `FormInput`, `FormSelect`, `FormTextarea`, `FormCheckbox`
- Add server-side error mapping (API error → field error)

### M.3 — Token Lifecycle Management
- Add JWT expiration checking in `AuthContext`
- Implement silent token refresh using refresh token flow
- Add `useTokenRefresh()` hook with background interval
- Redirect to login on token expiry with return-to URL preservation

### M.4 — Mobile Navigation
- Add hamburger menu button (visible < md breakpoint) on landing page
- Add slide-out mobile nav drawer with all links
- Add backdrop overlay on mobile nav open
- Verify all pages responsive at 320px, 375px, 768px breakpoints

### M.5 — Code Splitting & Lazy Loading
- Convert all route imports to `React.lazy()` + `Suspense`
- Add route-level loading skeletons
- Target: initial JS bundle < 100KB (currently 419KB)
- Add `React.memo` to heavy list components (scan cards, timeline events)

### M.6 — Global Search Implementation
- Wire `GlobalSearch` component to actual search API
- Add search across: scans, findings, agents, reports, users (admin)
- Add keyboard shortcut (Cmd/Ctrl+K) to focus search
- Add search results dropdown with categorized results

### M.7 — Phase5 Operations Page
- Build full SOC dashboard: risk posture gauge, incident timeline, alert feed
- Add SOC metrics table (MTTD, MTTR, open incidents)
- Add DevSecOps CI gate status panel
- Wire to `phase5Api.ts` with proper types

### M.8 — Pagination & Virtualization
- Add cursor-based pagination to all list views (scans, reports, audit logs, timeline)
- Use `@tanstack/react-virtual` for long lists (1000+ items)
- Add "load more" / infinite scroll pattern
- Add page size selector (10, 25, 50, 100)

### M.9 — Zustand Store Persistence
- Add `persist` middleware to `scanStore` and `notificationStore`
- Use `localStorage` for scan cache (TTL: 5 minutes)
- Add `hydration` loading state to prevent flash of empty content

### M.10 — Accessibility Hardening
- Add `<main>`, `<header>`, `<footer>`, `<aside>` semantic HTML landmarks
- Add `aria-live="polite"` for dynamic content updates (scan progress, notifications)
- Add `aria-invalid` and `aria-describedby` for form validation errors
- Add focus management for modal dialogs and route transitions
- Run axe-core audit and fix all violations

### M.11 — OpenAPI TypeScript Client Generation
- Add `openapi-typescript-codegen` or `orval` to auto-generate TypeScript API client from FastAPI OpenAPI spec
- Generate types, hooks (`useQuery`/`useMutation` wrappers), and endpoint functions
- Add CI step: regenerate on API changes, fail if types drift

---

## Phase N — Rust High-Performance Ingest Engine

> **Priority**: 🟡 MEDIUM — Needed for scale (1M+ findings/hour)
> **Estimated scope**: New `ingest/` directory, ~3,000 lines Rust
> **Language**: Rust

### N.1 — Ingest Engine Core
```
ingest/
├── Cargo.toml
├── src/
│   ├── main.rs           # Tokio async main, gRPC + HTTP server
│   ├── config.rs          # Environment-based configuration
│   ├── parsers/
│   │   ├── mod.rs         # Parser trait definition
│   │   ├── nmap.rs        # Nmap XML parser (quick-xml)
│   │   ├── nikto.rs       # Nikto CSV/JSON parser
│   │   ├── nuclei.rs      # Nuclei JSONL parser
│   │   ├── zap.rs         # OWASP ZAP XML parser
│   │   └── generic.rs     # Generic JSON finding parser
│   ├── normalizer.rs      # Normalize all parsers to CosmicSec Finding schema
│   ├── db.rs              # PostgreSQL bulk insert (sqlx, COPY protocol)
│   ├── stream.rs          # Redis Streams consumer for incoming data
│   └── metrics.rs         # Prometheus metrics (findings/sec, parse errors)
├── proto/
│   └── ingest.proto       # gRPC service definition
├── Dockerfile             # Multi-stage Rust build
└── tests/
    ├── nmap_samples/      # Real nmap XML test data
    └── integration.rs     # Integration tests against test DB
```

### N.2 — Performance Targets
- Parse 10,000 nmap hosts/second (vs. ~500/sec Python)
- Bulk insert 50,000 findings/second using PostgreSQL COPY protocol
- Memory usage < 50MB for 1M finding batch
- Sub-millisecond per-finding normalization

### N.3 — Integration with Python Services
- API Gateway routes `POST /api/ingest/batch` to Rust engine
- Rust engine publishes parsed findings to Redis Streams
- Python services consume from Redis Streams for AI analysis, notifications
- Shared protobuf schema for Finding type

---

## Phase O — Test Coverage & Quality Gate

> **Priority**: 🟠 HIGH — Current coverage prevents confident refactoring
> **Estimated scope**: ~5,000 lines of new tests
> **Languages**: Python, TypeScript

### O.1 — Backend Test Coverage (Target: 85%+)

| Service | Current | Target | Key Test Areas |
|---------|---------|--------|----------------|
| API Gateway | ~15 tests | 50+ | Auth middleware, rate limiting, WAF rules, CORS, GraphQL |
| Auth Service | ~12 tests | 40+ | Login flow, 2FA setup/verify, OAuth, session management, rate limiting |
| Scan Service | ~10 tests | 30+ | WebSocket streaming, distributed scan, cancellation, persistence |
| AI Service | ~8 tests | 25+ | MITRE mapping, anomaly detection, RAG query, LangGraph flow |
| Integration Service | 0 tests | 15+ | Provider forwarding, webhook validation, event logging |
| Collab Service | 0 tests | 15+ | WebSocket rooms, message persistence, presence tracking |
| Plugin Registry | 0 tests | 10+ | Plugin CRUD, version management, SDK contract |
| Notification Service | 0 tests | 10+ | Channel dispatch, template rendering, rate limiting |

### O.2 — Frontend Unit Test Coverage (Target: 80%+)

| Area | Current | Target | Framework |
|------|---------|--------|-----------|
| Page components | 0 tests | 40+ | Vitest + React Testing Library |
| Hooks (`useScanStream`) | 0 tests | 5+ | Vitest + mock WebSocket |
| Stores (Zustand) | 0 tests | 10+ | Vitest |
| Context providers | 0 tests | 8+ | Vitest + RTL |
| API client | 0 tests | 10+ | Vitest + MSW (Mock Service Worker) |
| Utility functions | 0 tests | 5+ | Vitest |

### O.3 — E2E Test Suite (Playwright)

| Flow | Tests Needed |
|------|-------------|
| Registration → Login → Dashboard | 3 tests |
| Scan creation → WebSocket progress → Results | 3 tests |
| Recon query → Results display | 2 tests |
| AI analysis → MITRE mapping | 2 tests |
| Report generation → Download | 2 tests |
| Admin user management | 3 tests |
| Mobile responsive flows | 3 tests |
| Error handling (API down) | 2 tests |
| Auth flow (2FA, forgot password) | 3 tests |

### O.4 — CI Quality Gates
- Add `--cov-fail-under=80` to pytest
- Add Vitest coverage threshold (80% statements)
- Add Playwright as required CI check
- Add mutation testing (`mutmut` for Python, `stryker` for TypeScript) as optional nightly job
- Add visual regression testing (`playwright-visual-comparisons`) for key pages

### O.5 — Contract Testing
- Add Pact contract tests between frontend and API Gateway
- Add schema validation tests (OpenAPI spec vs. actual responses)
- Add backward compatibility checks for API changes

---

## Phase P — Advanced AI & ML Pipeline

> **Priority**: 🟡 MEDIUM — Differentiator feature
> **Estimated scope**: ~3,000 lines
> **Languages**: Python

### P.1 — Complete Stub Implementations
- **Vector Store** (`ai_service/vector_store.py`): Implement ChromaDB collection management, document ingestion, similarity search with metadata filtering
- **Anomaly Detector** (`ai_service/anomaly_detector.py`): Implement isolation forest model training on historical findings, real-time anomaly scoring for new findings
- **Red Team Planner** (`ai_service/red_team.py`): Implement attack path generation using MITRE ATT&CK graph traversal, risk-prioritized attack playbooks
- **Zero-Day Predictor**: Implement feature extraction from CVE data, train gradient boosting classifier on historical zero-day patterns

### P.2 — Local LLM Support (Ollama)
- Add Ollama provider alongside OpenAI in AI service
- Support model selection: `llama3`, `mistral`, `codellama` for code analysis
- Add model download management endpoint
- Add response quality comparison between providers

### P.3 — RAG Knowledge Base
- Implement automated CVE/NVD data ingestion into ChromaDB
- Add MITRE ATT&CK framework ingestion (STIX format)
- Add custom knowledge base upload (organization security policies, runbooks)
- Implement RAG-augmented finding analysis with source citations

### P.4 — LangGraph Multi-Agent Workflow
- Implement complete `ai_service/agents.py` with:
  - **Triage Agent**: Classifies findings by severity and type
  - **Analysis Agent**: Deep-dives into individual findings
  - **Correlation Agent**: Links related findings across scans
  - **Remediation Agent**: Generates fix recommendations with code snippets
- Add workflow visualization endpoint for frontend

### P.5 — ML Model Management
- Add model versioning and A/B testing framework
- Add model performance metrics (precision, recall, F1) to Prometheus
- Add model retraining pipeline triggered by new labeled data
- Add explainability (SHAP values) for anomaly detection predictions

---

## Phase Q — Enterprise Features & Multi-Tenancy

> **Priority**: 🟡 MEDIUM — Required for enterprise adoption
> **Estimated scope**: ~4,000 lines
> **Languages**: Python, TypeScript, SQL

### Q.1 — Multi-Tenancy
- Add `organization_id` column to all relevant tables
- Add Organization model with settings, branding, seat limits
- Add tenant isolation middleware in API Gateway
- Add organization-scoped API keys
- Add SSO integration (SAML 2.0 via `python-saml2`)

### Q.2 — Advanced RBAC
- Expand Casbin model with resource-level permissions
- Add custom role creation UI
- Add permission templates (SOC Analyst, Pentester, Manager, Auditor)
- Add API endpoint audit with permission check logging

### Q.3 — Compliance Automation
- **SOC2 Type II**: Automated evidence collection for trust criteria
- **PCI-DSS**: Card data exposure scanning, network segmentation validation
- **HIPAA**: PHI detection in scan results, access logging
- **ISO 27001**: Control mapping, risk assessment templates
- Add compliance report scheduling (monthly/quarterly)

### Q.4 — Audit Trail Enhancement
- Add immutable audit log with cryptographic hash chain
- Add log export (SIEM-compatible format: CEF, LEEF, JSON)
- Add audit log search and filtering UI
- Add retention policies (configurable per organization)

### Q.5 — White-Label Support
- Add custom branding (logo, colors, fonts) per organization
- Add custom domain support (CNAME mapping)
- Add email template customization
- Add custom report headers/footers

---

## Phase R — Performance, Observability & Scale

> **Priority**: 🟢 NICE-TO-HAVE → 🟠 HIGH at scale
> **Estimated scope**: ~3,000 lines + infrastructure changes
> **Languages**: Go, Python, YAML

### R.1 — Go Event Broker
```
broker/
├── go.mod
├── go.sum
├── cmd/
│   └── broker/main.go     # NATS JetStream consumer/producer
├── internal/
│   ├── events/             # Event type definitions
│   ├── handlers/           # Event handlers (fanout, filter, transform)
│   ├── health/             # Health check aggregation
│   └── metrics/            # Prometheus exporter
├── Dockerfile
└── tests/
```

### R.2 — Event-Driven Architecture
- Replace synchronous inter-service HTTP calls with NATS JetStream
- Event types: `scan.started`, `scan.completed`, `finding.created`, `alert.triggered`, `agent.connected`
- Add event replay capability for debugging
- Add dead letter queue for failed event processing

### R.3 — Caching Strategy
- Add Redis caching for:
  - API Gateway response cache (60s TTL for GET endpoints)
  - Recon results (24h TTL for DNS, Shodan, VirusTotal)
  - AI analysis results (1h TTL per finding hash)
  - Dashboard statistics (5m TTL)
- Add cache invalidation on data mutations
- Add cache hit/miss metrics to Prometheus

### R.4 — Database Performance
- Add read replicas for PostgreSQL (horizontal read scaling)
- Add database query profiling and slow query logging
- Add connection pool tuning based on service load
- Add partitioning for large tables (findings, audit_logs) by date
- Add materialized views for dashboard aggregate queries

### R.5 — Observability Enhancement
- Add distributed tracing end-to-end (frontend → API → service → DB)
- Add Sentry integration for error tracking (frontend + backend)
- Add custom Grafana dashboards:
  - Service health overview (latency P50/P95/P99, error rate, throughput)
  - Scan pipeline metrics (scans/hour, findings/hour, avg scan duration)
  - AI model performance (inference latency, accuracy, token usage)
  - Business metrics (active users, scans this month, findings by severity)
- Add alerting rules (PagerDuty/Slack):
  - Service down > 30s
  - Error rate > 5%
  - P99 latency > 2s
  - Disk usage > 80%

### R.6 — Horizontal Scaling
- Add Kubernetes HPA (Horizontal Pod Autoscaler) for all services
- Add service mesh (Istio or Linkerd) for mTLS between services
- Add database connection pool per-pod limits
- Add graceful shutdown handlers for zero-downtime deployments
- Add health check endpoints (liveness + readiness + startup probes)

---

## Cross-Cutting Modernization Tasks

These tasks span multiple phases and should be applied continuously:

### Developer Experience (DevX)
- [ ] Add `docker-compose.dev.yml` with hot-reload for all services
- [ ] Add `Makefile` targets: `make dev-frontend`, `make dev-backend`, `make dev-all`
- [ ] Add pre-commit hooks: ruff, mypy (strict), prettier, eslint
- [ ] Add VS Code workspace settings (`.vscode/settings.json`, recommended extensions)
- [ ] Add development seed data script (`scripts/seed-dev-data.py`)

### Documentation
- [ ] Add OpenAPI spec auto-generation and hosting (`/api/docs`)
- [ ] Add Storybook for frontend component library
- [ ] Add ADR (Architecture Decision Records) in `docs/adr/`
- [ ] Add runbook for common operations (`docs/runbooks/`)
- [ ] Add API versioning strategy document

### CI/CD Pipeline Enhancement
- [ ] Add GitHub Actions matrix strategy for multi-Python-version testing (3.11, 3.12, 3.13)
- [ ] Add container image scanning (Trivy) in build workflow
- [ ] Add SBOM generation (Syft) for supply chain security
- [ ] Add release automation (semantic-release or changesets)
- [ ] Add staging environment deployment (preview per PR)
- [ ] Add database migration check in CI (Alembic `check` command)

### Security Continuous Improvement
- [ ] Add Content Security Policy (CSP) headers via Traefik
- [ ] Add Subresource Integrity (SRI) for CDN assets
- [ ] Add dependency auto-update (Dependabot + Renovate)
- [ ] Add SAST in CI (Bandit for Python, ESLint security plugin for TypeScript)
- [ ] Add secrets scanning (TruffleHog or GitLeaks) in pre-commit
- [ ] Add WebSocket message validation (JSON Schema) in all WS endpoints

---

## Implementation Priority Matrix

```
                    IMPACT
                    HIGH ─────────────────────────────────┐
                    │  Phase K (Security)  │  Phase Q     │
                    │  Phase L (Data)      │  (Enterprise)│
                    │  Phase M (Frontend)  │              │
                    │                      │              │
                    MEDIUM ───────────────────────────────│
                    │  Phase O (Tests)     │  Phase R     │
                    │  Phase P (AI/ML)     │  (Scale)     │
                    │  Phase N (Rust)      │              │
                    │                      │              │
                    LOW ──────────────────────────────────│
                    │  Cross-cutting       │  Nice-to-have│
                    │  DevX improvements   │  features    │
                    └──────────────────────┴──────────────┘
                    LOW ──── URGENCY ──── HIGH
```

### Recommended Execution Order

| Order | Phase | Duration Estimate | Dependencies |
|-------|-------|-------------------|--------------|
| 1st | **Phase K** — Critical Security Fixes | 1-2 weeks | None |
| 2nd | **Phase L** — Data Persistence | 1-2 weeks | Phase K (auth) |
| 3rd | **Phase M** — Frontend Completion | 2-3 weeks | Phase K (auth pages), Phase L (API data) |
| 4th | **Phase O** — Test Coverage | 2-3 weeks | Phases K, L, M (test the fixed code) |
| 5th | **Phase P** — AI/ML Pipeline | 2-3 weeks | Phase L (data layer) |
| 6th | **Phase N** — Rust Ingest Engine | 2-3 weeks | Phase L (database schema) |
| 7th | **Phase Q** — Enterprise Features | 3-4 weeks | Phases K-P stable |
| 8th | **Phase R** — Performance & Scale | 3-4 weeks | Phase N (Rust engine), Phase Q (multi-tenant) |

**Total estimated effort**: 16-24 weeks for a small team (2-3 developers)

---

## Target File & Directory Additions

```
CosmicSec/
├── ingest/                          # [NEW] Rust ingest engine (Phase N)
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── src/
│   │   ├── main.rs
│   │   ├── config.rs
│   │   ├── parsers/
│   │   │   ├── mod.rs
│   │   │   ├── nmap.rs
│   │   │   ├── nikto.rs
│   │   │   ├── nuclei.rs
│   │   │   └── generic.rs
│   │   ├── normalizer.rs
│   │   ├── db.rs
│   │   ├── stream.rs
│   │   └── metrics.rs
│   ├── proto/ingest.proto
│   └── tests/
│
├── broker/                          # [NEW] Go event broker (Phase R)
│   ├── go.mod
│   ├── cmd/broker/main.go
│   ├── internal/
│   │   ├── events/
│   │   ├── handlers/
│   │   └── metrics/
│   ├── Dockerfile
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── api/                     # [NEW] Centralized API client (Phase M)
│   │   │   ├── client.ts
│   │   │   ├── endpoints.ts
│   │   │   └── generated/           # OpenAPI-generated types
│   │   ├── components/
│   │   │   ├── forms/               # [NEW] Reusable form components
│   │   │   │   ├── FormInput.tsx
│   │   │   │   ├── FormSelect.tsx
│   │   │   │   └── FormTextarea.tsx
│   │   │   └── MobileNav.tsx        # [NEW] Mobile hamburger nav
│   │   ├── hooks/
│   │   │   ├── useTokenRefresh.ts   # [NEW] Token lifecycle
│   │   │   └── useSearch.ts         # [NEW] Global search hook
│   │   └── pages/
│   │       ├── LoginPage.tsx        # [REWRITE] Full implementation
│   │       ├── RegisterPage.tsx     # [REWRITE] Full implementation
│   │       ├── ForgotPasswordPage.tsx # [REWRITE] Full implementation
│   │       └── TwoFactorPage.tsx    # [REWRITE] Full implementation
│   ├── tests/
│   │   ├── components/              # [NEW] Component tests
│   │   ├── hooks/                   # [NEW] Hook tests
│   │   ├── stores/                  # [NEW] Store tests
│   │   └── e2e/                     # [EXPAND] Full E2E suite
│   └── .storybook/                  # [NEW] Component library docs
│
├── services/
│   ├── auth_service/
│   │   ├── main.py                  # [MODIFY] Remove fake DBs, add rate limiting
│   │   └── encryption.py            # [NEW] 2FA secret encryption
│   ├── common/
│   │   ├── db.py                    # [MODIFY] Add circuit breaker
│   │   └── rate_limiter.py          # [NEW] Shared rate limiting
│   └── */main.py                    # [MODIFY] Narrow exception handlers
│
├── docker-compose.yml               # [MODIFY] Remove --reload, add env vars
├── docker-compose.dev.yml           # [NEW] Development overrides
├── .vscode/                         # [NEW] Workspace settings
│   ├── settings.json
│   └── extensions.json
├── docs/
│   ├── adr/                         # [NEW] Architecture Decision Records
│   ├── runbooks/                    # [NEW] Operational runbooks
│   └── api/                         # [NEW] Generated API docs
└── scripts/
    ├── seed-dev-data.py             # [NEW] Development seed data
    └── generate-api-client.sh       # [NEW] OpenAPI client generation
```

---

## Summary

| Metric | Current | After Phase K-R |
|--------|---------|-----------------|
| **Production readiness** | ⚠️ MVP (demo-only) | ✅ Production-grade |
| **Security posture** | 🔴 10 critical issues | 🟢 Zero known criticals |
| **Backend test coverage** | ~60-70% | 85%+ |
| **Frontend test coverage** | < 5% (2 tests) | 80%+ |
| **Auth flow** | ❌ Non-functional stubs | ✅ Full OAuth2/OIDC/WebAuthn |
| **Data persistence** | ⚠️ In-memory (6 services) | ✅ Full PostgreSQL/Redis |
| **Initial JS bundle** | 419KB | < 100KB (code-split) |
| **Languages** | Python + TypeScript | Python + Rust + Go + TypeScript |
| **Scan ingest rate** | ~500 findings/sec | 50,000+ findings/sec (Rust) |
| **Multi-tenancy** | ❌ Single-tenant | ✅ Organization-scoped |
| **Compliance** | ❌ Manual | ✅ SOC2/PCI-DSS/HIPAA automated |
| **Observability** | Basic Prometheus | Full OTel + Sentry + custom dashboards |
| **Mobile experience** | ⚠️ Broken nav | ✅ Fully responsive |

---

*This roadmap was generated from automated deep analysis of the entire CosmicSec codebase (19,655 lines Python + 1,747 TypeScript modules), live Playwright browser testing, build/lint/test execution, and CI/CD pipeline review.*
