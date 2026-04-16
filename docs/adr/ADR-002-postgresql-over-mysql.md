# ADR-002: Why PostgreSQL (vs MySQL, CockroachDB)

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: CosmicSec Platform Team

## Context

CosmicSec stores: users, scans, findings, audit logs, AI analysis results, plugin metadata, and organization data. We need a reliable RDBMS with full ACID compliance, JSON support, and good Python ORM ecosystem.

## Decision

We chose **PostgreSQL 16** as the primary relational database.

## Rationale

| Feature | PostgreSQL | MySQL 8 | CockroachDB |
|---------|-----------|---------|-------------|
| **JSONB with indexing** | ✅ Excellent | ⚠️ Limited | ⚠️ Limited |
| **Full-text search** | ✅ Built-in `tsvector` | ⚠️ Limited | ❌ |
| **pg_trgm similarity** | ✅ Native | ❌ | ❌ |
| **Alembic migrations** | ✅ First-class | ✅ Supported | ⚠️ Partial |
| **Window functions** | ✅ Complete | ✅ (8.0+) | ✅ |
| **Partitioning** | ✅ Declarative | ⚠️ Limited | ✅ |
| **Operational cost** | ✅ Open source | ✅ Open source | 💰 Enterprise $$ |

## Specific Features Used

- **JSONB**: Stores per-organization settings, finding extras, plugin metadata
- **pg_trgm**: Powers fuzzy search on findings when vector store unavailable
- **Materialized views**: Pre-compute dashboard aggregates (Phase S.2)
- **Table partitioning**: Findings and audit_logs partitioned by month (Phase S.2)

## Consequences

- **Positive**: Rich query capabilities reduce application-layer complexity
- **Positive**: pgvector extension enables in-database vector similarity search (future)
- **Negative**: Heavier than SQLite for development; mitigated by SQLite fallback in `services/common/db.py`
