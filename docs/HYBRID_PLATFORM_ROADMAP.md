# 🧭 CosmicSec Hybrid Platform Roadmap (Active)

_Last reviewed: 2026-03-15_

## Purpose

This is the **active source-of-truth roadmap** for the CosmicSec hybrid platform.

It replaces the earlier broad modernization planning documents with a roadmap that is:

- based on **verified implementation**, not aspiration alone
- scoped around the **hybrid runtime platform** as the product core
- explicit about what is **complete, partial, deferred, and out of scope**
- intentionally **excluding native iOS/Android apps** for now

Archived roadmap/status snapshots live under `Archives/Docs/`.

---

## Current audit verdict

After reviewing the documentation set against the repository, the platform is in a strong but not fully “all-roadmaps-complete” state.

### Verified as operational today

- Microservice backend with multiple active services under `services/`
- API gateway with hybrid routing, policy registry, runtime contracts, tracing, rollout controls, and Prometheus-style metrics
- Core security services for auth, scan, recon, AI, reporting, integrations, collaboration, bug bounty, and phase-5 domain features
- Admin interfaces via REST, admin CLI/TUI, and SSH admin shell
- Multi-tenancy, quotas, GDPR controls, audit logging, reporting exports, and major integration endpoints
- Frontend baseline with React + TypeScript + Vite
- Containerized local environment and CI workflows

### Verified as partial or overstated in legacy docs

- “Enhanced user CLI” remains incomplete; current CLI coverage is strongest for admin workflows
- JavaScript and Go SDKs are not mature deliverables yet
- Plugin marketplace exists, but as a basic framework rather than a fully mature ecosystem product
- “AI Red Team”, “Zero-Day Prediction”, and “Quantum-Ready Security” exist as guarded or illustrative capabilities, not as fully mature production systems
- Several advanced domain packs from the older modernization roadmap are still unimplemented or only lightly scaffolded

### Explicitly out of scope for this roadmap

- Native iOS app
- Native Android app

---

## Strategic product direction

The platform should evolve as a **hybrid cybersecurity operating platform** with four properties:

1. **Dynamic-first execution** for full capability and live integrations.
2. **Deterministic continuity** when dependencies fail, degrade, or are intentionally bypassed.
3. **Operational truthfulness** so documentation, APIs, dashboards, and demos always reflect reality.
4. **Progressive specialization** through domain packs, not giant speculative checklists.

This means the hybrid runtime is not just an API gateway feature; it becomes the contract that ties together:

- platform resilience
- operator workflows
- tenant isolation
- observability
- trusted degraded-mode behavior

---

## Verified baseline architecture

### Runtime plane

The current platform already includes a meaningful hybrid runtime baseline:

- `services/api_gateway/main.py`
- `cosmicsec_platform/middleware/hybrid_router.py`
- `cosmicsec_platform/middleware/policy_registry.py`
- `cosmicsec_platform/contracts/runtime_metadata.py`

#### Implemented runtime capabilities

- route-mode resolution
- hybrid fallback execution
- demo-mode privileged route denial
- readiness and SLO endpoints
- runtime compliance snapshot endpoint
- rollout/canary controls
- metrics and trace buffering

### Dynamic service plane

Active service families currently include:

- `auth_service`
- `scan_service`
- `recon_service`
- `ai_service`
- `report_service`
- `integration_service`
- `collab_service`
- `bugbounty_service`
- `phase5_service`
- `admin_service`

### Data and operations plane

Current foundations include:

- PostgreSQL + Alembic baseline
- Redis usage for runtime/session/cache patterns
- MongoDB usage for unstructured scan/result patterns
- Docker Compose development stack
- GitHub Actions workflows for build, deploy, test, and security scanning

### Operator interfaces

The platform currently supports:

- REST API access
- web frontend baseline
- admin CLI
- admin TUI
- SSH admin shell

The **user-facing enhanced CLI vision** remains a future workstream rather than a completed deliverable.

---

## Roadmap principles

### 1. Reliability before novelty

Do not expand speculative features before hybrid resilience, observability, tenancy safety, and operator workflows are production-solid.

### 2. Truthful documentation

No feature is marked complete unless there is:

- code in the repository
- test coverage or explicit validation evidence
- an operator-facing contract or usage path

### 3. Fallbacks must be safe

Fallback behavior must never create silent privilege escalation, hidden data mutation, or misleading “healthy” states.

### 4. Domain packs over giant monolith promises

Large verticals such as bug bounty, SOC, GRC, training, or cloud posture should be shipped as clear capability packs with explicit maturity labels.

### 5. Demo is not production

Demo, static, and emergency modes must remain clearly labeled, safely restricted, and auditable.

