# CosmicSec — Dependency & Technology Audit Report

> **Audit date**: 2026-04-15 | **Scope**: All languages, tools, frameworks, Docker images, CI actions, pre-commit hooks
> **Method**: Extracted all pinned/required versions from source → compared against latest available on PyPI, npm, Docker Hub, GitHub

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Python Dependencies](#2-python-dependencies)
3. [JavaScript / TypeScript Dependencies](#3-javascript--typescript-dependencies)
4. [Go Dependencies](#4-go-dependencies)
5. [Docker Base Images](#5-docker-base-images)
6. [Infrastructure Service Images](#6-infrastructure-service-images)
7. [GitHub Actions](#7-github-actions)
8. [Pre-commit Hooks](#8-pre-commit-hooks)
9. [Runtime Environments](#9-runtime-environments)
10. [Deprecated / End-of-Life Packages](#10-deprecated--end-of-life-packages)
11. [Upgrade Recommendations](#11-upgrade-recommendations)
12. [Non-Upgradeable Items & Reasons](#12-non-upgradeable-items--reasons)

---

## 1. Executive Summary

| Category | Total Packages | Up-to-date | Upgradeable | Major Upgrade Needed | Deprecated/EOL |
|----------|---------------|------------|-------------|---------------------|----------------|
| **Python (core)** | 55+ | 5 | 42 | 8 | 3 |
| **Python (dev)** | 8 | 1 | 7 | 0 | 0 |
| **JavaScript/TypeScript** | 19 | 5 | 14 | 3 | 0 |
| **Go** | 1 | 0 | 1 | 0 | 0 |
| **Docker images** | 11 | 2 | 9 | 3 | 0 |
| **GitHub Actions** | 8 | 5 | 2 | 1 | 0 |
| **Pre-commit hooks** | 2 | 0 | 2 | 0 | 0 |

**Key findings:**
- 🔴 **3 deprecated packages** need replacement (`aioredis`, `opentelemetry-exporter-jaeger`, `fuzzywuzzy`)
- 🟠 **8 major version bumps** available (langchain, marshmallow, rich, react-router-dom, etc.)
- 🟡 **42+ packages** have minor/patch upgrades available
- 🟢 **5 packages** are already at latest or within latest range
- ⚠️ **1 Docker image inconsistency**: notification_service uses Python 3.12 while all others use 3.13
- ⚠️ **Node.js version mismatch**: docker-compose uses `node:20-alpine` but CI uses Node.js 24

---

## 2. Python Dependencies

### Core Dependencies (pyproject.toml + requirements.txt)

| Package | Min Required | Latest Available | Gap | Upgradeable? | Notes |
|---------|-------------|-----------------|-----|-------------|-------|
| `fastapi` | ≥0.104.0 | **0.135.3** | 🟡 31 minor | ✅ Yes | Many new features (Lifespan, improved deps injection) |
| `uvicorn` | ≥0.24.0 | **0.44.0** | 🟡 20 minor | ✅ Yes | HTTP/3, improved workers |
| `pydantic` | ≥2.5.0 | **2.13.0** | 🟡 8 minor | ✅ Yes | Performance improvements, new validators |
| `sqlalchemy` | ≥2.0.0 | **2.0.49** | 🟡 49 patch | ✅ Yes | Bug fixes, typing improvements |
| `alembic` | ≥1.12.0 | **1.18.4** | 🟡 6 minor | ✅ Yes | New revision commands, async support |
| `celery` | ≥5.3.4 | **5.6.3** | 🟡 3 minor | ✅ Yes | Redis Sentinel, result backend improvements |
| `redis` | ≥5.0.0 | **7.4.0** | 🟠 2 major | ✅ Yes | Major: cluster support, JSON module |
| `openai` | ≥1.3.0 | **2.31.0** | 🔴 1 major | ✅ Yes | Major API rewrite, streaming improvements |
| `langchain` | ≥0.3.0 | **1.2.15** | 🔴 1 major | ✅ Yes | Major: new LCEL, tool calling, structured output |
| `langchain-openai` | ≥0.2.0 | **1.1.13** | 🔴 1 major | ✅ Yes | Follows langchain major version |
| `chromadb` | ≥0.5.0 | **1.5.7** | 🔴 1 major | ✅ Yes | Major: new client API, auth, multi-tenancy |
| `httpx` | ≥0.25.0 | **0.28.1** | 🟡 3 minor | ✅ Yes | HTTP/2 improvements |
| `sentry-sdk` | ≥1.40.0 | **2.58.0** | 🔴 1 major | ✅ Yes | Major: new API, auto-instrumentation |
| `opentelemetry-api` | ≥1.20.0 | **1.41.0** | 🟡 21 minor | ✅ Yes | Stable metrics, logs API |
| `opentelemetry-sdk` | ≥1.20.0 | **1.41.0** | 🟡 21 minor | ✅ Yes | Log bridge, improved exporters |
| `opentelemetry-exporter-jaeger` | ≥1.20.0 | **1.21.0** | 🔴 DEPRECATED | ❌ Replace | **Use `opentelemetry-exporter-otlp` instead** |
| `opentelemetry-instrumentation-fastapi` | ≥0.41b0 | *latest stable* | 🟡 | ✅ Yes | Follows OTel SDK version |
| `prometheus-client` | ≥0.19.0 | **0.25.0** | 🟡 6 minor | ✅ Yes | New histogram types |
| `python-jose` | ≥3.3.0 | **3.5.0** | 🟡 2 minor | ✅ Yes | Security patches |
| `passlib` | ≥1.7.4 | **1.7.4** | ✅ Latest | — | Consider `argon2-cffi` for new projects |
| `cryptography` | ≥41.0.0 | **46.0.7** | 🟠 5 major | ✅ Yes | New algorithms, security fixes |
| `psycopg2-binary` | ≥2.9.9 | **2.9.11** | 🟡 2 patch | ✅ Yes | Consider `psycopg[binary]` (v3) for async |
| `pymongo` | ≥4.6.0 | **4.16.0** | 🟡 10 minor | ✅ Yes | Stable API, type hints |
| `ariadne` | ≥0.21.0 | **1.0.1** | 🔴 1 major | ✅ Yes | Major: stable API, extensions |
| `reportlab` | ≥4.2.0 | **4.4.10** | 🟡 2 minor | ✅ Yes | Bug fixes |
| `rich` | ≥13.7.0 | **15.0.0** | 🔴 2 major | ✅ Yes | Major: new table styles, tree widget |
| `typer` | ≥0.12.5 | **0.24.1** | 🟡 12 minor | ✅ Yes | New features, click 8.x support |
| `aiohttp` | ≥3.9.0 | **3.13.5** | 🟡 4 minor | ✅ Yes | Security fixes, performance |
| `requests` | ≥2.31.0 | **2.33.1** | 🟡 2 minor | ✅ Yes | Security patches |
| `python-dotenv` | ≥1.0.0 | **1.2.2** | 🟡 2 minor | ✅ Yes | New features |
| `casbin` | ≥1.36.0 | **1.43.0** | 🟡 7 minor | ✅ Yes | New enforcer features |
| `pyotp` | ≥2.9.0 | **2.9.0** | ✅ Latest | — | Stable |
| `jinja2` | ≥3.1.0 | **3.1.6** | 🟡 6 patch | ✅ Yes | Security fixes |
| `slowapi` | ≥0.1.9 | **0.1.9** | ✅ Latest | — | Stable |
| `asyncssh` | ≥2.15.0 | **2.22.0** | 🟡 7 minor | ✅ Yes | New algorithms, security |
| `textual` | ≥0.44.0 | **8.2.3** | 🔴 Major | ✅ Yes | Major rewrite with new widget system |
| `kombu` | ≥5.3.4 | **5.6.2** | 🟡 3 minor | ✅ Yes | New transports, bug fixes |
| `apscheduler` | ≥3.10.0 | **3.11.2** | 🟡 1 minor | ✅ Yes | Consider APScheduler 4.x (async-native) |
| `aioredis` | ≥2.0.1 | **2.0.1** | 🔴 DEPRECATED | ❌ Replace | **Merged into `redis` package ≥4.2.0** |
| `scikit-learn` | (any) | **1.8.0** | 🟡 | ✅ Yes | New estimators, performance |
| `pandas` | (any) | **3.0.2** | 🟡 | ✅ Yes | Arrow backend, Copy-on-Write |
| `python-docx` | ≥1.1.2 | **1.2.0** | 🟡 1 minor | ✅ Yes | New features |
| `marshmallow` | ≥3.20.0 | **4.3.0** | 🔴 1 major | ✅ Yes | Major: new validation API |
| `hvac` | ≥1.2.0 | **2.4.0** | 🔴 1 major | ✅ Yes | Major: new client API |
| `cyclonedx-bom` | ≥4.1.0 | **7.3.0** | 🔴 3 major | ✅ Yes | Major API changes |
| `anyio` | ≥4.0.0 | **4.13.0** | 🟡 13 minor | ✅ Yes | New features, bug fixes |
| `websockets` | ≥12 | **16.0** | 🟡 4 minor | ✅ Yes | New connection API |
| `aiofiles` | ≥23.0 | **25.1.0** | 🟡 2 minor | ✅ Yes | Python 3.13 support |
| `fuzzywuzzy` | (any) | **0.18.0** | 🔴 DEPRECATED | ❌ Replace | **Use `thefuzz` instead** (same API, maintained) |
| `trio` | ≥0.23.0 | **0.33.0** | 🟡 10 minor | ✅ Yes | Structured concurrency improvements |
| `simplejson` | ≥3.19.0 | **3.20.2** | 🟡 1 minor | ✅ Yes | Performance |
| `pyyaml` | ≥6.0 | **6.0.3** | 🟡 3 patch | ✅ Yes | Security fixes |
| `python-multipart` | (any) | **0.0.26** | 🟡 | ✅ Yes | Security fixes |

### Dev Dependencies

| Package | Min Required | Latest Available | Gap | Upgradeable? |
|---------|-------------|-----------------|-----|-------------|
| `pytest` | ≥8.3.0 | **9.0.3** | 🟠 1 major | ✅ Yes |
| `pytest-cov` | ≥5.0.0 / ≥4.1.0 | **7.1.0** | 🟠 2-3 major | ✅ Yes |
| `pytest-asyncio` | ≥0.20.0 | **1.3.0** | 🔴 1 major | ✅ Yes |
| `ruff` | ≥0.4.0 | **0.15.10** | 🟡 11 minor | ✅ Yes |
| `mypy` | ≥1.11.2 / ≥1.7.0 | **1.20.1** | 🟡 9 minor | ✅ Yes |

---

## 3. JavaScript / TypeScript Dependencies

### Frontend (frontend/package.json)

| Package | Required | Latest Available | Gap | Upgradeable? | Notes |
|---------|----------|-----------------|-----|-------------|-------|
| `react` | ^19.0.0 | **19.2.5** | 🟡 2 minor | ✅ Yes | Compiler, Actions API |
| `react-dom` | ^19.0.0 | **19.2.5** | 🟡 2 minor | ✅ Yes | Follows React |
| `react-router-dom` | ^6.30.1 | **7.14.1** | 🔴 1 major | ⚠️ Breaking | Major: data router API, loader/action pattern |
| `@tanstack/react-query` | ^5.90.5 | **5.99.0** | 🟡 9 minor | ✅ Yes | New prefetch features |
| `axios` | ^1.15.0 | **1.15.0** | ✅ Latest | — | Stable |
| `zustand` | ^5.0.0 | **5.0.12** | 🟡 12 patch | ✅ Yes | Bug fixes |
| `clsx` | ^2.1.1 | **2.1.1** | ✅ Latest | — | Stable |
| `tailwind-merge` | ^2.5.2 | **3.5.0** | 🔴 1 major | ✅ Yes | Major: new merge strategy |
| `lucide-react` | ^0.542.0 | **1.8.0** | 🔴 1 major | ✅ Yes | Stable release, tree-shaking improvements |
| `typescript` | ^5.9.2 | **6.0.2** | 🔴 1 major | ⚠️ Check | Major: new type features (check compat) |
| `vite` | ^8.0.8 | **8.0.8** | ✅ Latest | — | Current |
| `tailwindcss` | ^4.1.14 | **4.2.2** | 🟡 1 minor | ✅ Yes | New utilities |
| `vitest` | ^4.1.4 | **4.1.4** | ✅ Latest | — | Current |
| `@playwright/test` | ^1.47.2 | **1.59.1** | 🟡 12 minor | ✅ Yes | New browser versions, APIs |
| `@testing-library/react` | ^16.1.0 | **16.3.2** | 🟡 2 minor | ✅ Yes | React 19 improvements |
| `@testing-library/jest-dom` | ^6.6.3 | **6.9.1** | 🟡 3 minor | ✅ Yes | New matchers |
| `jsdom` | ^25.0.0 | **29.0.2** | 🔴 4 major | ✅ Yes | Major: new Web API support |
| `postcss` | ^8.4.47 | **8.5.9** | 🟡 1 minor | ✅ Yes | Bug fixes |
| `@vitejs/plugin-react` | ^5.0.0 | **6.0.1** | 🔴 1 major | ✅ Yes | React Compiler support |

### TypeScript SDK (sdk/typescript/package.json)

| Package | Required | Latest Available | Gap | Notes |
|---------|----------|-----------------|-----|-------|
| `typescript` | ^5.4.0 | **6.0.2** | 🔴 1 major | Outdated compared to frontend |
| `vitest` | ^1.6.0 | **4.1.4** | 🔴 3 major | Very outdated |

---

## 4. Go Dependencies

| Module | Current Version | Latest Stable | Gap | Upgradeable? | Notes |
|--------|----------------|--------------|-----|-------------|-------|
| Go language | 1.22 | **1.24** | 🟡 2 minor | ✅ Yes | New range-over-func, improved generics |
| No external deps | — | — | — | — | Pure stdlib only |

---

## 5. Docker Base Images

| Image | Current | Latest Stable | Gap | Upgradeable? | Notes |
|-------|---------|--------------|-----|-------------|-------|
| `python:3.13-slim` | 3.13 | **3.13** | ✅ Latest | — | Current stable |
| `python:3.12-slim` | 3.12 | **3.13** | 🟡 1 minor | ✅ Yes | ⚠️ notification_service only — should match others |
| `node:20-alpine` | 20 LTS | **24 Current / 22 LTS** | 🟡 2-4 minor | ✅ Yes | 22 is current LTS, 24 is current |

---

## 6. Infrastructure Service Images

| Service | Current Image | Latest Available | Gap | Upgradeable? | Notes |
|---------|--------------|-----------------|-----|-------------|-------|
| **Traefik** | `v3.1` | **v3.4** | 🟡 3 minor | ✅ Yes | New middleware, WebSocket improvements |
| **Consul** | `1.20` | **1.20** | ✅ Latest | — | Current |
| **PostgreSQL** | `16-alpine` | **17-alpine** | 🟡 1 major | ✅ Yes | JSON improvements, logical replication, MERGE |
| **Redis** | `7-alpine` | **8-alpine** | 🟡 1 major | ⚠️ Check | Redis 8: new data types, vector search (check licensing) |
| **MongoDB** | `7` (Community) | **8.0** | 🟡 1 major | ✅ Yes | Queryable encryption, column store |
| **Elasticsearch** | `8.11.0` | **8.18.x** | 🟡 7 minor | ✅ Yes | New ML features, improved search |
| **RabbitMQ** | `3-management-alpine` | **4.1.x** | 🔴 1 major | ⚠️ Check | Major: Khepri metadata store, AMQP 1.0 |
| **Prometheus** | `v2.51.0` | **v3.5.x** | 🔴 1 major | ⚠️ Check | Major: new OTLP ingest, UTF-8 metric names |
| **Grafana** | `10.4.2` | **11.6.x** | 🔴 1 major | ✅ Yes | New dashboards, alerting, Scenes framework |
| **Loki** | `2.9.7` | **3.5.x** | 🔴 1 major | ✅ Yes | Major: OTLP native, bloom filters |
| **Node (frontend)** | `20-alpine` | **22-alpine** / **24** | 🟡 2+ | ✅ Yes | Should match CI (Node 24) |

---

## 7. GitHub Actions

| Action | Current | Latest | Gap | Upgradeable? | Notes |
|--------|---------|--------|-----|-------------|-------|
| `actions/checkout` | v5 | **v5** | ✅ Latest | — | |
| `actions/setup-python` | v6 | **v6** | ✅ Latest | — | |
| `actions/setup-node` | v5 | **v5** | ✅ Latest | — | |
| `github/codeql-action/*` | v4 | **v4** | ✅ Latest | — | |
| `aquasecurity/trivy-action` | v0.35.0 | **v0.35.0** | ✅ Latest | — | Check for newer versions |
| `github/codeql-action/upload-sarif` | v3 | **v4** | 🟡 1 major | ✅ Yes | Should match codeql-action version |
| `pypa/gh-action-pypi-publish` | release/v1 | **release/v1** | ✅ Latest | — | |

---

## 8. Pre-commit Hooks

| Hook | Current Rev | Latest Rev | Gap | Upgradeable? |
|------|------------|------------|-----|-------------|
| `ruff-pre-commit` | v0.4.4 | **v0.15.10** | 🟡 11 minor | ✅ Yes |
| `mirrors-mypy` | v1.11.2 | **v1.20.1** | 🟡 9 minor | ✅ Yes |

---

## 9. Runtime Environments

| Runtime | Used in CI/Docker | Current Available | Gap | Notes |
|---------|-------------------|-------------------|-----|-------|
| **Python** | 3.13 (CI + Docker) | 3.13 | ✅ Latest stable | 3.14 in beta (Oct 2026 release) |
| **Node.js** | 24 (CI) / 20 (Docker) | 24 (Current) / 22 (LTS) | ⚠️ Mismatch | Docker should use 22 LTS or 24 |
| **Go** | 1.22 (go.mod) | 1.24 | 🟡 2 minor | Upgrade in go.mod |

---

## 10. Deprecated / End-of-Life Packages

These packages **must** be replaced:

### 🔴 `aioredis` (≥2.0.1) — **DEPRECATED**
- **Status**: Merged into the official `redis` package since `redis>=4.2.0`
- **Current**: The project already requires `redis>=5.0.0` which includes all aioredis functionality
- **Action**: Remove `aioredis` from `requirements.txt`. Replace all `import aioredis` with `import redis.asyncio as aioredis` (drop-in compatible)
- **Fallback**: Not needed — `redis.asyncio` is the official successor and is already installed
- **File**: `requirements.txt`

### 🔴 `opentelemetry-exporter-jaeger` (≥1.20.0) — **DEPRECATED**
- **Status**: Deprecated since OTel SDK 1.21.0. Jaeger now natively supports OTLP
- **Action**: Replace with `opentelemetry-exporter-otlp-proto-grpc` or `opentelemetry-exporter-otlp-proto-http`
- **Fallback**: Keep Jaeger as tracing backend but switch to OTLP protocol (Jaeger supports OTLP natively since v1.35)
- **File**: `pyproject.toml`, `requirements.txt`, `services/common/observability.py`

### 🔴 `fuzzywuzzy` — **DEPRECATED**
- **Status**: Unmaintained. Replaced by `thefuzz` (same API, same author, actively maintained)
- **Action**: `pip install thefuzz` and change `from fuzzywuzzy import fuzz` → `from thefuzz import fuzz`
- **Fallback**: Not needed — API-identical replacement
- **File**: `requirements.txt`

---

## 11. Upgrade Recommendations

### 🔴 Priority 1 — Security & Deprecated (Do Immediately)

| Package | Action | Effort | Risk |
|---------|--------|--------|------|
| `aioredis` | Remove, use `redis.asyncio` | 🟢 Low | 🟢 None |
| `opentelemetry-exporter-jaeger` | Switch to OTLP exporter | 🟡 Medium | 🟢 Low |
| `fuzzywuzzy` | Replace with `thefuzz` | 🟢 Low | 🟢 None |
| `cryptography` | Bump ≥41 → ≥46 | 🟢 Low | 🟢 Low |
| `jinja2` | Bump ≥3.1.0 → ≥3.1.6 | 🟢 Low | 🟢 None |
| `pyyaml` | Bump ≥6.0 → ≥6.0.3 | 🟢 Low | 🟢 None |
| `python-multipart` | Pin to ≥0.0.20 | 🟢 Low | 🟢 None |
| `python:3.12-slim` (notification) | Change to `python:3.13-slim` | 🟢 Low | 🟢 None |

### 🟠 Priority 2 — Major Version Upgrades (Plan Carefully)

| Package | From → To | Breaking Changes | Migration Guide |
|---------|----------|-----------------|----------------|
| `openai` | 1.x → 2.x | New client API, streaming changes | [OpenAI Migration](https://github.com/openai/openai-python/discussions/742) |
| `langchain` | 0.3 → 1.x | LCEL default, deprecations removed | [LangChain 1.0 Migration](https://python.langchain.com/docs/versions/v0_3/) |
| `sentry-sdk` | 1.x → 2.x | New init API, auto-instrumentation | [Sentry Migration](https://docs.sentry.io/platforms/python/migration/1.x-to-2.x/) |
| `marshmallow` | 3.x → 4.x | Schema class changes | [Marshmallow 4 Changelog](https://marshmallow.readthedocs.io/en/stable/changelog.html) |
| `rich` | 13.x → 15.x | Some removed APIs | Check deprecation warnings |
| `react-router-dom` | 6.x → 7.x | Data router mandatory | [React Router v7 Guide](https://reactrouter.com/upgrading/v6) |
| `typescript` | 5.x → 6.x | Stricter checks | Run `tsc --noEmit` after upgrade |

### 🟡 Priority 3 — Minor Upgrades (Safe, Do in Batches)

All packages with 🟡 gap in the tables above can be upgraded by bumping their minimum version in `pyproject.toml` / `requirements.txt` / `package.json`. These are backward-compatible.

**Recommended batch approach:**
1. Bump all Python minor versions in `requirements.txt`
2. Run `pip install -r requirements.txt && pytest tests/ -v`
3. Bump all npm minor versions: `cd frontend && npx npm-check-updates -u --target minor && npm install`
4. Run `cd frontend && npx tsc --noEmit && npm run build && npm run test`

### 🔵 Priority 4 — Infrastructure Image Upgrades (Schedule Maintenance)

| Image | Current → Target | Notes |
|-------|-----------------|-------|
| PostgreSQL | 16 → **17** | Test with Alembic migrations first |
| Traefik | v3.1 → **v3.4** | Check middleware compatibility |
| Grafana | 10.4 → **11.x** | Dashboard JSON may need migration |
| Loki | 2.9 → **3.x** | Breaking: new storage format |
| Node (Docker) | 20 → **22 LTS** | Match CI Node version |
| Elasticsearch | 8.11 → **8.18** | Rolling upgrade supported |

---

## 12. Non-Upgradeable Items & Reasons

| Item | Current | Latest | Why Not Upgradeable |
|------|---------|--------|-------------------|
| `passlib` | 1.7.4 | 1.7.4 | Already at latest. Package is in maintenance mode. Consider adding `argon2-cffi` alongside for new password hashing (keep passlib for bcrypt backward compat as fallback) |
| `slowapi` | 0.1.9 | 0.1.9 | Already at latest. Small focused package, stable |
| `pyotp` | 2.9.0 | 2.9.0 | Already at latest |
| `aioredis` | 2.0.1 | 2.0.1 | Cannot upgrade — deprecated. Must replace (see §10) |
| `RabbitMQ` | 3.x | 4.x | RabbitMQ 4.x introduces Khepri metadata store which changes clustering behavior. Upgrade only after thorough testing with Celery/Kombu compatibility. **Recommendation**: Stay on 3.x until Celery officially supports RabbitMQ 4.x |
| `Prometheus` | v2.51 | v3.x | Prometheus 3.x changes remote write protocol and metric naming. Wait for Grafana ecosystem full support before upgrading |
| `Redis` | 7 | 8 | Redis 8 uses SSPL license for some modules. Evaluate license implications. Alternatively consider **Valkey** (open-source Redis fork) |

---

## Appendix: Version Comparison Quick Reference

### Notation
- ✅ = At latest or within latest range
- 🟡 = Minor/patch upgrade available (safe)
- 🟠 = Multiple minor versions behind
- 🔴 = Major version behind or deprecated
- ⚠️ = Check before upgrading (breaking changes possible)

### Files That Need Changes

| File | Changes Needed |
|------|---------------|
| `pyproject.toml` | Bump 35+ version floors, remove `opentelemetry-exporter-jaeger` |
| `requirements.txt` | Bump 40+ versions, remove `aioredis`, replace `fuzzywuzzy` with `thefuzz` |
| `frontend/package.json` | Bump 14 packages (careful with react-router-dom v7, TypeScript 6) |
| `sdk/typescript/package.json` | Bump TypeScript 5→6, vitest 1→4 |
| `sdk/go/go.mod` | Bump Go 1.22 → 1.24 |
| `docker-compose.yml` | Bump 9 service images |
| `services/notification_service/Dockerfile` | Change `python:3.12-slim` → `python:3.13-slim` |
| `.pre-commit-config.yaml` | Bump ruff v0.4.4→v0.15.10, mypy v1.11.2→v1.20.1 |
| `services/common/observability.py` | Replace Jaeger exporter with OTLP exporter |
| `.github/workflows/security-scan.yml` | Bump `codeql-action/upload-sarif` v3 → v4 |

---

*This report was generated by scanning all dependency specification files in the CosmicSec repository and comparing against the latest available versions on PyPI, npm, Docker Hub, and GitHub.*
