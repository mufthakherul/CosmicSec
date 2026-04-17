#!/usr/bin/env python
"""Fail CI if external script/stylesheet tags miss integrity attributes."""

from __future__ import annotations

import re
from pathlib import Path

HTML_FILES = [
    Path("frontend/index.html"),
]

TAG_RE = re.compile(
    r"<(?P<tag>script|link)\b(?P<attrs>[^>]+)>",
    re.IGNORECASE,
)


def _is_external(attrs: str) -> bool:
    return 'src="http' in attrs.lower() or 'href="http' in attrs.lower()


def _has_integrity(attrs: str) -> bool:
    return "integrity=" in attrs.lower()


def _requires_sri(tag: str, attrs: str) -> bool:
    tag_lower = tag.lower()
    attrs_lower = attrs.lower()
    if tag_lower == "script":
        return "src=" in attrs_lower
    if tag_lower != "link":
        return False
    rel_match = re.search(r'rel\s*=\s*["\']([^"\']+)["\']', attrs_lower)
    rel_value = rel_match.group(1) if rel_match else ""
    return rel_value in {"stylesheet", "modulepreload"}


def main() -> int:
    missing: list[str] = []
    for html_path in HTML_FILES:
        if not html_path.exists():
            continue
        text = html_path.read_text(encoding="utf-8")
        for i, line in enumerate(text.splitlines(), start=1):
            for match in TAG_RE.finditer(line):
                tag = match.group("tag")
                attrs = match.group("attrs")
                if _requires_sri(tag, attrs) and _is_external(attrs) and not _has_integrity(attrs):
                    missing.append(f"{html_path}:{i}:{tag}")
    if missing:
        print("Missing SRI integrity attributes for external assets:")
        for item in missing:
            print(f"  - {item}")
        return 1
    print("SRI check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
