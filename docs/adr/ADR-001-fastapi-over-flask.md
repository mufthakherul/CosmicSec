# ADR-001: Why FastAPI (vs Flask, Django)

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: CosmicSec Platform Team

## Context

CosmicSec requires a Python web framework to power 12+ microservices handling security scanning, AI analysis, real-time collaboration, and high-throughput data ingestion.

## Decision

We chose **FastAPI** as the web framework for all Python microservices.

## Rationale

| Criterion | FastAPI | Flask | Django |
|-----------|---------|-------|--------|
| **Async support** | ✅ Native `async/await` | ⚠️ Requires extensions | ⚠️ Partial (ASGI channels) |
| **Auto API docs** | ✅ OpenAPI + Swagger built-in | ❌ Requires flask-swagger | ❌ Requires drf-yasg |
| **Type safety** | ✅ Pydantic v2 validation | ❌ Manual validation | ⚠️ Serializer-based |
| **Performance** | ✅ Comparable to Node.js | ⚠️ WSGI-limited | ⚠️ WSGI-limited |
| **Dependency injection** | ✅ Built-in `Depends()` | ❌ Manual | ⚠️ Django DI patterns |
| **WebSocket support** | ✅ Native | ⚠️ flask-socketio | ⚠️ channels |
| **Startup speed** | ✅ Fast (no ORM overhead) | ✅ Fast | ⚠️ Slow (full stack load) |

## Consequences

- **Positive**: All 12 services share identical patterns; rapid development; auto-generated OpenAPI docs
- **Positive**: Native async enables efficient I/O for DB, Redis, external APIs
- **Positive**: Pydantic models serve as both API contracts and internal data classes
- **Negative**: Team must learn async Python patterns (e.g., avoiding blocking calls in async handlers)
- **Mitigation**: Linting rules (no blocking I/O in async functions via asyncio-linter)