---

## Active roadmap themes

### Theme A — documentation and truth alignment

#### Goal

Bring the docs into tight alignment with the actual platform and prevent future drift.

#### Deliverables

- maintain a single active roadmap (`docs/HYBRID_PLATFORM_ROADMAP.md`)
- maintain an implementation audit (`docs/ROADMAP_IMPLEMENTATION_AUDIT.md`)
- archive legacy roadmap/status documents under `Archives/Docs/`
- add maturity labels across major features:
  - `operational`
  - `beta`
  - `prototype`
  - `planned`

#### Exit criteria

- no active roadmap file overstates feature maturity
- archived docs are clearly marked historical
- new roadmap changes always follow a verification pass

---

### Theme B — hybrid runtime production hardening

#### Goal

Turn the current hybrid runtime baseline into a fully production-hardened control plane.

#### Work items

##### B1. Policy completeness

- expand route policy coverage to all critical operator and tenant routes
- formalize per-route fallback classes:
  - read-only safe fallback
  - queue-and-defer fallback
  - deny-on-degradation fallback
- document policy ownership for every service surface

##### B2. Persistence-backed rollout state

- move rollout configuration beyond process memory
- support environment-specific rollout profiles
- add audit records for rollout changes

##### B3. Reliability engineering

- define service timeout budgets per route class
- add retry policy for idempotent reads only
- add circuit-open thresholds and cooldown windows
- capture degraded-mode reason taxonomy

##### B4. Observability

- expand Prometheus metrics for route, service, mode, and failure reason
- add Grafana dashboards for runtime mode, fallback rate, and policy-denied traffic
- surface top degraded routes and frequent upstream failures

##### B5. Chaos and continuity testing

- automate simulated service outages in CI/staging
- validate demo/static/emergency semantics repeatedly
- add continuity acceptance scenarios for auth, scans, reporting, and tenant operations

#### Exit criteria

- hybrid runtime is measurable, testable, and explainable under failure
- critical routes have explicit and reviewed fallback policies
- rollout and degradation behavior are auditable

---

### Theme C — operator experience and admin maturity

#### Goal

Strengthen the actual operator surfaces the platform already exposes, instead of assuming parity that does not yet exist.

#### Work items

##### C1. Admin CLI/TUI hardening

- extend command coverage for user, role, audit, config, backup, and module management
- replace placeholder outputs with richer operational actions
- add structured error handling and persistence-backed state

##### C2. SSH administration hardening

- improve session model, command help, and audit details
- document SFTP/SCP behavior clearly
- add stronger configuration guidance for production deployment

##### C3. Web operator parity

- align dashboard/admin workflows with backend capabilities already exposed through API routes
- close gaps in audit visualization, quota controls, runtime observability, and rollout controls

##### C4. User-facing CLI strategy

- define whether a dedicated non-admin CLI is still a priority
- if yes, scope it realistically around scan/recon/report workflows
- keep it separate from admin CLI maturity claims until shipped

#### Exit criteria

- admin surfaces are consistent across REST, TUI, and SSH
- operator documentation matches real commands and workflows
- user-facing CLI is either implemented or explicitly deprioritized

---

### Theme D — SDK and integration maturity

#### Goal

Make external adoption cleaner by improving runtime contracts and SDK support.

#### Work items

##### D1. Python SDK completion

- stabilize runtime metadata parsing helpers
- document auth, retries, degraded responses, and rollout-aware behavior
- publish practical examples for scan, report, runtime, and admin use cases

##### D2. JavaScript and Go SDK roadmap reset

- mark both as `planned` until there is working client functionality
- define minimum viable scope before claiming readiness

##### D3. Webhook and integration consistency

- normalize event payload contracts
- document delivery semantics, retries, and failure behavior
- align SIEM/ticket/notification adapters under common event envelopes

##### D4. Plugin ecosystem realism

- separate plugin loader/runtime from marketplace maturity
- add persistent storage if marketplace becomes product-critical
- document community repository trust boundaries and review posture

#### Exit criteria

- SDK status is honest and testable
- integration contracts are stable and documented
- marketplace claims match operational capabilities

---

### Theme E — domain capability packs for the hybrid platform

#### Goal

Grow the platform through verifiable domain packs, each tied into hybrid runtime semantics.

#### Initial pack priorities

##### E1. SOC operations pack

- alerts, incidents, hunting, playbooks, shift workflows
- degraded-mode behavior for investigation continuity
- auditability of automated response paths

##### E2. DevSecOps pack

- SAST, security linting, dependency review, CI/CD security gates
- trustworthy “advisory vs enforcement” modes
- explicit fallback behavior when external analyzers are unavailable

