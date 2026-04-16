# CosmicSec CLI — Getting Started

## Install

```bash
cd cli/agent
pip install -e .
```

## Configure and verify

```bash
cosmicsec-agent connect --server wss://app.cosmicsec.io --api-key <API_KEY>
cosmicsec-agent status
```

## Run first scan

```bash
cosmicsec-agent discover
cosmicsec-agent scan --target scanme.nmap.org --tool nmap
```

Expected workflow:
1. `discover` confirms local tool availability.
2. `scan` queues execution and writes findings to local history/offline store.
3. Use `history list` and `history findings` to inspect results immediately.

## Work offline

```bash
cosmicsec-agent scan --target 192.168.1.20 --all --offline
cosmicsec-agent offline export --format json --output-file findings.json
```

## Useful follow-ups

```bash
cosmicsec-agent history list --limit 20
cosmicsec-agent history findings --severity critical --format table
cosmicsec-agent completions install --shell bash
cosmicsec-agent ai setup
cosmicsec-agent plugin list
cosmicsec-agent sync status
```

## Documentation map

- `docs/cli/authentication.md`
- `docs/cli/installation.md`
- `docs/cli/scanning.md`
- `docs/cli/ai-features.md`
- `docs/cli/workflows.md`
- `docs/cli/ci-cd.md`
- `docs/cli/plugins.md`
- `docs/cli/troubleshooting.md`
- `docs/cli/cosmicsec-agent.1`
