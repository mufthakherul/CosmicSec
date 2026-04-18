"""Plugin capability checks.

The plugin declares required permissions in PluginMetadata.permissions.
The caller supplies granted permissions at runtime.
"""

from __future__ import annotations

from collections.abc import Iterable


def normalize_permissions(values: Iterable[str] | None) -> set[str]:
    if values is None:
        return set()
    return {str(v).strip().lower() for v in values if str(v).strip()}


def validate_required_permissions(
    required_permissions: list[str] | None,
    granted_permissions: Iterable[str] | None,
) -> tuple[bool, list[str]]:
    required = normalize_permissions(required_permissions or [])
    granted = normalize_permissions(granted_permissions)
    missing = sorted(required - granted)
    return len(missing) == 0, missing
