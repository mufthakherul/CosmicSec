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


    # ---------------------------------------------------------------------------
    # Marketplace in-memory store (replace with DB in production)
    # ---------------------------------------------------------------------------

    # _marketplace[name] = {name, version, description, author, tags, download_url,
    #                        checksum_sha256, published_at, ratings}
    _marketplace: Dict[str, Dict[str, Any]] = {}
    # _ratings[name] = list of {user, rating, review, ts}
    _ratings: Dict[str, List[Dict[str, Any]]] = {}


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
