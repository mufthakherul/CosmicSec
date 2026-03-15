"""
Plugin Loader — discovers, validates, and sandboxed-executes plugins.

Usage:
    loader = PluginLoader(plugin_dirs=["/opt/cosmicsec/plugins"])
    loader.discover()
    result = loader.run("my_plugin", context)
"""
from __future__ import annotations

import importlib.util
import inspect
import logging
import sys
import traceback
from pathlib import Path
from typing import Dict, List, Optional, Type

from .base import PluginBase, PluginContext, PluginMetadata, PluginResult

logger = logging.getLogger(__name__)


class PluginValidationError(Exception):
    """Raised when a plugin fails the contract validation check."""


def _load_class_from_file(path: Path) -> Optional[Type[PluginBase]]:
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
        if (
            inspect.isclass(obj)
            and issubclass(obj, PluginBase)
            and obj is not PluginBase
        ):
            return obj
    return None


def _validate(cls: Type[PluginBase]) -> None:
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

    def __init__(self, plugin_dirs: Optional[List[str]] = None):
        self._dirs: List[Path] = [Path(d) for d in (plugin_dirs or [])]
        self._registry: Dict[str, Type[PluginBase]] = {}
        self._instances: Dict[str, PluginBase] = {}
        self._disabled: set[str] = set()

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------

    def discover(self) -> List[str]:
        """
        Scan configured directories for plugin files and register them.

        Returns list of successfully loaded plugin names.
        """
        loaded: List[str] = []
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
                    self._registry[meta.name] = cls
                    loaded.append(meta.name)
                    logger.info("Plugin registered: %s v%s", meta.name, meta.version)
                except PluginValidationError as exc:
                    logger.warning("Plugin validation failed (%s): %s", pyfile.name, exc)
        return loaded

    def register(self, cls: Type[PluginBase]) -> str:
        """Manually register a plugin class (for built-in plugins)."""
        _validate(cls)
        meta = cls().metadata()
        self._registry[meta.name] = cls
        logger.info("Plugin manually registered: %s", meta.name)
        return meta.name

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def list_plugins(self) -> List[Dict]:
        out = []
        for name, cls in self._registry.items():
            meta = cls().metadata()
            out.append({
                "name": meta.name,
                "version": meta.version,
                "description": meta.description,
                "author": meta.author,
                "tags": meta.tags,
                "enabled": name not in self._disabled,
            })
        return out

    def get_metadata(self, name: str) -> Optional[PluginMetadata]:
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

    def run(self, name: str, context: PluginContext, config: Optional[Dict] = None) -> PluginResult:
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
        except Exception:
            tb = traceback.format_exc()
            logger.error("Plugin %s raised during run():\n%s", name, tb)
            result = PluginResult(success=False, errors=[tb])
        finally:
            try:
                instance.cleanup()
            except Exception:
                pass

        return result
