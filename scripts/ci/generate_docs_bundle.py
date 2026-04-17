#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
import re

EXCLUDE_PARTS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "storybook-static",
    "dist",
    "build",
    ".next",
    ".pytest_cache",
    "__pycache__",
}

ROOT = Path(__file__).resolve().parents[2]


@dataclass
class DocInfo:
    path: Path
    title: str
    first_paragraph: str
    heading_count: int
    word_count: int


def _iter_markdown_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*.md"):
        if any(part in EXCLUDE_PARTS for part in path.parts):
            continue
        files.append(path)
    return sorted(files)


def _parse_markdown(path: Path) -> DocInfo:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()

    title = path.stem.replace("_", " ").strip() or "Untitled"
    for line in lines:
        if line.startswith("# "):
            title = line[2:].strip()
            break

    heading_count = sum(1 for line in lines if re.match(r"^#{1,6}\\s", line))
    words = re.findall(r"\\b[\\w-]+\\b", text)
    word_count = len(words)

    first_paragraph = ""
    bucket: list[str] = []
    for line in lines:
        striped = line.strip()
        if not striped:
            if bucket:
                break
            continue
        if striped.startswith("#"):
            continue
        bucket.append(striped)
    if bucket:
        first_paragraph = " ".join(bucket)[:420]

    return DocInfo(
        path=path,
        title=title,
        first_paragraph=first_paragraph,
        heading_count=heading_count,
        word_count=word_count,
    )


def _git_recent_commits(limit: int = 8) -> list[str]:
    try:
        out = subprocess.check_output(
            ["git", "--no-pager", "log", f"--oneline", f"-{limit}"],
            cwd=ROOT,
            text=True,
        )
        return [line.strip() for line in out.splitlines() if line.strip()]
    except Exception:
        return []


def _repo_metrics() -> dict[str, int]:
    return {
        "python_files": len(list(ROOT.rglob("*.py"))),
        "typescript_files": len(list(ROOT.rglob("*.ts"))) + len(list(ROOT.rglob("*.tsx"))),
        "workflow_files": len(list((ROOT / ".github" / "workflows").glob("*.yml"))),
        "service_directories": len(list((ROOT / "services").glob("*/"))) if (ROOT / "services").exists() else 0,
        "test_files": len(list((ROOT / "tests").rglob("test_*.py"))) if (ROOT / "tests").exists() else 0,
    }


def _docs_scan(markdown_files: list[Path]) -> dict:
    infos = [_parse_markdown(p) for p in markdown_files]
    missing_titles = [str(i.path.relative_to(ROOT)) for i in infos if i.title.lower() in {"untitled", i.path.stem.lower()}]
    small_docs = [str(i.path.relative_to(ROOT)) for i in infos if i.word_count < 30]

    return {
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "total_markdown_files": len(infos),
        "total_words": sum(i.word_count for i in infos),
        "avg_words_per_doc": int(sum(i.word_count for i in infos) / len(infos)) if infos else 0,
        "missing_top_title_candidates": missing_titles,
        "small_docs_candidates": small_docs,
        "documents": [
            {
                "path": str(i.path.relative_to(ROOT)),
                "title": i.title,
                "word_count": i.word_count,
                "heading_count": i.heading_count,
                "summary": i.first_paragraph,
            }
            for i in infos
        ],
    }


def _top_docs_by_keywords(infos: list[DocInfo], keywords: list[str], limit: int = 20) -> list[DocInfo]:
    scored: list[tuple[int, DocInfo]] = []
    for info in infos:
        hay = f"{info.title} {info.path.name} {info.first_paragraph}".lower()
        score = sum(2 for kw in keywords if kw in hay)
        if score == 0:
            continue
        scored.append((score, info))
    scored.sort(key=lambda item: (-item[0], -item[1].word_count, str(item[1].path)))
    return [info for _, info in scored[:limit]]


def _render_doc_list(items: list[DocInfo]) -> str:
    lines: list[str] = []
    for i in items:
        rel = i.path.relative_to(ROOT).as_posix()
        summary = i.first_paragraph or "No summary detected."
        lines.append(f"- **{i.title}** (`{rel}`)  ")
        lines.append(f"  {summary}")
    return "\n".join(lines) if lines else "- No matching documents found."


