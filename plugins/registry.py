"""
Plugin Registry — FastAPI service for managing installed plugins.

Mounts as a sub-application or standalone at port 8007.
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from services.common.db import SessionLocal

from .db_repository import (
    avg_rating as db_avg_rating,
)
from .db_repository import (
    create_marketplace_entry,
    update_repository_sync,
    upsert_rating,
)
from .db_repository import (
    create_repository as db_create_repository,
)
from .db_repository import (
    get_ratings as db_get_ratings,
)
from .db_repository import (
    get_repository as db_get_repository,
)
from .db_repository import (
    list_marketplace as db_list_marketplace,
)
from .db_repository import (
    list_repositories as db_list_repositories,
)
from .sdk.base import PluginContext
from .sdk.loader import PluginLoader

logger = logging.getLogger(__name__)

app = FastAPI(
    title="CosmicSec Plugin Registry",
    description="Phase 2 — Plugin management API for the CosmicSec plugin SDK",
    version="1.0.0",
)

_DEFAULT_PLUGIN_DIRS = ":".join(
    [
        str(Path(__file__).resolve().parent / "official"),
        "/opt/cosmicsec/plugins",
    ]
)
_PLUGIN_DIRS = os.getenv("COSMICSEC_PLUGIN_DIRS", _DEFAULT_PLUGIN_DIRS).split(":")
_loader = PluginLoader(plugin_dirs=_PLUGIN_DIRS)
# Discover at startup
_loader.discover()


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------


class RunPluginRequest(BaseModel):
    target: str = Field(..., description="Target to pass to the plugin context")
    options: dict[str, Any] = Field(default_factory=dict)
    scan_id: str | None = None
    user: str | None = None
    config: dict[str, Any] | None = None
    granted_permissions: list[str] = Field(
        default_factory=list,
        description="Permissions granted by caller context, e.g. ['scan:read','findings:write']",
    )


class PublishPluginRequest(BaseModel):
    name: str = Field(..., description="Plugin name (unique identifier)")
    version: str = Field(..., description="Semantic version, e.g. 1.2.0")
    description: str = Field(...)
    author: str = Field(...)
    tags: list[str] = Field(default_factory=list)
    download_url: str = Field(..., description="HTTPS URL to the plugin .py file")
    checksum_sha256: str = Field(..., description="SHA-256 hex digest used to verify the download")


class RatePluginRequest(BaseModel):
    user: str = Field(..., description="Username submitting the rating")
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")
    review: str | None = Field(default=None, description="Optional text review")


class RegisterRepositoryRequest(BaseModel):
    repo_id: str = Field(..., description="Unique repository ID")
    name: str = Field(..., description="Display name")
    index_url: str = Field(..., description="HTTPS URL to JSON plugin index")
    trust_level: str = Field(default="community", description="community | verified | official")
    enabled: bool = True


# ---------------------------------------------------------------------------
# Marketplace / community repository state (replace with DB in production)
# ---------------------------------------------------------------------------

# _marketplace[name] = {name, version, description, author, tags, download_url,
#                        checksum_sha256, published_at, listing_id, source_repo}
_marketplace: dict[str, dict[str, Any]] = {}
# _ratings[name] = list of {user, rating, review, ts}
_ratings: dict[str, list[dict[str, Any]]] = {}
# _repositories[repo_id] = {repo metadata + last_sync + imported_count}
_repositories: dict[str, dict[str, Any]] = {}
# _audit_log = ordered list of plugin trust and lifecycle events
_audit_log: list[dict[str, Any]] = []


def _is_truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _scope_audit_entries(entries: list[dict[str, Any]], viewer: str, is_admin: bool) -> list[dict[str, Any]]:
    if is_admin:
        return entries
    if not viewer:
        return [entry for entry in entries if (entry.get("actor_role") or "system") == "system"]

    scoped: list[dict[str, Any]] = []
    for entry in entries:
        actor = str(entry.get("actor") or "").strip().lower()
        actor_role = str(entry.get("actor_role") or "system").strip().lower()
        if actor == viewer.lower() or actor_role == "system":
            scoped.append(entry)
    return scoped


def _append_audit(
    action: str,
    plugin: str,
    detail: str,
    status: str = "ok",
    actor: str = "system",
    actor_role: str = "system",
    context: dict[str, Any] | None = None,
) -> None:
    _audit_log.append(
        {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "plugin": plugin,
            "detail": detail,
            "status": status,
            "actor": actor,
            "actor_role": actor_role,
            "context": context or {},
        }
    )
    del _audit_log[:-200]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict:
    return {
        "status": "healthy",
        "service": "plugins",
        "registered_plugins": len(_loader.list_plugins()),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/plugins")
async def list_plugins() -> dict:
    return {"plugins": _loader.list_plugins()}


@app.get("/plugins/audit")
async def plugin_audit(request: Request, limit: int = 50) -> dict:
    limit = max(1, min(limit, 200))
    items = list(reversed(_audit_log[-limit:]))
    viewer = request.headers.get("X-CosmicSec-Viewer", "")
    is_admin = _is_truthy(request.headers.get("X-CosmicSec-Viewer-Admin", "false"))
    scoped = _scope_audit_entries(items, viewer=viewer, is_admin=is_admin)
    return {"items": scoped, "total": len(scoped), "scope": "admin" if is_admin else "role"}


@app.get("/plugins/{name}")
async def get_plugin(name: str) -> dict:
    meta = _loader.get_metadata(name)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    return {
        "name": meta.name,
        "version": meta.version,
        "description": meta.description,
        "author": meta.author,
        "tags": meta.tags,
        "permissions": meta.permissions,
    }


@app.post("/plugins/{name}/run")
async def run_plugin(request: Request, name: str, payload: RunPluginRequest) -> dict:
    ctx = PluginContext(
        target=payload.target,
        options=payload.options,
        scan_id=payload.scan_id,
        user=payload.user,
    )
    run_config = dict(payload.config or {})
    run_config["granted_permissions"] = payload.granted_permissions
    result = _loader.run(name, ctx, config=run_config)
    actor = request.headers.get("X-CosmicSec-Actor", payload.user or "system")
    actor_role = request.headers.get("X-CosmicSec-Actor-Role", "operator")
    _append_audit(
        "run",
        name,
        f"target={payload.target} scan_id={payload.scan_id or 'n/a'} success={result.success}",
        "ok" if result.success else "warn",
        actor=actor,
        actor_role=actor_role,
        context={
            "target": payload.target,
            "scan_id": payload.scan_id,
            "success": result.success,
        },
    )
    return {
        "plugin": name,
        "success": result.success,
        "data": result.data,
        "findings": result.findings,
        "errors": result.errors,
        "metadata": result.metadata,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/plugins/{name}/trust")
async def plugin_trust(name: str) -> dict:
    """Return signature and permission trust profile for a plugin."""
    meta = _loader.get_metadata(name)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    signature = _loader.signature_status(name)
    return {
        "plugin": name,
        "required_permissions": meta.permissions,
        "signature": signature,
        "enforce_signatures": bool(
            os.getenv("COSMICSEC_ENFORCE_PLUGIN_SIGNATURES", "false").strip().lower()
            in {"1", "true", "yes", "on"}
        ),
    }


@app.post("/plugins/{name}/enable")
async def enable_plugin(request: Request, name: str) -> dict:
    ok = _loader.enable(name)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    _append_audit(
        "enable",
        name,
        "Plugin enabled by operator",
        actor=request.headers.get("X-CosmicSec-Actor", "system"),
        actor_role=request.headers.get("X-CosmicSec-Actor-Role", "operator"),
        context={"enabled": True},
    )
    return {"plugin": name, "status": "enabled"}


@app.post("/plugins/{name}/disable")
async def disable_plugin(request: Request, name: str) -> dict:
    ok = _loader.disable(name)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    _append_audit(
        "disable",
        name,
        "Plugin disabled by operator",
        actor=request.headers.get("X-CosmicSec-Actor", "system"),
        actor_role=request.headers.get("X-CosmicSec-Actor-Role", "operator"),
        context={"enabled": False},
    )
    return {"plugin": name, "status": "disabled"}


@app.post("/plugins/reload")
async def reload_plugins(request: Request) -> dict:
    """Re-scan plugin directories for new or updated plugins."""
    loaded = _loader.discover()
    _append_audit(
        "reload",
        "registry",
        f"Reloaded {len(loaded)} plugin(s)",
        actor=request.headers.get("X-CosmicSec-Actor", "system"),
        actor_role=request.headers.get("X-CosmicSec-Actor-Role", "operator"),
        context={"loaded_count": len(loaded)},
    )
    return {
        "newly_loaded": loaded,
        "total": len(_loader.list_plugins()),
    }


@app.get("/plugins/{name}/dependencies")
async def plugin_dependencies(name: str) -> dict:
    """Check whether all declared dependencies are available in the current environment."""
    deps = _loader.check_dependencies(name)
    if not deps and name not in {p["name"] for p in _loader.list_plugins()}:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    missing = [d for d, ok in deps.items() if not ok]
    return {
        "plugin": name,
        "dependencies": deps,
        "all_satisfied": len(missing) == 0,
        "missing": missing,
    }


# ==========================================================================
# Phase 2 — Plugin Marketplace
# ==========================================================================


@app.get("/marketplace")
async def marketplace_list(
    tag: str | None = None,
    author: str | None = None,
    min_rating: float | None = None,
) -> dict:
    """
    Browse available plugins in the community marketplace.

    Supports filtering by tag, author, and minimum average rating.
    Uses DB persistence with in-memory fallback.
    """
    # Try DB first
    try:
        db = SessionLocal()
        plugins = db_list_marketplace(db, tag=tag, author=author)
        if min_rating is not None:
            plugins = [p for p in plugins if db_avg_rating(db, p["name"]) >= min_rating]
        for p in plugins:
            p["average_rating"] = db_avg_rating(db, p["name"])
            p["rating_count"] = len(db_get_ratings(db, p["name"]))
        plugins.sort(key=lambda p: p["average_rating"], reverse=True)
        db.close()
        return {"plugins": plugins, "total": len(plugins)}
    except Exception:
        logger.warning("DB marketplace query failed — using in-memory fallback", exc_info=True)

    # In-memory fallback
    plugins = list(_marketplace.values())
    if tag:
        plugins = [p for p in plugins if tag in p.get("tags", [])]
    if author:
        plugins = [p for p in plugins if p.get("author", "").lower() == author.lower()]
    if min_rating is not None:
        plugins = [p for p in plugins if _avg_rating(p["name"]) >= min_rating]
    for p in plugins:
        p["average_rating"] = _avg_rating(p["name"])
        p["rating_count"] = len(_ratings.get(p["name"], []))
    plugins.sort(key=lambda p: p["average_rating"], reverse=True)
    return {"plugins": plugins, "total": len(plugins)}


@app.post("/marketplace/publish", status_code=201)
async def publish_plugin(payload: PublishPluginRequest) -> dict:
    """
    Publish a plugin to the community marketplace.

    The download URL must be HTTPS (validated at submission).
    The SHA-256 checksum is stored for consumer verification.
    Persists to DB with in-memory cache backup.
    """
    if not payload.download_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="download_url must use HTTPS")
    entry: dict[str, Any] = {
        "name": payload.name,
        "version": payload.version,
        "description": payload.description,
        "author": payload.author,
        "tags": payload.tags,
        "download_url": payload.download_url,
        "checksum_sha256": payload.checksum_sha256,
        "published_at": datetime.utcnow().isoformat(),
        "listing_id": secrets.token_urlsafe(10),
    }

    # Persist to DB
    try:
        db = SessionLocal()
        db_entry = create_marketplace_entry(db, entry)
        db.close()
        entry.update(db_entry)
    except Exception:
        logger.warning("DB persist failed for marketplace publish — in-memory only", exc_info=True)

    _marketplace[payload.name] = entry
    _ratings.setdefault(payload.name, [])
    return entry


@app.post("/plugins/{name}/rate", status_code=201)
async def rate_plugin(name: str, payload: RatePluginRequest) -> dict:
    """Submit a star rating (1-5) and optional review for an installed plugin."""
    meta = _loader.get_metadata(name)
    if meta is None and name not in _marketplace:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")

    # Persist to DB
    try:
        db = SessionLocal()
        upsert_rating(db, name, payload.user, payload.rating, payload.review)
        avg = db_avg_rating(db, name)
        total = len(db_get_ratings(db, name))
        db.close()
        return {
            "plugin": name,
            "rating_submitted": payload.rating,
            "average_rating": avg,
            "total_ratings": total,
        }
    except Exception:
        logger.warning("DB persist failed for plugin rating — using in-memory", exc_info=True)

    # In-memory fallback
    _ratings.setdefault(name, [])
    existing = next((r for r in _ratings[name] if r["user"] == payload.user), None)
    entry = {
        "user": payload.user,
        "rating": payload.rating,
        "review": payload.review,
        "ts": datetime.utcnow().isoformat(),
    }
    if existing:
        _ratings[name].remove(existing)
    _ratings[name].append(entry)
    return {
        "plugin": name,
        "rating_submitted": payload.rating,
        "average_rating": _avg_rating(name),
        "total_ratings": len(_ratings[name]),
    }


@app.get("/plugins/{name}/rating")
async def get_plugin_rating(name: str) -> dict:
    """Get aggregated rating statistics for a plugin."""
    # Try DB first
    try:
        db = SessionLocal()
        reviews = db_get_ratings(db, name)
        avg = db_avg_rating(db, name)
        db.close()
        return {
            "plugin": name,
            "average_rating": avg,
            "total_ratings": len(reviews),
            "reviews": reviews[-10:],
        }
    except Exception:
        logger.warning("DB rating query failed — using in-memory", exc_info=True)

    reviews = _ratings.get(name, [])
    return {
        "plugin": name,
        "average_rating": _avg_rating(name),
        "total_ratings": len(reviews),
        "reviews": reviews[-10:],  # last 10 reviews
    }


def _avg_rating(name: str) -> float:
    reviews = _ratings.get(name, [])
    if not reviews:
        return 0.0
    return round(sum(r["rating"] for r in reviews) / len(reviews), 2)


def _parse_semver(value: str) -> tuple:
    """Best-effort semantic version tuple for comparisons."""
    parts = [p for p in value.strip().split(".") if p]
    out = []
    for p in parts[:3]:
        num = "".join(ch for ch in p if ch.isdigit())
        out.append(int(num) if num else 0)
    while len(out) < 3:
        out.append(0)
    return tuple(out)


# ==========================================================================
# Phase 2 — Remaining plugin ecosystem features
# ==========================================================================


@app.get("/plugins/updates")
async def plugin_update_status() -> dict:
    """
    Auto-update intelligence endpoint.

    Compares installed plugin versions against marketplace versions and
    returns update recommendations.
    """
    installed = _loader.list_plugins()
    updates: list[dict[str, Any]] = []
    for p in installed:
        name = p["name"]
        local_ver = p.get("version", "0.0.0")
        remote = _marketplace.get(name)
        if not remote:
            continue
        remote_ver = remote.get("version", "0.0.0")
        if _parse_semver(remote_ver) > _parse_semver(local_ver):
            updates.append(
                {
                    "plugin": name,
                    "installed_version": local_ver,
                    "available_version": remote_ver,
                    "download_url": remote.get("download_url"),
                    "checksum_sha256": remote.get("checksum_sha256"),
                    "source": remote.get("source_repo", "marketplace"),
                }
            )
    return {
        "updates": updates,
        "updates_available": len(updates),
        "checked_plugins": len(installed),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/plugins/{name}/auto-update")
async def auto_update_plugin(name: str) -> dict:
    """
    Simulate secure auto-update workflow (download/verify/install hooks).

    This endpoint returns actionable update metadata for automation agents.
    """
    meta = _loader.get_metadata(name)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    remote = _marketplace.get(name)
    if not remote:
        return {"plugin": name, "updated": False, "reason": "No marketplace release found"}

    local_ver = meta.version
    remote_ver = remote.get("version", "0.0.0")
    if _parse_semver(remote_ver) <= _parse_semver(local_ver):
        return {
            "plugin": name,
            "updated": False,
            "reason": "Already up to date",
            "version": local_ver,
        }

    return {
        "plugin": name,
        "updated": False,
        "status": "ready_for_update",
        "from_version": local_ver,
        "to_version": remote_ver,
        "download_url": remote.get("download_url"),
        "checksum_sha256": remote.get("checksum_sha256"),
        "next_steps": [
            "download package",
            "verify SHA-256 checksum",
            "install in plugin directory",
            "reload plugin registry",
        ],
    }


@app.get("/community/repositories")
async def list_repositories() -> dict:
    """List configured community plugin repositories."""
    # Try DB first
    try:
        db = SessionLocal()
        repos = db_list_repositories(db)
        db.close()
        return {"repositories": repos, "total": len(repos)}
    except Exception:
        logger.warning("DB repository list failed — using in-memory", exc_info=True)
    return {"repositories": list(_repositories.values()), "total": len(_repositories)}


@app.post("/community/repositories", status_code=201)
async def register_repository(payload: RegisterRepositoryRequest) -> dict:
    """Register a community plugin repository index."""
    if not payload.index_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="index_url must use HTTPS")
    record = {
        "repo_id": payload.repo_id,
        "name": payload.name,
        "index_url": payload.index_url,
        "trust_level": payload.trust_level,
        "enabled": payload.enabled,
        "registered_at": datetime.utcnow().isoformat(),
        "last_sync": None,
        "imported_count": 0,
    }

    # Persist to DB
    try:
        db = SessionLocal()
        db_record = db_create_repository(db, record)
        db.close()
        record.update(db_record)
    except Exception:
        logger.warning("DB persist failed for repository — in-memory only", exc_info=True)

    _repositories[payload.repo_id] = record
    return record


@app.post("/community/repositories/{repo_id}/sync")
async def sync_repository(repo_id: str) -> dict:
    """
    Sync plugin metadata from a community repository.

    Expects repository index JSON format:
    {"plugins": [{name, version, description, author, tags, download_url, checksum_sha256}, ...]}
    """
    # Try DB first for repo lookup
    repo = _repositories.get(repo_id)
    try:
        db = SessionLocal()
        db_repo = db_get_repository(db, repo_id)
        if db_repo:
            repo = db_repo
        db.close()
    except Exception:
        logger.debug("Failed to load repository %s from DB", repo_id, exc_info=True)

    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found")
    if not repo.get("enabled", True):
        raise HTTPException(status_code=400, detail="Repository is disabled")

    try:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.get(repo["index_url"], timeout=15.0)
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Repository sync failed: {exc}")

    imported = 0
    for p in payload.get("plugins", []):
        name = p.get("name")
        if not name:
            continue
        entry = {
            "name": name,
            "version": p.get("version", "0.0.0"),
            "description": p.get("description", ""),
            "author": p.get("author", "unknown"),
            "tags": p.get("tags", []),
            "download_url": p.get("download_url", ""),
            "checksum_sha256": p.get("checksum_sha256", ""),
            "published_at": datetime.utcnow().isoformat(),
            "listing_id": secrets.token_urlsafe(10),
            "source_repo": repo_id,
        }
        _marketplace[name] = entry
        _ratings.setdefault(name, [])

        # Persist to DB
        try:
            db = SessionLocal()
            create_marketplace_entry(db, entry)
            db.close()
        except Exception:
            logger.debug("Failed to persist marketplace entry %s", name, exc_info=True)

        imported += 1

    # Update repo sync metadata
    repo["last_sync"] = datetime.utcnow().isoformat()
    repo["imported_count"] = imported

    try:
        db = SessionLocal()
        update_repository_sync(db, repo_id, imported)
        db.close()
    except Exception:
        logger.debug("Failed to update sync metadata for repo %s", repo_id, exc_info=True)

    return {
        "repo_id": repo_id,
        "imported_count": imported,
        "marketplace_total": len(_marketplace),
        "last_sync": repo["last_sync"],
    }
