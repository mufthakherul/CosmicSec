"""
CosmicSec Plugin SDK — base classes for third-party and internal plugins.

Every plugin MUST subclass PluginBase and implement:
  - metadata() → PluginMetadata
  - run(context: PluginContext) → PluginResult

The loader validates these contracts before execution.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PluginMetadata:
    """Declarative metadata every plugin must provide."""
    name: str
    version: str
    description: str
    author: str
    tags: List[str] = field(default_factory=list)
    # Minimum required permissions this plugin needs
    permissions: List[str] = field(default_factory=list)


@dataclass
class PluginContext:
    """
    Execution context injected by the loader.

    Plugins MUST NOT import external processes or open raw sockets;
    they should only use the helpers exposed here.
    """
    target: str
    options: Dict[str, Any] = field(default_factory=dict)
    scan_id: Optional[str] = None
    user: Optional[str] = None
    # Shared artefact store — plugins may read/write named keys
    artefacts: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PluginResult:
    """Uniform return type for all plugin executions."""
    success: bool
    data: Any = None
    findings: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class PluginBase(abc.ABC):
    """
    Abstract base class for all CosmicSec plugins.

    Subclasses must be importable, stateless between calls, and implement
    both ``metadata()`` and ``run(context)``.
    """

    @abc.abstractmethod
    def metadata(self) -> PluginMetadata:
        """Return this plugin's static metadata descriptor."""
        ...

    def init(self, config: Dict[str, Any]) -> None:
        """
        Optional lifecycle hook — called once by the loader before the first
        ``run()``. Override to set up connections, load models, etc.
        """

    @abc.abstractmethod
    def run(self, context: PluginContext) -> PluginResult:
        """
        Execute the plugin against the given context and return results.

        This is the primary entry-point; it MUST be synchronous and
        side-effect-free except for writing to ``context.artefacts``.
        """
        ...

    def cleanup(self) -> None:
        """
        Optional lifecycle hook — called by the loader after ``run()``
        completes (success or failure). Override to release resources.
        """
