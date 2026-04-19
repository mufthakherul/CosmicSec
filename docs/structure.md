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

## Progress Tracking

### ✅ What is Already Done
- Repository modularized into explicit domains (`frontend`, `services`, `cli`, `infrastructure`).
- `services/common/` expanded with `startup.py`, `error_handling.py`, and `request_middleware.py`.
- Shared `models.py` unified across all Python microservices.
- Removed legacy test files and consolidated test suites into `tests/` and service-specific directories.

### 🚧 What Needs to be Implemented
- **SDK Parity**: Bring Python and Go SDKs up to the exact feature set of the TypeScript SDK.
- **Rust Ingest Pipeline**: Finalize the `ingest/` folder logic for processing high-volume nmap XML logs at wire speed.

### 🔄 What Needs to be Updated/Modified
- **Tests Structure**: Migrate all scattered tests directly into `tests/` to prevent path resolution errors during pytest execution.
- **Frontend Components**: Break down massive page files (e.g., `AIChatPage.tsx`) into smaller, domain-driven components.

### ❌ What Needs to be Removed (Deprecation Phase)
- **Legacy SOC naming references**: Keep older Phase5 naming retired in favor of `services/professional_soc_service/`.
- **Mobile app stubs**: Keep mobile as experimental until feature parity and product readiness are confirmed.
