# CosmicSec CLI Workflows

## Recon + analysis workflow

```bash
cosmicsec-agent run "scan 10.0.0.0/24 with nmap and then generate report"
```

## CI-friendly workflow

```bash
cosmicsec-agent scan --target "$TARGET" --all
cosmicsec-agent history findings --severity critical --output json
```

## Offline-first workflow

```bash
cosmicsec-agent scan --target 192.168.1.20 --tool nmap
cosmicsec-agent sync status
cosmicsec-agent sync push
cosmicsec-agent sync pull --from-file findings.json
cosmicsec-agent sync optimize
```

## Team profile workflow

```bash
cosmicsec-agent profile add dev --server https://dev.cosmicsec.io
cosmicsec-agent profile add prod --server https://app.cosmicsec.io
cosmicsec-agent profile use prod
```

## Plugin lifecycle workflow

```bash
cosmicsec-agent plugin create acme-custom --author "Acme Security"
cosmicsec-agent plugin install ./acme-custom
cosmicsec-agent plugin info acme-custom
cosmicsec-agent plugin disable acme-custom
cosmicsec-agent plugin enable acme-custom
```
