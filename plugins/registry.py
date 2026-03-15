"""
Plugin Registry — FastAPI service for managing installed plugins.

Mounts as a sub-application or standalone at port 8007.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

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
