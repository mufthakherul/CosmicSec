from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import tomllib
except ImportError:  # pragma: no cover
    import tomli as tomllib  # type: ignore[no-redef]


ROOT = Path(__file__).resolve().parents[1]
PYPROJECT = ROOT / "cli" / "agent" / "pyproject.toml"
OUTPUT = ROOT / "docs" / "cli" / "cosmicsec-agent.1"


def cli_version() -> str:
    data = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))
    return str(data.get("project", {}).get("version", "0.0.0"))


def build_manpage(version: str) -> str:
    return f""".TH COSMICSEC-AGENT 1 "CosmicSec" "v{version}" "User Commands"
.SH NAME
cosmicsec-agent \\- local-first AI-powered security automation CLI
.SH SYNOPSIS
.B cosmicsec-agent
[GLOBAL OPTIONS] COMMAND [ARGS]...
.br
.B cosmicsec
[GLOBAL OPTIONS] COMMAND [ARGS]...
.SH DESCRIPTION
CosmicSec Agent discovers local security tooling, executes scans, stores findings offline,
and optionally syncs to CosmicSec cloud.
.SH GLOBAL OPTIONS
.TP
.B --profile
Use a specific saved profile.
.TP
.B -o, --output
Output format: table, json, yaml, csv, quiet.
.TP
.B --no-color
Disable ANSI colors for scripting and CI output.
.TP
.B -v, --verbose
Increase verbosity.
.TP
.B --version
Show version and runtime details.
.SH MAIN COMMANDS
.TP
.B discover
List discovered local security tools.
.TP
.B run
Execute natural-language instructions via static, dynamic, or hybrid mode.
.TP
.B scan
Run scan tasks with one or many tools.
.TP
.B history
Inspect scan history, findings, diffs, and stats.
.TP
.B config
Get, set, list, reset, and edit CLI settings.
.TP
.B theme
Theme management (list, set, current, preview).
.TP
.B ai
Configure local AI models and provider setup.
.TP
.B plugin
Create, install, list, remove, and search plugins.
.TP
.B sync
Offline sync status, push, and maintenance commands.
.SH FILES
.TP
.I ~/.cosmicsec/config.json
Credential and runtime settings.
.TP
.I ~/.cosmicsec/settings.toml
User-adjustable CLI settings.
.TP
.I ~/.cosmicsec/offline.db
Offline scan findings database.
.SH EXAMPLES
.TP
.B cosmicsec-agent discover
Inspect available local security tools.
.TP
.B cosmicsec-agent scan --target scanme.nmap.org --all
Run a broad local scan.
.TP
.B cosmicsec-agent history findings --severity critical -o json
Export critical findings in JSON.
.TP
.B cosmicsec-agent theme set neon
Switch to neon theme profile.
.SH SEE ALSO
Detailed docs are available in:
.br
docs/cli/getting-started.md
.br
docs/cli/installation.md
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate cosmicsec-agent man page.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if generated output differs from the checked-in man page.",
    )
    args = parser.parse_args()

    version = cli_version()
    rendered = build_manpage(version)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != rendered:
            print(f"{OUTPUT} is out of date. Run scripts/generate-cli-manpage.py", file=sys.stderr)
            raise SystemExit(1)
        print(f"{OUTPUT} is up to date")
        return

    OUTPUT.write_text(rendered, encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
