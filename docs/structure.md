# CosmicSec Directory Structure

> Supplemental structure overview.
> Canonical structure mapping remains in `docs/DIRECTORY_STRUCTURE.md`.

## Repository Layout

```text
CosmicSec/
├── .github/                # GitHub Actions CI/CD workflows
├── alembic/                # PostgreSQL database migration scripts
├── cli/                    # Python CLI Agent source code
│   └── agent/
│       ├── cosmicsec_agent/ # Core logic (execution, hybrid engine)
│       └── tests/          # CLI agent unit tests
├── cosmicsec_platform/     # Shared middleware, profiles, and core platform configs
├── docs/                   # Architectural documents, roadmaps, and diagrams
├── frontend/               # React 19 + TypeScript + Vite web app
│   ├── src/
│   │   ├── components/     # Reusable UI elements
│   │   ├── pages/          # Full route pages (Dashboard, AI Chat, Scans)
│   │   ├── services/       # Centralized API clients
│   │   └── store/          # Zustand state management
├── infrastructure/         # Terraform, Traefik, Docker configurations
├── ingest/                 # Rust high-speed ingest pipelines
├── plugins/                # Plugin ecosystem and signing tools
├── scripts/                # Development helpers (compose wrappers, DB setup)
├── sdk/                    # Official SDKs (TypeScript, Python, Go)
├── services/               # Backend microservices (FastAPI)
│   ├── api_gateway/        # Main entrypoint, routing, WAF
│   ├── auth_service/       # Identity and RBAC
│   ├── scan_service/       # Vulnerability scanning engine
│   ├── ai_service/         # LangChain / AI inference
│   ├── recon_service/      # OSINT and intelligence
│   ├── report_service/     # Reporting generation
│   ├── collab_service/     # Real-time WebSocket rooms
│   ├── bugbounty_service/  # Bounty lifecycle tracking
│   ├── common/             # Shared libraries (DB models, startup checks, middleware)
│   └── ...                 # Other microservices
└── tests/                  # Backend unit, integration, and E2E tests
```

---

## Scope Note

This file provides a quick structural overview.
Canonical repository mapping and status tracking remain in `docs/DIRECTORY_STRUCTURE.md`, `ROADMAP.md`, `report.md`, and `gap_analysis.md`.
