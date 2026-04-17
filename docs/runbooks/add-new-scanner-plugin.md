# Runbook: Adding a New Scanner Plugin

**Audience**: Security engineers, plugin contributors  
**Last updated**: 2026-04-16

---

## Overview

CosmicSec's scanning pipeline supports **external security tool plugins**.  
Plugins extend the CLI agent with new scan capabilities and are registered  
in the tool registry so both the CLI agent and the server can discover them.

There are two kinds of plugins:
1. **CLI Agent plugin** — runs locally on the agent machine (Nmap, Nuclei, etc.)
2. **Server-side plugin** — server calls an external API or docker container

---

## Part A: CLI Agent Scanner Plugin

### 1. Register the Tool

Edit `cli/agent/cosmicsec_agent/tool_registry.py`:

```python
SecurityTool(
    name="mytool",
    path=shutil.which("mytool") or "",
    version="1.0",
    capabilities=["web-scan", "vuln-detection"],
    description="Brief description of what this tool does.",
    default_args=["--output", "json"],
),
```

### 2. Create a Parser

Create `cli/agent/cosmicsec_agent/parsers/mytool_parser.py`:

```python
"""Parser for mytool JSON/text output."""
from __future__ import annotations


def parse_mytool_output(raw: str, target: str) -> list[dict]:
    """
    Parse mytool stdout and return a list of finding dicts.
    
    Each finding must include:
      - title: str
      - severity: "critical" | "high" | "medium" | "low" | "info"
      - description: str
      - target: str
    """
    findings = []
    # ... parse raw output ...
    return findings
```

### 3. Wire the Parser into the Scan Engine

In `cli/agent/cosmicsec_agent/main.py`, add the parser to `_display_findings`:

```python
elif tool_name == "mytool":
    from .parsers.mytool_parser import parse_mytool_output
    findings = parse_mytool_output(result.stdout, target)
```

### 4. Add Tests

```bash
tests/cli/test_mytool_parser.py
```

---

## Part B: Server-Side Plugin

### 1. Create the Plugin Module

```python
# services/scan_service/plugins/mytool_plugin.py
from __future__ import annotations


class MyToolPlugin:
    name = "mytool"
    version = "1.0.0"
    capabilities = ["web-scan"]

    async def run(self, target: str, options: dict) -> dict:
        """
        Execute mytool against target. Return structured findings.
        """
        # Call external tool/API here
        return {
            "target": target,
            "findings": [],
            "raw_output": "",
        }
```

### 2. Register in Plugin Registry

```python
# services/scan_service/plugins/__init__.py
from .mytool_plugin import MyToolPlugin

PLUGINS = {
    "mytool": MyToolPlugin(),
}
```

### 3. Sign the Plugin (Security Requirement)

Plugins must be signed before deployment:

```bash
# Generate SHA-256 hash
sha256sum services/scan_service/plugins/mytool_plugin.py > mytool_plugin.py.sha256

# Verify
sha256sum -c mytool_plugin.py.sha256
```

Register the hash in `plugins/manifest.json`:

```json
{
  "mytool": {
    "version": "1.0.0",
    "sha256": "abc123..."
  }
}
```

---

## Checklist

- [ ] Tool registered in CLI `tool_registry.py`
- [ ] Parser created in `parsers/`
- [ ] Parser wired in `main.py`
- [ ] Server-side plugin class created
- [ ] Plugin registered in registry
- [ ] Plugin manifest updated with SHA-256
- [ ] Tests added for parser and plugin
- [ ] CLI agent tool list updated in `docs/ROADMAP_UNIFIED.md` (Wave 4 tool registry section)
