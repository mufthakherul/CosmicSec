# CosmicSec CLI in CI/CD

## Install

```bash
pip install ./cli/agent
```

## Example pipeline step

```bash
cosmicsec-agent discover
cosmicsec-agent scan --target "$TARGET" --all --parallel 4
cosmicsec-agent history findings --severity critical --output json > critical-findings.json
```

## Non-interactive auth

```bash
cosmicsec-agent auth login \
  --server "$COSMICSEC_SERVER" \
  --api-key "$COSMICSEC_API_KEY"
```

## Useful exit-code behavior

- scan failures propagate non-zero exit codes (`5` for scan/tool execution errors)
- auth/validation failures return non-zero and should fail the pipeline
