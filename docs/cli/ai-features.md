# CosmicSec CLI AI Features

## Hybrid execution modes

- `static`: rule-based planning only
- `dynamic`: AI planning first
- `hybrid`: AI + static fallback

```bash
cosmicsec-agent mode show
cosmicsec-agent run "scan 192.168.1.1 with nmap then analyze findings"
```

## Offline AI setup (Ollama)

```bash
cosmicsec-agent ai setup
cosmicsec-agent ai setup --model-general llama3.1 --model-code codellama
```

## Plan-only preview

```bash
cosmicsec-agent plan "scan example.com with all tools" --mode hybrid
```

## Local-first fallback chain

1. OpenAI when configured
2. CosmicSec cloud AI when connected
3. Ollama when offline and available
4. Local rule-based planner as safe fallback