def _generate_markdown(profile: str, infos: list[DocInfo], scan: dict) -> str:
    metrics = _repo_metrics()
    commits = _git_recent_commits()
    now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")

    if profile == "user":
        focus = _top_docs_by_keywords(
            infos,
            ["readme", "deploy", "guide", "runbook", "cli", "mobile", "frontend", "quick", "start", "usage"],
            limit=30,
        )
        audience = "End users, operators, and security analysts"
        checklist = """- Install and run local stack from repository root.
- Use CLI and web interfaces for scanning and reporting workflows.
- Follow deployment and testing guides before environment changes.
- Use runbooks for incident and notification operations."""
        title = "CosmicSec User Documentation (Detailed)"
    elif profile == "developer":
        focus = _top_docs_by_keywords(
            infos,
            ["architecture", "contributing", "testing", "directory", "roadmap", "development", "sdk", "service", "api", "security"],
            limit=35,
        )
        audience = "Developers, maintainers, and platform engineers"
        checklist = """- Set up Python/Node toolchains and run all tests locally.
- Validate service boundaries and contracts before changes.
- Keep workflows and quality gates green before merge.
- Update roadmap and runbooks with behavior-level changes."""
        title = "CosmicSec Developer & Development Documentation (Detailed)"
    else:
        focus = _top_docs_by_keywords(
            infos,
            ["production", "deploy", "health", "status", "progress", "security", "compliance", "roadmap", "monitor", "runbook"],
            limit=35,
        )
        audience = "Production operators, release owners, and leadership stakeholders"
        checklist = """- Validate build, test, quality, and security workflow outcomes.
- Review current roadmap completion and active risk areas.
- Confirm deployment and rollback instructions are current.
- Track release health using generated reports and CI artifacts."""
        title = "CosmicSec Production Status & Progress Documentation (Detailed)"

    commit_lines = "\n".join(f"- `{line}`" for line in commits) if commits else "- No commit data available."

    md = f"""# {title}

> Generated automatically from repository documentation and metadata.

## Metadata
- Generated at: {now}
- Audience: {audience}
- Markdown files scanned: {scan['total_markdown_files']}
- Aggregate documentation words: {scan['total_words']}
- Average words per document: {scan['avg_words_per_doc']}

## Project Snapshot
- Python files: {metrics['python_files']}
- TypeScript files: {metrics['typescript_files']}
- Service directories: {metrics['service_directories']}
- Test files: {metrics['test_files']}
- Workflow files: {metrics['workflow_files']}

## Action Checklist
{checklist}

## Priority Documentation Map
{_render_doc_list(focus)}

## Recent Commits
{commit_lines}

## Documentation Quality Flags
- Candidate docs missing explicit top title: {len(scan['missing_top_title_candidates'])}
- Candidate very small docs (<30 words): {len(scan['small_docs_candidates'])}

### Missing Top Title Candidates
"""
    if scan["missing_top_title_candidates"]:
        md += "\n".join(f"- `{p}`" for p in scan["missing_top_title_candidates"][:60]) + "\n"
    else:
        md += "- None\n"

    md += """
### Very Small Docs Candidates
"""
    if scan["small_docs_candidates"]:
        md += "\n".join(f"- `{p}`" for p in scan["small_docs_candidates"][:60]) + "\n"
    else:
        md += "- None\n"

    return md


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate detailed docs from repository markdown.")
    parser.add_argument("--profile", choices=["user", "developer", "production"], required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--scan-output", required=True)
    args = parser.parse_args()

    markdown_files = _iter_markdown_files(ROOT)
    infos = [_parse_markdown(p) for p in markdown_files]
    scan = _docs_scan(markdown_files)

    output_path = ROOT / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(_generate_markdown(args.profile, infos, scan), encoding="utf-8")

    scan_path = ROOT / args.scan_output
    scan_path.parent.mkdir(parents=True, exist_ok=True)
    scan_path.write_text(json.dumps(scan, indent=2), encoding="utf-8")

    print(f"Generated {args.profile} documentation at {output_path}")
    print(f"Wrote scan report at {scan_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
