"""Lightweight local plugin manager for CLI extensions (CA-8.1)."""

from __future__ import annotations

import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path


_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$")
_DEFAULT_ROOT = Path(os.getenv("COSMICSEC_PLUGINS_DIR", str(Path.home() / ".cosmicsec" / "plugins")))


@dataclass
class PluginMetadata:
    name: str
    version: str = "0.1.0"
    author: str = "Unknown"
    description: str = ""
    path: str = ""


def _validate_plugin_name(name: str) -> None:
    if not _NAME_RE.match(name):
        raise ValueError(
            "Invalid plugin name. Use 2-64 chars: letters, numbers, dash or underscore."
        )


def _parse_simple_yaml(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    result: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        result[key.strip()] = value.strip().strip('"').strip("'")
    return result


class PluginManager:
    def __init__(self, root: Path | None = None) -> None:
        self._root = root or _DEFAULT_ROOT
        self._root.mkdir(parents=True, exist_ok=True)

    @property
    def root(self) -> Path:
        return self._root

    def list_plugins(self) -> list[PluginMetadata]:
        plugins: list[PluginMetadata] = []
        for entry in sorted(self._root.iterdir()):
            if not entry.is_dir():
                continue
            meta = _parse_simple_yaml(entry / "plugin.yaml")
            name = meta.get("name", entry.name)
            plugins.append(
                PluginMetadata(
                    name=name,
                    version=meta.get("version", "0.1.0"),
                    author=meta.get("author", "Unknown"),
                    description=meta.get("description", ""),
                    path=str(entry),
                )
            )
        return plugins

    def search(self, query: str) -> list[PluginMetadata]:
        needle = query.lower().strip()
        if not needle:
            return self.list_plugins()
        return [
            plugin
            for plugin in self.list_plugins()
            if needle in plugin.name.lower() or needle in plugin.description.lower()
        ]

    def create_scaffold(self, name: str, author: str = "Unknown") -> Path:
        _validate_plugin_name(name)
        plugin_dir = self._root / name
        if plugin_dir.exists():
            raise FileExistsError(f"Plugin '{name}' already exists.")
        plugin_dir.mkdir(parents=True, exist_ok=False)

        (plugin_dir / "plugin.yaml").write_text(
            "\n".join(
                [
                    f"name: {name}",
                    "version: 0.1.0",
                    f"author: {author}",
                    "description: Custom CosmicSec plugin",
                    "",
                ]
            ),
            encoding="utf-8",
        )
        (plugin_dir / "__init__.py").write_text(
            f'"""Plugin package: {name}."""\n',
            encoding="utf-8",
        )
        (plugin_dir / "commands.py").write_text(
            (
                "from __future__ import annotations\n\n"
                "def register(app) -> None:\n"
                "    \"\"\"Register additional Typer commands.\"\"\"\n"
                "    return None\n"
            ),
            encoding="utf-8",
        )
        (plugin_dir / "parser.py").write_text(
            (
                "from __future__ import annotations\n\n"
                "def parse_tool_output(stdout: str) -> list[dict]:\n"
                "    \"\"\"Return parsed findings for this plugin's custom tool.\"\"\"\n"
                "    return []\n"
            ),
            encoding="utf-8",
        )
        return plugin_dir

    def install_from_path(self, source: Path) -> Path:
        if not source.exists() or not source.is_dir():
            raise FileNotFoundError(f"Plugin source path does not exist: {source}")
        name = source.name
        _validate_plugin_name(name)
        dest = self._root / name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(source, dest)
        return dest

    def remove(self, name: str) -> bool:
        _validate_plugin_name(name)
        plugin_dir = self._root / name
        if not plugin_dir.exists():
            return False
        shutil.rmtree(plugin_dir)
        return True