##### E3. Bug bounty pack

- program discovery, target tracking, submissions, PoC builder, collaboration
- isolate “assistive” and “automated” features with clear safety boundaries

##### E4. GRC/compliance pack

- policy workflows, evidence capture, framework reporting, retention and deletion controls
- continuity-safe reporting when upstream services degrade

#### Deferred domain packs

The following should remain deferred until the above packs are stable or properly scaffolded:

- blockchain/web3 security
- IoT/OT security
- training/CTF platform
- broader mobile-security productization

#### Exit criteria

- each pack has clear APIs, docs, tests, and maturity labels
- no pack is marked complete solely from placeholder endpoints

---

### Theme F — release engineering, governance, and platform fitness

#### Goal

Make the hybrid platform maintainable as a long-lived product.

#### Work items

- establish documentation review checkpoints per major release
- add feature maturity metadata to release notes
- define test lanes:
  - unit
  - service integration
  - hybrid continuity
  - operator surface checks
- define production readiness checklist for new routes entering hybrid control
- create archive policy for superseded planning docs

#### Exit criteria

- roadmap updates are lightweight but trustworthy
- new capabilities ship with tests, contracts, and operator docs
- old planning docs stop drifting into active-source confusion

---

## Delivery plan

### Phase 0 — documentation reset and roadmap cleanup

#### Target window

Immediate

#### Deliverables

- archive legacy roadmap/status docs
- publish implementation audit
- publish this active roadmap

#### Done when

- active docs reflect verified state

### Phase 1 — hybrid control plane hardening

#### Target window

Next 2-4 weeks

#### Deliverables

- broaden route policy coverage
- persist rollout state
- expand metrics and degraded reason taxonomy
- add continuity test scenarios

#### Done when

- hybrid runtime can be operated confidently in staging/production

### Phase 2 — operator experience convergence

#### Target window

Next 4-8 weeks

#### Deliverables

- stronger admin CLI/TUI/SSH parity
- improved runtime/admin web workflows
- clarified user CLI strategy

#### Done when

- operators can perform common tasks consistently across supported interfaces

### Phase 3 — SDK and integration maturity

#### Target window

Next 6-10 weeks

#### Deliverables

- Python SDK completion
- realistic JS/Go SDK plan
- normalized webhook/event contracts
- marketplace maturity labeling

#### Done when

- external consumers can integrate without reading internal code

### Phase 4 — hybrid domain packs

#### Target window

Next 2-3 releases

#### Deliverables

- SOC pack hardening
- DevSecOps pack hardening
- bug bounty pack hardening
- GRC pack hardening

#### Done when

- packs are evidence-backed, test-backed, and operationally documented

### Phase 5 — advanced or deferred domains

#### Target window

After platform-core maturity

#### Candidates

- training/CTF platform
- blockchain/web3 tools
- IoT/OT tools
- broader mobile-security productization

#### Done when

- each area has an implementation owner, realistic scope, and verified adoption need

---

## KPIs and success measures

### Reliability

- fallback ratio remains within defined SLO thresholds
- critical-route policy coverage reaches 100%
- degraded-mode responses remain schema-consistent

### Product truthfulness

- no active roadmap item is marked complete without code evidence
- docs review occurs for every major release

### Operator effectiveness

- common admin actions work consistently across API, TUI, and SSH
- runtime issues can be explained from metrics and traces within minutes

### Integration readiness

- Python SDK examples cover primary workflows
- event/webhook payloads remain backward-compatible across releases

---

## Risks to manage

### Risk 1 — documentation drift returns

**Mitigation:** keep audit + roadmap paired; require evidence before status promotion.

### Risk 2 — fallback logic becomes unsafe

**Mitigation:** deny-by-default on security-critical paths, plus tests and audit logs.

### Risk 3 — feature sprawl outruns core reliability

**Mitigation:** prioritize runtime, operator experience, and integration quality before new speculative domains.

### Risk 4 — placeholder capability inflation

**Mitigation:** use maturity labels and explicitly separate prototype from operational functionality.

---

## Definition of done for future roadmap items

An item may be marked complete only when it has:

1. implementation in the repository
2. documented operator or developer usage path
3. tests or validation evidence
4. honest maturity labeling
5. no contradiction with the implementation audit

---

## Archive and governance note

This file supersedes the broad legacy modernization planning set.

Historical material is retained in `Archives/Docs/` for traceability, including:

- prior hybrid roadmap snapshot
- prior phase progress snapshot
- prior phase 3/4 summary snapshot
- previous modernization and implementation guide archive copies

If a future roadmap replaces this one, archive it first, then publish the successor as the only active roadmap.
