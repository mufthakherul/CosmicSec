# CosmicSec CLI Troubleshooting

## No tools discovered

Run:

```bash
cosmicsec-agent discover
```

Verify tools are installed and available on `PATH`.

## Authentication issues

```bash
cosmicsec-agent auth status
cosmicsec-agent profile list
```

If needed:

```bash
cosmicsec-agent auth logout --force
cosmicsec-agent auth login --server <URL> --api-key <KEY>
```

## Ollama unreachable for offline AI

```bash
cosmicsec-agent ai setup
```

If setup fails, ensure Ollama daemon is running at `http://localhost:11434`.

## Pending offline findings not syncing

```bash
cosmicsec-agent sync status
cosmicsec-agent sync push
```

Ensure the active profile has a configured server endpoint.
