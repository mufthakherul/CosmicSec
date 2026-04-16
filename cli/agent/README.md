# CosmicSec Agent CLI

CosmicSec Agent is a local-first security automation CLI that discovers tools on your machine, executes scans, and syncs results to CosmicSec cloud when available.

## Quick Start

```bash
cd cli/agent
pip install -e .
cosmicsec-agent discover
cosmicsec-agent scan --target 127.0.0.1 --tool nmap
```

## Core Commands

### Discovery

```bash
cosmicsec-agent discover
cosmicsec-agent tools --json
```

### Scan execution

```bash
# single tool
cosmicsec-agent scan --target 192.168.1.10 --tool nmap

# all discovered tools
cosmicsec-agent scan --target scanme.nmap.org --all

# offline mode
cosmicsec-agent scan --target 10.0.0.15 --tool nuclei --offline
```

### Cloud connectivity

```bash
cosmicsec-agent connect --server wss://app.cosmicsec.io --api-key <API_KEY>
cosmicsec-agent status
```

### Offline data export

```bash
cosmicsec-agent offline export --format json --output-file findings.json
cosmicsec-agent offline export --format csv --output-file findings.csv
```

## Configuration

- Main config: `~/.cosmicsec/config.json`
- Offline store: `~/.cosmicsec/offline.db`
- Environment variables:
  - `COSMICSEC_SERVER`
  - `COSMICSEC_API_KEY`
  - `COSMICSEC_CONFIG_PATH`

## Shell Completions

```bash
cosmicsec-agent completions install
cosmicsec-agent completions show --shell bash
```

## Troubleshooting

- Use `cosmicsec-agent discover --json` to verify tool detection.
- Use `cosmicsec-agent status` to inspect connection state and unsynced findings.
- Use `cosmicsec-agent history list --limit 10 --output json` to inspect recent runs.
