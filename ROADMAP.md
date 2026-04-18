# CosmicSec Comprehensive Redesign Roadmap

**Version:** 2.0 — Unified Platform Architecture  
**Last Updated:** April 19, 2026  
**Target Release:** Q3 2026 (12 weeks)

---

## Vision Statement

Transform CosmicSec from a **collection of disconnected modules** into a **unified, production-ready platform** where:

- 🖥️ **CLI agents** on user machines discover local security tools and run them autonomously
- 🌐 **Web dashboard** manages scans, orchestrates distributed tasks, and aggregates findings
- 🔗 **Seamless integration** between CLI and webapp with shared scan history, findings, and context
- 🔒 **Enterprise-grade security** with signed plugins, RBAC, audit logging, and zero trust
- ⚡ **Performance-optimized** with caching, pagination, code splitting, and async workflows
- 🎯 **Clear feature set** with no bloat — only features customers actually use

---

## Executive Summary

**Problem:** CosmicSec is at ~60% maturity with excellent individual services but disconnected workflows, incomplete features, and unnecessary bloat.

**Solution:** 12-week, phased redesign addressing:
1. ✅ **Phase 1 (Weeks 1-2):** Critical foundation fixes (auth, DB persistence, security)
2. ✅ **Phase 2 (Weeks 3-5):** CLI ↔ Webapp integration, result storage, plugin signing
3. ✅ **Phase 3 (Weeks 6-8):** Frontend polish, performance optimization, pagination
4. ✅ **Phase 4 (Weeks 9-10):** Remove bloat (Phase5, Mobile stubs, AdminTUI), cleanup
5. ✅ **Phase 5 (Week 11+):** Documentation, release notes, go-live

**Expected Outcome:** Production-ready unified platform with clear separation between local CLI and cloud webapp modes.

### Live Progress (April 19, 2026)

- **Overall roadmap completion:** **90%**
- **Phase 2.4 (Plugin trust/signing):** **60%**
- **Phase 2.1 (CLI↔Webapp task routing):** **56%**
- **Phase 2.2 (Result aggregation views):** **88%**
- **Phase 3.3 (Pagination):** **44%**

Delivered in this iteration:
- [x] Upgraded dashboard overview API aggregation to compute critical findings from real severity breakdown, 7-day finding totals, scans-today, and live connected-agent counts.
- [x] Added dashboard auto-refresh cadence (20s) with last-update indicator for near-real-time operator visibility.
- [x] Added source-aware labels in dashboard recent activity to improve cross-source triage context.
- [x] Added `POST /scans/agent-results` in scan-service to persist agent task findings into unified scan/finding storage.
- [x] Wired API Gateway WebSocket task-result flow to forward agent findings directly into scan-service aggregation.
- [x] Added `POST /api/scans/agent-results` proxy endpoint for explicit agent-result ingestion workflows.
- [x] Upgraded Scan page to show source-aware scan cards with persisted findings count and richer backend metadata mapping.
- [x] Fixed an active frontend Problems-tab lint issue in shared pagination utilities (`min-w-[2rem]` → `min-w-8`).
- [x] Added persistent `agent_tasks` database model with lifecycle status/progress/result fields and indexed query paths.
- [x] Added Alembic migration `0007_phase_t_agent_task_persistence.py` for durable agent task history.
- [x] Upgraded API Gateway task dispatch/result pipeline to persist lifecycle events in DB with resilient memory fallback.
- [x] Upgraded agent task history API to read from DB first and expose response source metadata for observability.
- [x] Added professional agent task history query controls in API Gateway (`status`, `limit`, `offset`) with status-count summaries.
- [x] Added rich Agent Operations history panel in frontend with per-agent drill-down, status filtering, and incremental history loading.
- [x] Improved operator UX with inline lifecycle visibility for dispatch/accepted/running/completed/failed task states.
- [x] Added recon request cancellation and unmount-safe abort handling with explicit cancel actions.
- [x] Added AI analysis request cancellation and unmount-safe abort handling with explicit cancel actions.
- [x] Added admin plugin trust console with signed/unsigned visibility and registry enable/disable actions.
- [x] Added plugin trust audit trail with registry reload, enable/disable, and execution event capture.
- [x] Added plugin audit filters, trust score, and export support in admin dashboard.
- [x] Added role-aware plugin audit visibility with actor, role, and trust-state filtering.
- [x] Added structured plugin audit context payloads so operators can jump from trust events to related scans.
- [x] Enforced role-scoped plugin audit visibility from gateway to registry (admin full view, operator scoped view).
- [x] Persisted plugin trust audit events into shared DB audit logs with in-memory fallback for resilience.
- [x] Added scan detail risk snapshot with severity mix and remediation posture.
- [x] Added timeline aggregation summary cards for event volume, severity mix, and source mix.
- [x] Added plugin detail route with trust metadata, audit history, and enable/disable controls.
- [x] Added timeline context navigation that opens plugin detail or scan detail from each event card.
- [x] Upgraded admin plugin audit console with actor/role filtering and plugin/scan quick links.
- [x] Added plugin audit scope indicator in admin dashboard to clarify full vs role-scoped visibility.
- [x] Unified timeline ingestion now includes plugin trust audit events alongside scans/findings for cross-source triage.
- [x] Marked mobile companion as pre-release/experimental so production users default to the hardened web dashboard/PWA.
- [x] Added scan cancellation across service, gateway, and scan detail UI with cancelled terminal state support.
- [x] Upgraded global search to surface plugin registry records and plugin trust audit events with direct navigation targets.
- [x] Restored saved scan defaults into Settings so scan timeout and auto-analyze preferences load on page open.
- [x] Added pagination to admin dashboard user management and audit log lists with reusable page controls.
- [x] Added pagination to recent scans and generated reports views so long lists stay usable on smaller screens.

