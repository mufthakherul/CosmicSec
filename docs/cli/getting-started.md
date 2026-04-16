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

## Work offline

```bash
cosmicsec-agent scan --target 192.168.1.20 --all --offline
cosmicsec-agent offline export --format json --output-file findings.json
```

## Useful follow-ups

```bash
cosmicsec-agent history list --limit 20
cosmicsec-agent completions install --shell bash
```
