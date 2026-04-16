# Runbook: Database Migration

**Audience**: Platform engineers, backend developers  
**Last updated**: 2026-04-16

---

## Overview

CosmicSec uses **Alembic** to manage PostgreSQL schema migrations. All schema
changes must be applied via Alembic — never via raw SQL in production.

---

## Prerequisites

```bash
# Confirm DATABASE_URL is set
echo $DATABASE_URL
# Should be: postgresql://cosmicsec:password@localhost:5432/cosmicsec

# Verify Alembic is installed
python -m alembic --version
```

---

## Check Migration Status

```bash
# Show current revision applied to the DB
python -m alembic current

# Show pending migrations (revisions not yet applied)
python -m alembic history --verbose
```

---

## Apply Pending Migrations

```bash
# 1. Take a DB backup first (see below)
# 2. Apply all pending migrations
python -m alembic upgrade head

# Confirm
python -m alembic current
```

---

## Rollback a Migration

```bash
# Rollback by one step
python -m alembic downgrade -1

# Rollback to a specific revision
python -m alembic downgrade 0003_phase_l_persistence
```

---

## Create a New Migration

```bash
# Auto-generate from model changes
python -m alembic revision --autogenerate -m "describe change here"

# Manually create empty migration
python -m alembic revision -m "describe change here"
```

> ⚠️ Always review auto-generated migration files before applying.
> Auto-generate misses: dropped columns, renamed tables, index changes.

---

## Database Backup (Before Major Migrations)

```bash
# Backup full DB
pg_dump $DATABASE_URL > backups/cosmicsec_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backups/cosmicsec_YYYYMMDD_HHMMSS.sql
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Target database is not up to date` | Pending migrations | Run `alembic upgrade head` |
| `Can't locate revision` | Missing migration file | Ensure file exists in `alembic/versions/` |
| `Column already exists` | Migration run twice | Investigate alembic_version table |
| Migration fails halfway | DB constraint or syntax | Fix migration, restore backup, re-apply |

---

## Alembic Version Table

Alembic tracks the current revision in the `alembic_version` table:

```sql
SELECT * FROM alembic_version;
```

---

## CI Check

In CI the migration check is:

```bash
python -m alembic check  # exits 1 if unapplied migrations exist
```

See `.github/workflows/test.yml` for integration.