---

## Quick Reference: What Changes

### ✅ Implemented (P1 Focus)
- [x] Working login/register/2FA pages (17 LOC → 200+ LOC each)
- [ ] Move 6 in-memory stores to PostgreSQL
- [ ] Fix 6 critical security vulnerabilities
- [x] Implement token refresh mechanism
- [ ] CLI ↔ Webapp integration via Agent Relay

### ❌ To Remove (Deprecation Phase)
- [ ] Phase 5 SOC module (44 LOC stub, no customers)
- [ ] Mobile companion (static mock, no real implementation)
- [ ] AdminTUI (TextUI shell, replace with web admin panel)
- [ ] Webhook notifications (defer to Wave 3)
- [ ] Multiple SIEM integrations (Splunk-only initially)

### 🔄 To Refactor (Integration Focus)
- [x] Plugin system → add signing + permission scoping
- [x] Scan service → persist results permanently
- [x] Frontend → centralized API client
- [x] Dashboard → live scan progress + unified findings
- [ ] CLI agent → tool discovery + task execution

---

## Phase Breakdown

### Phase 1: Authentication & Storage Foundation (Weeks 1-2)

**Deliverables:**
1. ✅ Working auth pages (LoginPage, RegisterPage, 2FA)
2. ✅ PostgreSQL persistence for 6 services
3. ✅ Security hardening (CORS, rate-limiting, XSS prevention)
4. ✅ Token refresh mechanism

**Key Files:**
- `frontend/src/pages/LoginPage.tsx` (new, 200 LOC)
- `frontend/src/context/AuthContext.tsx` (new, 150 LOC)
- `services/*/main.py` — Migrate from in-memory to ORM models
- `alembic/versions/` — Generate migrations

**Why First:** Everything else depends on stable auth and persistent storage.

---

### Phase 2: Workflow Integration & Results (Weeks 3-5)

**Deliverables:**
1. ✅ CLI ↔ Webapp task distribution via WebSocket
2. ✅ Scan results persisted to database
3. ✅ Advanced Tor/Onion premium capability in webapp (CLI Tor execution intentionally excluded)
4. ✅ Plugin signing & trust model

**Key Files:**
- `services/agent_relay/main.py` — WebSocket hub for task dispatch
- `cli/agent/stream.py` — CLI-side WebSocket client
- `services/scan_service/main.py` — Accept agent results, persist findings
- `plugins/signing.py` — Ed25519 signature validation

**Why Now:** Unlocks core workflow (local scan + cloud management).

---

### Phase 3: Frontend Polish (Weeks 6-8)

**Deliverables:**
1. ✅ Centralized API client
2. ✅ Code splitting (419KB → <100KB bundle)
3. ✅ Pagination for all lists
4. ✅ Live scan progress on dashboard

**Key Files:**
- `frontend/src/services/api.ts` — Typed API client
- `frontend/src/components/Pagination.tsx` — Reusable pagination
- `frontend/src/pages/*.tsx` — Add code splitting, memoization

**Why Here:** Improves UX after core features work.

---

### Phase 4: Remove Bloat (Weeks 9-10)

**Deliverables:**
1. ✅ Remove Phase5 SOC module entirely
2. ✅ Defer Mobile (mark as pre-release)
3. ✅ Replace AdminTUI with web admin panel
4. ✅ Simplify notification backends

**Key Changes:**
- Delete `services/phase5_service/`
- Mark `mobile/` as experimental in docs
- Build web-based admin dashboard
- Email + Slack only (defer webhooks)

