# CosmicSec Directory Structure

This structure reflects the current, cleaned repository layout.

```text
CosmicSec/
├── services/                    # Runtime microservices (FastAPI)
│   ├── api_gateway/             # Entry gateway, hybrid routing, GraphQL runtime
│   ├── auth_service/
│   ├── scan_service/
│   ├── ai_service/
│   ├── recon_service/
│   ├── report_service/
│   ├── collab_service/
│   ├── integration_service/
│   ├── bugbounty_service/
│   ├── phase5_service/
│   ├── notification_service/
│   ├── plugin_registry/
│   └── agent_relay/
├── cosmicsec_platform/          # Shared middleware/contracts for hybrid runtime
├── frontend/                    # React 19 + Tailwind 4 web UI
├── cli/                         # Local agent package + CLI assets
├── ingest/                      # Rust high-speed ingest pipeline
├── sdk/                         # Python / TypeScript / Go SDKs
├── infrastructure/              # Terraform, Traefik, Prometheus, ArgoCD
├── helm/                        # Kubernetes Helm chart
├── alembic/                     # Database migrations
├── tests/                       # Unit, integration, e2e tests
├── docs/                        # Architecture, deployment, enhancement docs
│   └── assets/                  # Logo, social card, visual assets
├── Archives/                    # Archived/deprecated code & references
└── scripts/                     # Utility scripts (KB loaders, tooling)
```

## Notes

- `Archives/Deprecated/` holds intentionally retired modules retained for traceability.
- `services/common/` contains active shared runtime modules (logging, caching, versioning, observability, exceptions).
- GraphQL runtime is active at `services/api_gateway/graphql_runtime.py`.
