"""Tool registry — discovers locally installed security tools and probes their versions."""
from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Known tools registry
# ---------------------------------------------------------------------------

_KNOWN_TOOLS: dict[str, dict] = {
    "nmap": {
        "version_cmd": ["nmap", "--version"],
        "capabilities": ["port_scan", "service_detect", "os_detect"],
    },
    "nikto": {
        "version_cmd": ["nikto", "-Version"],
        "capabilities": ["web_scan", "vuln_detect"],
    },
    "sqlmap": {
        "version_cmd": ["sqlmap", "--version"],
        "capabilities": ["sqli", "db_enum"],
    },
    "gobuster": {
        "version_cmd": ["gobuster", "version"],
        "capabilities": ["dir_enum", "dns_enum"],
    },
    "ffuf": {
        "version_cmd": ["ffuf", "-V"],
        "capabilities": ["fuzzing", "dir_enum"],
    },
    "masscan": {
        "version_cmd": ["masscan", "--version"],
        "capabilities": ["fast_port_scan"],
    },
    "wpscan": {
        "version_cmd": ["wpscan", "--version"],
        "capabilities": ["wordpress_scan"],
    },
    "nuclei": {
        "version_cmd": ["nuclei", "-version"],
        "capabilities": ["template_scan", "vuln_detect"],
    },
    "hydra": {
        "version_cmd": ["hydra", "-V"],
        "capabilities": ["brute_force", "password_attack"],
    },
    "john": {
        "version_cmd": ["john", "--version"],
        "capabilities": ["password_crack"],
    },
    "hashcat": {
        "version_cmd": ["hashcat", "--version"],
        "capabilities": ["password_crack", "hash_crack"],
    },
    "msfconsole": {
        "version_cmd": ["msfconsole", "--version"],
        "capabilities": ["exploitation", "post_exploit"],
    },
    "zap.sh": {
        "version_cmd": ["zap.sh", "-version"],
        "capabilities": ["web_scan", "proxy"],
    },
    "burpsuite": {
        "version_cmd": ["burpsuite", "--version"],
        "capabilities": ["web_proxy", "web_scan"],
    },
}

# Human-friendly name aliases (manifest key → binary name)
_TOOL_NAME_ALIASES: dict[str, str] = {
    "metasploit": "msfconsole",
    "zaproxy": "zap.sh",
}


@dataclass
class ToolInfo:
    """Metadata for a discovered security tool."""

    name: str
    path: str
    version: str
    capabilities: list[str] = field(default_factory=list)


class ToolRegistry:
    """Discovers locally installed security tools and probes their versions."""

    def discover(self) -> list[ToolInfo]:
        """Return a list of :class:`ToolInfo` for every tool found on PATH."""
        found: list[ToolInfo] = []
        for tool_name, meta in _KNOWN_TOOLS.items():
            path = shutil.which(tool_name)
            if path is None:
                continue
            version = self.probe_version(tool_name, path)
            found.append(
                ToolInfo(
                    name=tool_name,
                    path=path,
                    version=version,
                    capabilities=list(meta["capabilities"]),
                )
            )
        return found

    def probe_version(self, name: str, path: str) -> str:
        """Run the version command for *name* and return a version string.

        Falls back to ``"unknown"`` if the command fails or times out.
        """
        meta = _KNOWN_TOOLS.get(name)
        if meta is None:
            return "unknown"
        cmd = [path] + meta["version_cmd"][1:]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10,
            )
            output = (result.stdout or result.stderr or "").strip()
            # Return first non-empty line
            for line in output.splitlines():
                line = line.strip()
                if line:
                    return line
            return "unknown"
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            return "unknown"

    def to_manifest(self) -> dict:
        """Return a serializable manifest of discovered tools for server registration."""
        tools = self.discover()
        return {
            "tools": [
                {
                    "name": t.name,
                    "path": t.path,
                    "version": t.version,
                    "capabilities": t.capabilities,
                }
                for t in tools
            ]
        }