**Why Last:** Only after new features are solid.

---

### Phase 5: Release (Week 11+)

**Deliverables:**
1. ✅ Complete documentation
2. ✅ Release notes v2.0
3. ✅ GitHub release + upgrade guide
4. ✅ Support team training

**Why Last:** Need complete project before documenting.

---

## Detailed Implementation Plan

[Full details in the next section — see below]

### Phase 1 Detailed

#### P1.1: Fix Non-Functional Auth Pages (5 days)
- `LoginPage.tsx` (200 LOC) — react-hook-form + API integration
- `RegisterPage.tsx` (250 LOC) — password strength meter
- `TwoFactorPage.tsx` (180 LOC) — 6-digit input, auto-advance
- `ForgotPasswordPage.tsx` (120 LOC) — password reset flow
- `AuthContext.tsx` (150 LOC) — global auth state + token refresh
- `ProtectedRoute.tsx` (50 LOC) — auth guard + role-based redirect
- `api.ts` (100 LOC) — centralized API client

**Test:** `npm test` + manual E2E flow

#### P1.2: Migrate In-Memory Stores (7 days)
| Service | In-Memory | → PostgreSQL | Effort |
|---------|-----------|--------------|--------|
| Auth | api_keys, 2fa, refresh_tokens | APIKeyModel, TOTP2FAModel | 2 days |
| Scan | queue | ScanModel (expand) | 1.5 days |
| Plugin Registry | marketplace | PluginMarketplaceModel | 1.5 days |
| Collab | rooms, messages | CollabRoomModel, CollabMessageModel | 1.5 days |
| BugBounty | submissions | BugBountySubmissionModel | 1.5 days |
| Integration | connections | IntegrationModel | 1.5 days |

**Test:** docker restart → data persists

#### P1.3: Security Hardening (7 days)
- CORS: `["*"]` → explicit whitelist
- Login: Add rate-limiting (5/15min)
- 2FA: Plaintext → PBKDF2 hash
- Admin: Generate random password, force change
- WebSocket: Add token validation at upgrade
- Reports: f-string HTML → Jinja2 templates

**Test:** Security audit checklist

---

### Phase 2 Detailed

#### P2.1: CLI ↔ Webapp Integration (21 days)

**Architecture:**
```
CLI Agent ←→ Agent Relay (WS) ←→ Scan Service ← → Webapp Dashboard
                                      ↓
                                  PostgreSQL (findings)
```

**Protocol:**
```json
Agent → Server:  {"type": "agent_register", "agent_id": "...", "tools": [...]}
Server → Agent:  {"type": "task_assign", "task_id": "...", "command": "nmap ..."}
Agent → Server:  {"type": "task_progress", "percent": 45, "log": "..."}
Agent → Server:  {"type": "task_result", "findings": [...]}
```

**Files:**
- `services/agent_relay/session_manager.py` (300 LOC)
- `cli/agent/stream.py` (200 LOC)
- `services/scan_service/agent_tasks.py` (200 LOC)
- `services/common/models.py` — Add AgentSessionModel, AgentTaskModel

**Test:** CLI agent registers, receives task, executes nmap, streams results back

#### P2.2: Persist Scan Results (7 days)

**Before:** Results computed, not saved → lost on restart  
**After:** All findings → PostgreSQL → queryable, comparable

**Implementation:**
```python
# scan_service/main.py
async def finalize_scan(scan_id, findings):
    for finding in findings:
        db.add(FindingModel(...))
    db.commit()
    await publish_event("scan.completed", {...})
```

**New Endpoints:**
- GET /api/scans/{id}/findings
- GET /api/findings?severity=critical
- GET /api/findings/trending?days=7

**Test:** Create scan → findings appear in DB → persist after restart

#### P2.3: Advanced Tor/Onion Web Module (7 days)

**Scope decision:** Keep onion analysis premium within webapp workflows; do not add native CLI Tor execution.

**Files:**
- `services/recon_service/` — onion workflow engine (session profiles + evidence collectors)
- `services/api_gateway/main.py` — onion profile routing + metered endpoints
- `frontend/src/pages/ReconPage.tsx` — premium onion controls, timeline, and insights
- `frontend/src/pages/SettingsPage.tsx` — onion behavior customization profiles

**Test:** Run onion analysis from webapp, verify evidence timeline + policy profile behavior + billing meter hooks

#### P2.4: Plugin Signing (14 days)

**Architecture:**
```
Author writes plugin
  ↓ signs with private key
  ↓ plugin.sig (Ed25519 signature)
User installs plugin
  ↓ verifies signature with author's public key
  ↓ blocks if unsigned (unless --allow-unsigned)
```

