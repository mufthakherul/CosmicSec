"""
Plugin Loader — discovers, validates, and sandboxed-executes plugins.

Usage:
    loader = PluginLoader(plugin_dirs=["/opt/cosmicsec/plugins"])
    loader.discover()
    result = loader.run("my_plugin", context)
"""

from __future__ import annotations

import contextlib
import importlib.util
import inspect
import logging
import os
import sys
import traceback
from pathlib import Path

from plugins.permissions import validate_required_permissions
from plugins.signing import PluginSignatureError, verify_plugin_file_signature

from .base import PluginBase, PluginContext, PluginMetadata, PluginResult

logger = logging.getLogger(__name__)


class PluginValidationError(Exception):
    """Raised when a plugin fails the contract validation check."""


def _load_class_from_file(path: Path) -> type[PluginBase] | None:
    """Dynamically import a Python file and find the PluginBase subclass."""
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    # Avoid polluting sys.modules with arbitrary plugin names
    module_key = f"_cosmicsec_plugin_{path.stem}"
    sys.modules[module_key] = module
    try:
        spec.loader.exec_module(module)  # type: ignore[union-attr]
    except Exception as exc:
        logger.warning("Failed to load plugin file %s: %s", path, exc)
        return None

    for obj in vars(module).values():
        if inspect.isclass(obj) and issubclass(obj, PluginBase) and obj is not PluginBase:
            return obj
    return None


def _validate(cls: type[PluginBase]) -> None:
    """Assert the class satisfies the plugin contract."""
    instance = cls.__new__(cls)
    if not hasattr(instance, "metadata"):
        raise PluginValidationError(f"{cls.__name__} missing metadata()")
    if not hasattr(instance, "run"):
        raise PluginValidationError(f"{cls.__name__} missing run()")
    # Ensure metadata() is callable and returns PluginMetadata
    try:
        meta = instance.metadata()
    except TypeError:
        raise PluginValidationError(f"{cls.__name__}.metadata() is not callable")
    if not isinstance(meta, PluginMetadata):
        raise PluginValidationError(
            f"{cls.__name__}.metadata() must return PluginMetadata, got {type(meta)}"
        )


