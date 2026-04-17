"""
Plugin Repository — SQLAlchemy CRUD layer for marketplace, ratings, and
community repositories.

Provides DB persistence with an in-memory read-through cache (5-minute TTL).
The database is the source of truth; the cache accelerates reads.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from services.common.models import PluginMarketplaceModel, PluginRatingModel, PluginRepositoryModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simple in-memory read-through cache with TTL
# ---------------------------------------------------------------------------

_CACHE_TTL = 300  # 5 minutes


class _TTLCache:
    """Tiny TTL cache — invalidated on write, expires after *ttl* seconds."""

    def __init__(self, ttl: int = _CACHE_TTL) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._ttl = ttl

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        ts, value = entry
        if time.time() - ts > self._ttl:
            del self._store[key]
            return None
        return value

    def put(self, key: str, value: Any) -> None:
        self._store[key] = (time.time(), value)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()


_mp_cache = _TTLCache()
_repo_cache = _TTLCache()

# ---------------------------------------------------------------------------
# Marketplace CRUD
# ---------------------------------------------------------------------------


def _mp_to_dict(row: PluginMarketplaceModel) -> dict[str, Any]:
    return {
        "name": row.name,
        "version": row.version,
        "description": row.description,
        "author": row.author,
        "tags": row.tags or [],
        "download_url": row.download_url,
        "checksum_sha256": row.checksum_sha256,
        "published_at": row.created_at.isoformat() if row.created_at else None,
        "listing_id": row.id,
        "source_repo": row.source_repo,
    }


def create_marketplace_entry(db: Session, entry: dict[str, Any]) -> dict[str, Any]:
    listing_id = entry.get("listing_id") or f"mp-{uuid.uuid4().hex[:10]}"
    row = PluginMarketplaceModel(
        id=listing_id,
        name=entry["name"],
        version=entry.get("version", "0.0.0"),
        description=entry.get("description", ""),
        author=entry.get("author", "unknown"),
        tags=entry.get("tags", []),
        download_url=entry.get("download_url", ""),
        checksum_sha256=entry.get("checksum_sha256", ""),
        downloads=entry.get("downloads", 0),
        source_repo=entry.get("source_repo"),
    )
    # Upsert by name
    existing = (
        db.query(PluginMarketplaceModel)
        .filter(PluginMarketplaceModel.name == entry["name"])
        .first()
    )
    if existing:
        existing.version = row.version
        existing.description = row.description
        existing.author = row.author
        existing.tags = row.tags
        existing.download_url = row.download_url
        existing.checksum_sha256 = row.checksum_sha256
        existing.source_repo = row.source_repo
        db.commit()
        db.refresh(existing)
        result = _mp_to_dict(existing)
    else:
        db.add(row)
        db.commit()
        db.refresh(row)
        result = _mp_to_dict(row)

    _mp_cache.invalidate("list")
    _mp_cache.put(f"name:{entry['name']}", result)
    return result


def get_marketplace_entry(db: Session, name: str) -> dict[str, Any] | None:
    cached = _mp_cache.get(f"name:{name}")
    if cached is not None:
        return cached
    row = db.query(PluginMarketplaceModel).filter(PluginMarketplaceModel.name == name).first()
    if row is None:
        return None
    result = _mp_to_dict(row)
    _mp_cache.put(f"name:{name}", result)
    return result


def list_marketplace(
    db: Session,
    *,
    tag: str | None = None,
    author: str | None = None,
) -> list[dict[str, Any]]:
    query = db.query(PluginMarketplaceModel)
    if author:
        query = query.filter(PluginMarketplaceModel.author == author)
    rows = query.order_by(PluginMarketplaceModel.created_at.desc()).all()
    results = [_mp_to_dict(r) for r in rows]
    if tag:
        results = [r for r in results if tag in r.get("tags", [])]
    return results


# ---------------------------------------------------------------------------
# Ratings CRUD
# ---------------------------------------------------------------------------


def _rating_to_dict(row: PluginRatingModel) -> dict[str, Any]:
    return {
        "user": row.user_id,
        "rating": row.rating,
        "review": row.comment,
        "ts": row.created_at.isoformat() if row.created_at else None,
    }


def upsert_rating(
    db: Session, plugin_name: str, user: str, rating: int, review: str | None = None
) -> dict[str, Any]:
    # Find plugin id
    plugin = (
        db.query(PluginMarketplaceModel).filter(PluginMarketplaceModel.name == plugin_name).first()
    )
    plugin_id = plugin.id if plugin else plugin_name

    existing = (
        db.query(PluginRatingModel)
        .filter(PluginRatingModel.plugin_id == plugin_id, PluginRatingModel.user_id == user)
        .first()
    )
    if existing:
        existing.rating = rating
        existing.comment = review
        db.commit()
        db.refresh(existing)
        return _rating_to_dict(existing)

    row = PluginRatingModel(
        id=f"rate-{uuid.uuid4().hex[:10]}",
        plugin_id=plugin_id,
        user_id=user,
        rating=rating,
        comment=review,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _rating_to_dict(row)


def get_ratings(db: Session, plugin_name: str) -> list[dict[str, Any]]:
    plugin = (
        db.query(PluginMarketplaceModel).filter(PluginMarketplaceModel.name == plugin_name).first()
    )
    plugin_id = plugin.id if plugin else plugin_name
    rows = (
        db.query(PluginRatingModel)
        .filter(PluginRatingModel.plugin_id == plugin_id)
        .order_by(PluginRatingModel.created_at.desc())
        .all()
    )
    return [_rating_to_dict(r) for r in rows]


def avg_rating(db: Session, plugin_name: str) -> float:
    ratings = get_ratings(db, plugin_name)
    if not ratings:
        return 0.0
    return round(sum(r["rating"] for r in ratings) / len(ratings), 2)


# ---------------------------------------------------------------------------
# Repository CRUD
# ---------------------------------------------------------------------------


def _repo_to_dict(row: PluginRepositoryModel) -> dict[str, Any]:
    return {
        "repo_id": row.id,
        "name": row.name,
        "index_url": row.index_url,
        "trust_level": row.trust_level,
        "enabled": row.enabled,
        "registered_at": row.created_at.isoformat() if row.created_at else None,
        "last_sync": row.last_sync.isoformat() if row.last_sync else None,
        "imported_count": row.imported_count or 0,
    }


def create_repository(db: Session, data: dict[str, Any]) -> dict[str, Any]:
    row = PluginRepositoryModel(
        id=data["repo_id"],
        name=data["name"],
        index_url=data["index_url"],
        trust_level=data.get("trust_level", "community"),
        enabled=data.get("enabled", True),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _repo_cache.clear()
    return _repo_to_dict(row)


def get_repository(db: Session, repo_id: str) -> dict[str, Any] | None:
    cached = _repo_cache.get(f"repo:{repo_id}")
    if cached is not None:
        return cached
    row = db.query(PluginRepositoryModel).filter(PluginRepositoryModel.id == repo_id).first()
    if row is None:
        return None
    result = _repo_to_dict(row)
    _repo_cache.put(f"repo:{repo_id}", result)
    return result


def list_repositories(db: Session) -> list[dict[str, Any]]:
    rows = db.query(PluginRepositoryModel).all()
    return [_repo_to_dict(r) for r in rows]


def update_repository_sync(db: Session, repo_id: str, imported_count: int) -> dict[str, Any] | None:
    row = db.query(PluginRepositoryModel).filter(PluginRepositoryModel.id == repo_id).first()
    if row is None:
        return None
    row.last_sync = datetime.now(UTC)
    row.imported_count = imported_count
    db.commit()
    db.refresh(row)
    _repo_cache.invalidate(f"repo:{repo_id}")
    return _repo_to_dict(row)