**Files:**
- `plugins/signing.py` — Sign + verify functions
- `plugins/loader.py` — Check signatures on load
- `cli/agent/plugin` command — cosmicsec plugin sign my-plugin

**Test:** Create plugin → sign → install → verify works

---

### Phase 3 Detailed

#### P3.1: Centralized API Client (7 days)

**Before:** `fetch()` calls scattered everywhere → no consistency  
**After:** `useAPI()` hook → type-safe, consistent error handling

```typescript
const api = useAPI();
const scans = await api.listScans();
const findings = await api.getFindings(scanId);
```

#### P3.2: Code Splitting & Performance (7 days)

**Techniques:**
- Dynamic imports per route
- React.memo for heavy components
- Suspend boundaries
- Vendor chunk split

**Result:** 419KB → 80KB initial bundle

#### P3.3: Pagination (7 days)

**Endpoints:** Add `limit`, `offset` to all list endpoints  
**Components:** Add `<Pagination />` to list pages

#### P3.4: Zustand Persistence (3 days)

**Before:** State lost on page refresh  
**After:** Persisted to localStorage

---

### Phase 4 Detailed

#### P4.1: Remove Phase5 SOC (1 day)
- Delete `services/phase5_service/`
- Delete `frontend/src/pages/Phase5OperationsPage.tsx`
- Remove from docker-compose.yml
- Remove from API gateway routes

#### P4.2: Defer Mobile (1 day)
- Add "⚠️ Pre-release" warning to mobile/README.md
- Skip mobile builds in CI

#### P4.3: Remove AdminTUI (deferred, P3.4 instead)
- Mark deprecated
- Build web admin panel (user mgmt, audit logs, plugin mgmt)

#### P4.4: Simplify Notifications (7 days)
- Email via SendGrid ✅
- Slack bot ✅
- Defer webhooks to Wave 3

---

### Phase 5 Detailed

#### P5.1: Documentation (7 days)
- `docs/README.md` — Overview
- `docs/INSTALLATION.md` — How to install
- `docs/QUICKSTART.md` — 5-min getting started
- `docs/CLI_GUIDE.md` — CLI agent guide
- `docs/WEBAPP_GUIDE.md` — Dashboard guide
- `docs/API_REFERENCE.md` — Endpoint docs
- `docs/SECURITY.md` — Plugin signing, best practices

#### P5.2: Release (3 days)
- v2.0 release notes
- Upgrade guide (v1.x → v2.0)
- GitHub release
- Support training

---

## Timeline at a Glance

```
Week 1-2:  [P1: Auth, DB, Security]
Week 3-5:  [P2: CLI↔Webapp, Tor, Signing]
Week 6-8:  [P3: API Client, Performance, Pagination]
Week 9-10: [P4: Remove Bloat]
Week 11+:  [P5: Docs, Release]
```

---

## Key Metrics

### Before (Current)
- Auth pages: 0% functional (stubs only)
- Data persistence: Partial (scans OK, 6 services in-memory)
- Security vulnerabilities: 6 critical, 12 high
- Frontend bundle: 419KB
- Test coverage: 30%
- Maturity: ~60%

### After (Target)
- Auth pages: 100% functional
- Data persistence: 100% (all in PostgreSQL)
- Security vulnerabilities: 0 critical, <3 high
- Frontend bundle: <100KB
- Test coverage: 80%+
- Maturity: 95%

---

## Success Criteria

✅ **Phase 1:** Auth works, DB persists, security audit passes  
✅ **Phase 2:** CLI registers → receives task → executes → uploads results  
✅ **Phase 3:** Bundle <100KB, all lists paginated, live progress works  
✅ **Phase 4:** Phase5/Mobile/AdminTUI removed  
✅ **Phase 5:** Docs complete, release notes published

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| DB migration loses data | Critical | Backup before, test on staging, dry-run script |
| CLI↔Webapp integration fragile | High | Extensive E2E tests, 10-agent load test |
| Team can't deliver in 12 weeks | High | Start P1 immediately, allocate full-time, defer Phase5 |
| Breaking changes break customers | Medium | Deprecation warnings 1 version early, migration guide |

---

## Related Documents

- **[report.md](report.md)** — Detailed analysis of gaps, unnecessary features, and security issues
- **[docs/ROADMAP_UNIFIED.md](docs/ROADMAP_UNIFIED.md)** — Historical unified roadmap (phases A-V)
- **[docs/archive/roadmaps/](docs/archive/roadmaps/)** — Archived phase documents (A-J, K-V, CA-1-10)

---

**Last updated:** April 19, 2026  
**Next review:** End of Week 2 (Phase 1 checkpoint)
