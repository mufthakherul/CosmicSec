# 🧩 CosmicSec Hybrid Platform Roadmap

## 1) Vision

Build CosmicSec as a **hybrid cybersecurity platform** where:

- **Dynamic modules** deliver advanced capabilities and rapid innovation.
- **Static modules** guarantee continuity during incidents, outages, and emergency operations.
- **Hybrid middleware** orchestrates both paths using policy-driven routing.

This roadmap upgrades the platform from “mostly static proxy wiring” to a resilient, scalable, and auditable runtime architecture.

---

## 2) Strategic Goals

### Product Goals

1. Keep the platform available in degraded conditions.
2. Offer safe demo/preview workflows for unregistered users.
3. Provide enterprise-grade reliability for incident response and SOC operations.
4. Support broad user roles (red team, blue team, appsec, SOC, bug bounty, compliance).

### Engineering Goals

1. Dynamic-first microservice orchestration with observable fallback behavior.
2. Deterministic static responses for disaster control.
3. Zero-downtime migration path without breaking existing API clients.
4. Strong test coverage for mode switching and fallback correctness.

---

## 3) Hybrid Runtime Model

## Runtime Modes

- `dynamic`: strict upstream microservice execution.
- `hybrid` (recommended default): dynamic attempt first, static fallback on failure.
- `static`: all eligible routes served from static modules.
- `emergency`: strict disaster profile (least-privilege + continuity only).
- `demo`: non-privileged preview flows for unauthenticated users.

## Routing Policy

For each route, define:

- **criticality**: `business_critical`, `security_critical`, `non_critical`
- **fallback policy**: `allowed`, `partial`, `disabled`
- **auth policy in fallback**: `deny`, `demo_only`, `limited`
- **response profile**: deterministic payload schema for static mode

---

## 4) Target Architecture (Hybrid-Aware)

## Layer A: Access & Edge

- API Gateway (FastAPI + policy middleware)
- Rate limit, auth guard, runtime-mode resolver
- Request correlation IDs and mode decision annotations

## Layer B: Dynamic Services

- `auth_service`, `scan_service`, `ai_service`, `recon_service`
- `report_service`, `integration_service`, `bugbounty_service`, `collab_service`
- Async workers (Celery/RQ) and queue backplane (Redis/RabbitMQ)

## Layer C: Static Continuity Modules

- Emergency auth/profile handler (no privileged token minting outside demo)
- Disaster scan queue acceptance
- Static recon preview
- Degraded AI health and advisory responses
- Incident communication templates and runbook hints

## Layer D: Hybrid Middleware

- Route-mode selection (`X-Platform-Mode` + environment defaults)
- Dynamic execution wrapper
- Circuit-break style fallback handoff
- Decision metadata in responses (`_runtime`)

## Layer E: Data & Observability

- PostgreSQL (state), Redis (cache/queue), MongoDB (unstructured findings)
- Prometheus metrics and central logs
- Fallback event counters for reliability scoring

---

## 5) Directory Restructure Plan (Incremental, Safe)

Migration should be staged to avoid breaking imports and deployment:

```text
services/
  api_gateway/
    main.py
    hybrid_runtime.py           # NEW: mode resolver + fallback dispatcher
    static_profiles/            # NEXT: route-specific static payload builders
  auth_service/
  scan_service/
  recon_service/
  ...

docs/
  ARCHITECTURE_DIAGRAM.md
  HYBRID_PLATFORM_ROADMAP.md   # NEW
```

Future extraction target:

```text
platform/
  middleware/
    hybrid_router.py
    policy_registry.py
  static_modules/
    auth_fallback.py
    scan_fallback.py
    recon_fallback.py
  contracts/
    runtime_metadata.py
```

---

## 6) Technology Recommendations (2026-ready)

### Core Backend

- Python 3.11/3.12
- FastAPI + Pydantic v2
- SQLAlchemy 2.x + Alembic
- httpx for service-to-service proxying

### Dynamic Orchestration

- Celery or Dramatiq for tasking
- Redis streams or RabbitMQ for eventing
- Optional service mesh when Kubernetes matures in deployment

### Reliability

- Per-service timeout budgets
- Retry with jitter for idempotent GET operations
- Circuit-breaker profile for repeated upstream failures

### Security

- JWT + API keys + role policies
- No privileged fallback auth in static/emergency mode
- Audit trail for every fallback decision

---

## 7) Migration Phases

## Phase 1 — Hybrid Gateway Foundation (Started)

- Add `HybridRouter` middleware helper in API gateway.
- Add runtime mode endpoint: `GET /api/runtime/mode`.
- Route selected endpoints through hybrid logic:
  - `/api/auth/login`
  - `/api/scans`
  - `/api/recon`
  - `/api/ai/health`
- Add initial test coverage for runtime endpoint and fallback shape.

## Phase 2 — Policy Registry + Static Profiles

- Move static handlers into `static_profiles/`.
- Add policy table per route (fallback allowed/denied).
- Add emergency runbook payloads for SOC and incident workflows.

## Phase 3 — Contract Stabilization

- Standardize fallback payload schemas.
- Publish OpenAPI examples for dynamic vs static responses.
- Add client SDK helpers for runtime metadata interpretation.

## Phase 4 — Operational Hardening

- Add metrics (`fallback_total`, `dynamic_success_rate`).
- Add distributed tracing for gateway decisions.
- Add chaos tests to verify graceful degradation.

## Phase 5 — Full Platform Consolidation

- Extract shared middleware to `platform/middleware`.
- Wire all critical routes to hybrid policies.
- Roll out production readiness checklist and SLOs.

---

## 8) Static Module Requirements (Disaster/Emergency)

1. Must return deterministic schemas.
2. Must avoid privileged side effects unless explicitly safe.
3. Must include clear advisory messaging (`degraded`, `next_action`).
4. Must log fallback reason and route.
5. Must be testable without external dependencies.

---

## 9) Demo Preview Requirements

1. Demo mode cannot access privileged admin paths.
2. Demo data must be synthetic or sanitized.
3. Demo token must be clearly marked as preview-only.
4. Demo responses must include runtime metadata.

---

## 10) Success Criteria

- Gateway remains responsive when one or more dynamic services are down.
- Security-critical routes do not silently bypass auth guarantees.
- Mode resolution and fallback behavior are observable via API and logs.
- Existing baseline tests continue to pass.
- Documentation accurately reflects implemented behavior.

---

## 11) Immediate Next Actions

1. Expand hybrid routing from initial endpoints to all critical operations.
2. Add per-route fallback policy registry and strict deny rules.
3. Add dashboards for fallback frequency and degraded operation time.
4. Align `ARCHITECTURE_DIAGRAM.md` with implemented hybrid middleware map.
