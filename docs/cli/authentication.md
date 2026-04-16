# CosmicSec CLI Authentication

## Login with API key

```bash
cosmicsec-agent auth login --server https://app.cosmicsec.io --api-key <API_KEY>
```

## Token-based login

```bash
cosmicsec-agent auth login --server https://app.cosmicsec.io --token <ACCESS_TOKEN> --refresh-token <REFRESH_TOKEN>
```

## Check current auth context

```bash
cosmicsec-agent auth status
cosmicsec-agent profile show
```

## Rotate credentials

```bash
cosmicsec-agent auth refresh
cosmicsec-agent auth logout --force
```

## Multi-profile workflow

```bash
cosmicsec-agent profile add staging --server https://staging.cosmicsec.io
cosmicsec-agent profile use staging
```
