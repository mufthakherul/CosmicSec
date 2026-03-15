"""
Plugin Registry — FastAPI service for managing installed plugins.

Mounts as a sub-application or standalone at port 8007.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import secrets

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .sdk.base import PluginContext
from .sdk.loader import PluginLoader

app = FastAPI(
    title="CosmicSec Plugin Registry",
    description="Phase 2 — Plugin management API for the CosmicSec plugin SDK",
    version="1.0.0",
)

# Loader singleton — plugin dirs are configurable via env
import os
_PLUGIN_DIRS = os.getenv("COSMICSEC_PLUGIN_DIRS", "/opt/cosmicsec/plugins").split(":")
_loader = PluginLoader(plugin_dirs=_PLUGIN_DIRS)
# Discover at startup
_loader.discover()


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------

class RunPluginRequest(BaseModel):
    target: str = Field(..., description="Target to pass to the plugin context")
    options: Dict[str, Any] = Field(default_factory=dict)
    scan_id: Optional[str] = None
    user: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class PublishPluginRequest(BaseModel):
    name: str = Field(..., description="Plugin name (unique identifier)")
    version: str = Field(..., description="Semantic version, e.g. 1.2.0")
    description: str = Field(...)
    author: str = Field(...)
    tags: List[str] = Field(default_factory=list)
    download_url: str = Field(..., description="HTTPS URL to the plugin .py file")
    checksum_sha256: str = Field(..., description="SHA-256 hex digest used to verify the download")


class RatePluginRequest(BaseModel):
    user: str = Field(..., description="Username submitting the rating")
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")
    review: Optional[str] = Field(default=None, description="Optional text review")


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
_marketplace: Dict[str, Dict[str, Any]] = {}
# _ratings[name] = list of {user, rating, review, ts}
_ratings: Dict[str, List[Dict[str, Any]]] = {}
# _repositories[repo_id] = {repo metadata + last_sync + imported_count}
_repositories: Dict[str, Dict[str, Any]] = {}


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
async def run_plugin(name: str, payload: RunPluginRequest) -> dict:
    ctx = PluginContext(
        target=payload.target,
        options=payload.options,
        scan_id=payload.scan_id,
        user=payload.user,
    )
    result = _loader.run(name, ctx, config=payload.config)
    return {
        "plugin": name,
        "success": result.success,
        "data": result.data,
        "findings": result.findings,
        "errors": result.errors,
        "metadata": result.metadata,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/plugins/{name}/enable")
async def enable_plugin(name: str) -> dict:
    ok = _loader.enable(name)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    return {"plugin": name, "status": "enabled"}


@app.post("/plugins/{name}/disable")
async def disable_plugin(name: str) -> dict:
    ok = _loader.disable(name)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    return {"plugin": name, "status": "disabled"}


@app.post("/plugins/reload")
async def reload_plugins() -> dict:
    """Re-scan plugin directories for new or updated plugins."""
    loaded = _loader.discover()
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
    tag: Optional[str] = None,
    author: Optional[str] = None,
    min_rating: Optional[float] = None,
) -> dict:
    """
    Browse available plugins in the community marketplace.

    Supports filtering by tag, author, and minimum average rating.
    """
    plugins = list(_marketplace.values())
    if tag:
        plugins = [p for p in plugins if tag in p.get("tags", [])]
    if author:
        plugins = [p for p in plugins if p.get("author", "").lower() == author.lower()]
    if min_rating is not None:
        plugins = [
            p for p in plugins
            if _avg_rating(p["name"]) >= min_rating
        ]
    # Enrich with ratings
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
    """
    if not payload.download_url.startswith("https://"):
        raise HTTPException(status_code=400, detail="download_url must use HTTPS")
    entry: Dict[str, Any] = {
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
    _marketplace[payload.name] = entry
    _ratings.setdefault(payload.name, [])
    return entry


@app.post("/plugins/{name}/rate", status_code=201)
async def rate_plugin(name: str, payload: RatePluginRequest) -> dict:
    """Submit a star rating (1-5) and optional review for an installed plugin."""
    meta = _loader.get_metadata(name)
    if meta is None and name not in _marketplace:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
    _ratings.setdefault(name, [])
    # One rating per user — update if exists
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
    updates: List[Dict[str, Any]] = []
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
        return {"plugin": name, "updated": False, "reason": "Already up to date", "version": local_ver}

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
    _repositories[payload.repo_id] = record
    return record


@app.post("/community/repositories/{repo_id}/sync")
async def sync_repository(repo_id: str) -> dict:
    """
    Sync plugin metadata from a community repository.

    Expects repository index JSON format:
    {"plugins": [{name, version, description, author, tags, download_url, checksum_sha256}, ...]}
    """
    repo = _repositories.get(repo_id)
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
        _marketplace[name] = {
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
        _ratings.setdefault(name, [])
        imported += 1

    repo["last_sync"] = datetime.utcnow().isoformat()
    repo["imported_count"] = imported
    return {
        "repo_id": repo_id,
        "imported_count": imported,
        "marketplace_total": len(_marketplace),
        "last_sync": repo["last_sync"],
    }
