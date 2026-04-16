# CosmicSec CLI Scanning

## Discover installed tools

```bash
cosmicsec-agent discover
```

## Single-tool scan

```bash
cosmicsec-agent scan --target scanme.nmap.org --tool nmap
```

## Parallel all-tool scan

```bash
cosmicsec-agent scan --target 10.10.10.10 --all --parallel 4
```

## Output options

```bash
cosmicsec-agent history list --output table
cosmicsec-agent history findings --severity critical --output json
```

## History and diff

```bash
cosmicsec-agent history list --limit 20
cosmicsec-agent history diff <scan-id-a> <scan-id-b>
```