class PluginLoader:
    """
    Discovers and manages plugin lifecycle.

    thread-safe for read operations; write operations (discover/register)
    should be done at startup.
    """

    def __init__(self, plugin_dirs: list[str] | None = None):
        self._dirs: list[Path] = [Path(d) for d in (plugin_dirs or [])]
        self._registry: dict[str, type[PluginBase]] = {}
        self._instances: dict[str, PluginBase] = {}
        self._disabled: set[str] = set()
        self._sources: dict[str, Path] = {}
        self._signature_status: dict[str, dict[str, str | bool]] = {}
        self._enforce_signatures = os.getenv(
            "COSMICSEC_ENFORCE_PLUGIN_SIGNATURES", "false"
        ).strip().lower() in {"1", "true", "yes", "on"}

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------

    def discover(self) -> list[str]:
        """
        Scan configured directories for plugin files and register them.

        Returns list of successfully loaded plugin names.
        """
        loaded: list[str] = []
        for directory in self._dirs:
            if not directory.is_dir():
                continue
            for pyfile in directory.glob("*.py"):
                if pyfile.name.startswith("_"):
                    continue
                cls = _load_class_from_file(pyfile)
                if cls is None:
                    continue
                try:
                    _validate(cls)
                    meta = cls().metadata()
                    self._sources[meta.name] = pyfile
                    self._signature_status[meta.name] = self._verify_plugin_signature(pyfile)
                    if self._enforce_signatures and not bool(
                        self._signature_status[meta.name].get("verified", False)
                    ):
                        logger.warning(
                            "Plugin %s rejected because signature verification failed (%s)",
                            meta.name,
                            self._signature_status[meta.name].get("reason", "unknown"),
                        )
                        continue
                    self._registry[meta.name] = cls
                    loaded.append(meta.name)
                    logger.info("Plugin registered: %s v%s", meta.name, meta.version)
                except PluginValidationError as exc:
                    logger.warning("Plugin validation failed (%s): %s", pyfile.name, exc)
        return loaded

    def register(self, cls: type[PluginBase]) -> str:
        """Manually register a plugin class (for built-in plugins)."""
        _validate(cls)
        meta = cls().metadata()
        self._registry[meta.name] = cls
        logger.info("Plugin manually registered: %s", meta.name)
        return meta.name

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def list_plugins(self) -> list[dict]:
        out = []
        for name, cls in self._registry.items():
            meta = cls().metadata()
            sig = self._signature_status.get(name, {"verified": False, "reason": "unknown"})
            out.append(
                {
                    "name": meta.name,
                    "version": meta.version,
                    "description": meta.description,
                    "author": meta.author,
                    "tags": meta.tags,
                    "permissions": meta.permissions,
                    "signature_verified": bool(sig.get("verified", False)),
                    "signature_reason": str(sig.get("reason", "unknown")),
                    "enabled": name not in self._disabled,
                }
            )
        return out

    def _verify_plugin_signature(self, plugin_file: Path) -> dict[str, str | bool]:
        try:
            ok, reason = verify_plugin_file_signature(plugin_file)
            return {"verified": ok, "reason": reason}
        except PluginSignatureError as exc:
            return {"verified": False, "reason": str(exc)}

    def signature_status(self, name: str) -> dict[str, str | bool]:
        status = self._signature_status.get(name)
        if status is None:
            return {"verified": False, "reason": "plugin_not_found"}
        source = self._sources.get(name)
        if source:
            out = dict(status)
            out["source"] = str(source)
            return out
        return status

    def check_dependencies(self, name: str) -> dict[str, bool]:
        """
        Check whether all declared Python package dependencies for a plugin
        are importable in the current environment.

        Returns a dict mapping each dependency name to True (available) or
        False (missing). An empty dict is returned for unknown plugins.
        """
        cls = self._registry.get(name)
        if cls is None:
            return {}
        meta = cls().metadata()
        result: dict[str, bool] = {}
        for dep in getattr(meta, "dependencies", []):
            result[dep] = importlib.util.find_spec(dep) is not None
        return result

    def missing_dependencies(self, name: str) -> list[str]:
        """Return list of dependency names that are NOT importable."""
        return [dep for dep, ok in self.check_dependencies(name).items() if not ok]

    def get_metadata(self, name: str) -> PluginMetadata | None:
        cls = self._registry.get(name)
        return cls().metadata() if cls else None

    # ------------------------------------------------------------------
    # Enable / disable
    # ------------------------------------------------------------------

    def enable(self, name: str) -> bool:
        if name not in self._registry:
            return False
        self._disabled.discard(name)
        return True

    def disable(self, name: str) -> bool:
        if name not in self._registry:
            return False
        self._disabled.add(name)
        # Clean up cached instance
        self._instances.pop(name, None)
        return True

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def run(self, name: str, context: PluginContext, config: dict | None = None) -> PluginResult:
        """
        Run a plugin by name.

        Handles init/cleanup lifecycle, disabled check, and catches all
        exceptions so a faulty plugin cannot crash the caller.
        """
        if name not in self._registry:
            return PluginResult(
                success=False,
                errors=[f"Plugin '{name}' not found"],
            )
        if name in self._disabled:
            return PluginResult(
                success=False,
                errors=[f"Plugin '{name}' is disabled"],
            )

        cls = self._registry[name]
        meta = cls().metadata()

        granted_permissions = None
        if isinstance(config, dict):
            granted_permissions = config.get("granted_permissions")
        allowed, missing = validate_required_permissions(meta.permissions, granted_permissions)
        if not allowed:
            return PluginResult(
                success=False,
                errors=[(f"Plugin '{name}' missing required permissions: {', '.join(missing)}")],
                metadata={
                    "required_permissions": meta.permissions,
                    "granted_permissions": granted_permissions or [],
                },
            )

        sig = self._signature_status.get(name, {"verified": False, "reason": "unknown"})
        if self._enforce_signatures and not bool(sig.get("verified", False)):
            return PluginResult(
                success=False,
                errors=[
                    f"Plugin '{name}' signature verification failed: {sig.get('reason', 'unknown')}"
                ],
                metadata={
                    "signature_verified": False,
                    "signature_reason": sig.get("reason", "unknown"),
                },
            )
        # Re-use cached instance to avoid repeated init overhead
        if name not in self._instances:
            instance = cls()
            try:
                instance.init(config or {})
            except Exception as exc:
                logger.warning("Plugin %s init() failed: %s", name, exc)
            self._instances[name] = instance
        else:
            instance = self._instances[name]

        try:
            result = instance.run(context)
            if not isinstance(result, PluginResult):
                result = PluginResult(success=True, data=result)
            result.metadata.setdefault("required_permissions", meta.permissions)
            result.metadata.setdefault("signature_verified", bool(sig.get("verified", False)))
            result.metadata.setdefault("signature_reason", str(sig.get("reason", "unknown")))
        except Exception:
            tb = traceback.format_exc()
            logger.error("Plugin %s raised during run():\n%s", name, tb)
            result = PluginResult(success=False, errors=[tb])
        finally:
            with contextlib.suppress(Exception):
                instance.cleanup()

        return result
