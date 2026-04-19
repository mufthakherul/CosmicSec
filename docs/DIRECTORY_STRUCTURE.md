# CosmicSec — Project Directory Structure

> **Last updated:** 2026-04-14 — Phase J additions included.

This document describes the full directory layout of the CosmicSec repository.

```text
CosmicSec/
│
├── 📦 services/                         # Runtime microservices (Python · FastAPI)
│   ├── api_gateway/                     # :8000 — HybridRouter, RBAC, WebSocket, GraphQL, WAF
│   │   ├── main.py                      # Full gateway app (~2500 lines), all routes
│   │   ├── graphql_runtime.py           # GraphQL schema + resolvers mounted at /graphql
│   │   ├── policy_registry.py           # Per-route auth & fallback policies
│   │   └── static_profiles.py           # Static/demo fallback response handlers
│   ├── auth_service/                    # :8001 — JWT, OAuth2, TOTP/2FA, Casbin RBAC
│   │   └── rbac/                        # Casbin policy model + enforcement
│   ├── scan_service/                    # :8002 — Distributed scanner, Celery tasks
│   │   ├── distributed_scanner.py       # Multi-worker scan orchestration
│   │   ├── smart_scanner.py             # Adaptive scan strategy engine
│   │   ├── continuous_monitor.py        # Background continuous monitoring
│   │   ├── api_fuzzer.py                # API fuzzing module
│   │   └── container_scanner.py         # Docker/OCI image scanning
│   ├── ai_service/                      # :8003 — LangChain, ChromaDB, MITRE ATT&CK, Ollama
│   ├── recon_service/                   # :8004 — DNS, Shodan, VirusTotal, crt.sh, RDAP
│   ├── report_service/                  # :8005 — PDF/DOCX/HTML/CSV/JSON, compliance templates
│   ├── collab_service/                  # :8006 — WebSocket rooms, presence, @mentions
│   ├── plugin_registry/ → plugins/      # :8007 — Plugin SDK + official plugins
│   ├── integration_service/             # :8008 — SIEM (Splunk/Elastic), 3rd-party integrations
│   │   └── siem_connector.py            # Splunk HEC + Elastic SIEM connector
│   ├── bugbounty_service/               # :8009 — HackerOne/Bugcrowd/Intigriti workflows
│   ├── phase5_service/                  # :8010 — SOC ops, incident response, SAST, DevSecOps
│   ├── agent_relay/                     # :8011 — CLI agent WebSocket hub, task dispatch
│   ├── notification_service/            # :8012 — Email, Slack, webhook notifications
│   ├── admin_service/                   # — Typer CLI, AsyncSSH shell, Textual TUI, MFA audit
│   └── common/                          # Shared runtime modules (imported by all services)
│       ├── models.py                    # SQLAlchemy ORM models (all 16 tables)
│       ├── db.py                        # Async PostgreSQL session factory
│       ├── logging.py                   # Structured JSON logging w/ correlation IDs
│       ├── caching.py                   # Redis caching helpers w/ TTL + tags
│       ├── exceptions.py                # Standardized error codes + CosmicSecException
│       ├── versioning.py                # API versioning middleware + deprecation warnings
│       └── observability.py             # OpenTelemetry + Sentry bootstrap
│
├── 🏛️ cosmicsec_platform/               # Shared platform middleware (gateway runtime)
│   ├── middleware/
│   │   ├── hybrid_router.py             # HybridRouter: STATIC/DYNAMIC/LOCAL/DEMO/EMERGENCY
│   │   ├── policy_registry.py           # Auth & fallback policies per route
│   │   └── static_profiles.py           # 8 demo fallback handlers
│   └── contracts/
│       └── runtime_metadata.py          # Contract versioning + _runtime metadata envelope
│
├── 🖥️ frontend/                         # Web UI (React 19 · TypeScript · Vite · Tailwind 4)
│   ├── public/                          # Static assets served at /
│   │   ├── favicon.svg                  # SVG favicon (shield logo)
│   │   ├── manifest.json                # PWA web app manifest
│   │   ├── og-image.svg                 # Open Graph / social preview image (1200×630)
│   │   └── robots.txt                   # Crawler instructions
│   ├── src/
│   │   ├── App.tsx                      # Root router with all routes
│   │   ├── main.tsx                     # React entrypoint
│   │   ├── index.css                    # Tailwind CSS base + custom tokens
│   │   ├── pages/                       # All page components (~20 pages)
│   │   │   ├── LandingPage.tsx          # Public marketing page
│   │   │   ├── DashboardPage.tsx        # Security Operations home (score gauge, stats)
│   │   │   ├── ScanPage.tsx             # Live WebSocket scan progress + findings
│   │   │   ├── AIAnalysisPage.tsx       # Risk gauge, MITRE ATT&CK table
│   │   │   ├── ReconPage.tsx            # DNS, Shodan, VirusTotal panels
│   │   │   ├── ReportsPage.tsx          # Generate & download reports
│   │   │   ├── TimelinePage.tsx         # Unified cross-source event timeline
│   │   │   ├── AgentsPage.tsx           # CLI agent status, tools, dispatch
│   │   │   ├── SettingsPage.tsx         # Appearance, notifications, security settings
│   │   │   ├── Phase5OperationsPage.tsx # SOC metrics, incident response
│   │   │   ├── AdminDashboardPage.tsx   # Users, audit logs, module toggles
│   │   │   ├── BugBountyPage.tsx        # Program list, submission workflow
│   │   │   ├── ProfilePage.tsx          # API keys, notification preferences
│   │   │   ├── DemoSandboxPage.tsx      # Public read-only feature demo
│   │   │   ├── PricingPage.tsx          # Pricing / plans page
│   │   │   ├── LoginPage.tsx            # JWT auth login
│   │   │   ├── RegisterPage.tsx         # User registration
│   │   │   ├── TwoFactorPage.tsx        # TOTP 2FA challenge
│   │   │   ├── ForgotPasswordPage.tsx   # Password reset flow
│   │   │   └── NotFoundPage.tsx         # 404 page with animated gradient
│   │   ├── components/                  # Shared UI components
│   │   │   ├── AppLayout.tsx            # Root layout (sidebar + header + content)
│   │   │   ├── Sidebar.tsx              # Collapsible nav (mobile-responsive, role-gated)
│   │   │   ├── Header.tsx               # Desktop header: search, theme, bell, avatar
│   │   │   ├── ErrorBoundary.tsx        # React error boundary (full-app crash guard)
│   │   │   ├── Toast.tsx                # Toast notification system
│   │   │   └── ui/                      # Primitive UI components (SkipLink, etc.)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx          # Auth state: JWT, user info, login/logout
│   │   │   └── ThemeContext.tsx         # Dark/light theme with OS preference + localStorage
│   │   ├── router/
│   │   │   └── ProtectedRoute.tsx       # Auth guard + role-based redirect
│   │   ├── services/                    # API client functions (fetch wrappers)
│   │   ├── hooks/                       # Custom React hooks
│   │   ├── store/                       # Zustand state stores
│   │   ├── lib/
│   │   │   └── utils.ts                 # cn() TailwindCSS merge utility
│   │   └── data/                        # Static/mock data for demo mode
│   ├── tests/
│   │   └── e2e/                         # Playwright E2E smoke tests
│   ├── index.html                       # Full meta tags, OG, PWA manifest link, favicon
│   ├── vite.config.ts                   # Vite config (Vitest test block included)
│   ├── tailwind.config.js               # Tailwind v4 configuration
│   └── package.json                     # npm package (name: cosmicsec, version: 1.0.0)
│
├── 🤖 cli/                              # Local CLI agent
│   ├── agent/
│   │   ├── cosmicsec_agent/             # Python package: tool discovery, task runner, WS stream
│   │   ├── tests/                       # Agent unit tests
│   │   └── pyproject.toml               # CLI agent package config (PyPI publishable)
│   └── README.md                        # CLI agent install & usage guide
│
├── 🦀 ingest/                           # Rust high-speed ingest pipeline
│   ├── src/                             # Rust source (async Tokio, serde, reqwest)
│   └── Cargo.toml                       # Rust package manifest
│
├── 📦 sdk/                              # Multi-language SDKs
│   ├── python/                          # Python SDK: httpx sync, envelope parser
│   ├── typescript/                      # TypeScript SDK: @cosmicsec/sdk, 14 methods + WS client
│   └── go/                              # Go SDK: 13 methods, JWT/API-key auth, go.mod
│
├── 🔌 plugins/                          # Plugin ecosystem
│   ├── sdk/
│   │   └── base.py                      # PluginBase abstract class
│   ├── registry.py                      # Plugin registry service (port 8007)
│   └── official/                        # Official plugins: nmap, metasploit, jira, slack, report
│
├── 🏗️ infrastructure/                   # Infrastructure as Code
│   ├── terraform/
│   │   ├── main.tf                      # AWS RDS, ElastiCache, EKS modules
│   │   └── modules/                     # Reusable Terraform modules
│   ├── argocd/
│   │   ├── application-cosmicsec.yaml   # ArgoCD GitOps application manifest
│   │   └── project.yaml                 # ArgoCD project definition
│   ├── grafana/                         # Grafana dashboard JSON + datasource configs
│   ├── prometheus.yml                   # Prometheus scrape configuration
│   ├── traefik.yml                      # Traefik static config (TLS, entrypoints)
│   ├── traefik-dynamic.yml              # Traefik dynamic config (routers, middlewares)
│   └── init-db.sql                      # PostgreSQL initialization SQL
│
├── ⎈  helm/                             # Kubernetes deployment
│   └── cosmicsec/
│       ├── Chart.yaml                   # Helm chart metadata
│       ├── values.yaml                  # Default values (auto-scaling, health, observability)
│       └── templates/                   # K8s manifest templates
│
├── 🗄️ alembic/                          # Database migrations
│   ├── versions/
│   │   ├── 0001_initial_placeholder.py  # Initial migration
│   │   └── 0002_initial_schema.py       # All 16 tables (users, scans, findings, etc.)
│   └── env.py                           # Alembic environment config
│
├── 🧪 tests/                            # Test suite (1260+ lines)
│   ├── conftest.py                      # Shared pytest fixtures
│   ├── test_api_gateway.py              # Gateway route + hybrid logic tests
│   ├── test_auth_service.py             # Auth flow + RBAC tests
│   ├── test_scan_service.py             # Scanner + continuous monitor tests
│   ├── test_ai_service.py               # AI service + MITRE ATT&CK tests
│   ├── test_recon_service.py            # Recon + OSINT tests
│   ├── test_report_service.py           # Report generation tests
│   ├── test_collab_service.py           # Collab WebSocket tests
│   ├── test_bugbounty_service.py        # Bug bounty workflow tests
│   ├── test_phase5_service.py           # SOC / incident response tests
│   ├── test_integration_service.py      # SIEM + integration tests
│   ├── test_plugin_registry_official.py # Plugin SDK + official plugins tests
│   ├── test_phase2_plugins_mitre.py     # MITRE + phase 2 tests
│   ├── test_phase4_advanced_ai.py       # Advanced AI pipeline tests
│   ├── test_defensive_ai.py             # Defensive AI tests
│   ├── test_docker_env.py               # Docker environment validation
│   ├── integration/
│   │   └── test_gateway_proxies.py      # Integration: gateway → service proxy
│   └── e2e/
│       ├── test_hybrid_flow.py          # E2E: STATIC → DYNAMIC hybrid routing
│       ├── test_agent_flow.py           # E2E: CLI agent registration + task dispatch
│       └── test_static_flow.py          # E2E: static profile fallback responses
│
├── 📚 docs/                             # Documentation
│   ├── DIRECTORY_STRUCTURE.md           # ← this file
│   ├── PROJECT_GOAL_AND_PROGRESS.md     # Project goal, progress snapshot, similar-project analysis
│   ├── DEPLOYMENT_GUIDE.md              # Docker / K8s / Terraform deployment guide
│   ├── TESTING_GUIDE.md                 # Testing strategy, coverage, CI/CD
│   ├── adr/                             # Architecture Decision Records
│   ├── cli/                             # CLI documentation
│   ├── runbooks/                        # Operational runbooks
│   │   ├── add-new-scanner-plugin.md    # How to add a scanner plugin
│   │   ├── add-new-service.md           # How to add a microservice
│   │   ├── database-migration.md        # DB migration procedures
│   │   ├── deploy-production.md         # Production deployment steps
│   │   └── incident-response.md         # Incident response playbook
│   ├── archive/                         # Read-only historical snapshots
│   │   └── roadmaps/                    # Archived roadmap files
│   │       ├── README.md                # Archive index
│   │       ├── ROADMAP_ORIGINAL.md      # Phases A–J (formerly ROADMAP.md)
│   │       ├── ROADMAP_NEXT_ORIGINAL.md # Phases K–V (formerly ROADMAP_NEXT.md)
│   │       └── ROADMAP_CLI_AGENT_ORIGINAL.md  # CA-1–CA-10 (formerly ROADMAP_CLI_AGENT.md)
│   └── assets/                          # Visual brand assets
│       ├── logo.svg                     # Primary logo (512×512, dark background)
│       ├── banner.svg                   # Wide banner (1200×300)
│       ├── project-card.svg             # Project card (1280×640)
│       └── og-image.svg                 # Open Graph image (1200×630) — also in frontend/public/
│
├── 📱 mobile/                           # React Native / Expo mobile companion app
│   ├── App.tsx                          # App entrypoint (static mock — Wave 3 will add real auth)
│   ├── app.json                         # Expo configuration
│   ├── package.json                     # Mobile dependencies (Expo 54, React Native)
│   ├── tsconfig.json                    # TypeScript config
│   └── README.md                        # Mobile quick start
│
├── 🗂️ Archives/                         # Archived / deprecated code (kept for traceability)
│   ├── Codes/                           # Legacy API gateway, docker-compose, plugin snapshots
│   └── Deprecated/                      # Intentionally retired modules
│
├── 📜 .github/
│   ├── workflows/
│   │   ├── test.yml                     # Python + frontend tests + lint + typecheck
│   │   ├── build.yml                    # Docker image builds
│   │   ├── deploy.yml                   # Deployment pipeline
│   │   ├── security-scan.yml            # Trivy filesystem scan
│   │   ├── codeql.yml                   # CodeQL analysis (Python + TypeScript)
│   │   └── publish-agent.yml            # PyPI publish (OIDC trusted publishing)
│   ├── dependabot.yml                   # Automated dependency updates (pip, npm, actions)
│   ├── ISSUE_TEMPLATE/                  # Bug report + feature request templates
│   └── PULL_REQUEST_TEMPLATE.md         # PR template
│
├── docker-compose.yml                   # Full stack (16 services + observability)
├── Dockerfile                           # Base Python image
├── Makefile                             # lint, format, test, docker targets
├── pyproject.toml                       # Poetry + Ruff + mypy configuration
├── requirements.txt                     # pip dependencies
├── alembic.ini                          # Alembic config
├── .env.example                         # Environment variables template
├── .pre-commit-config.yaml              # Pre-commit hooks (Ruff, trailing whitespace)
├── ROADMAP.md                           # Active roadmap
├── ROADMAP_NEXT.md                      # Redirect stub → ROADMAP.md
├── ROADMAP_CLI_AGENT.md                 # Redirect stub → ROADMAP.md
├── README.md                            # Project README
├── SECURITY.md                          # Security policy + responsible disclosure
├── CONTRIBUTING.md                      # Contribution guidelines
├── CODE_OF_CONDUCT.md                   # Community code of conduct
└── LICENSE                              # Custom MIT + Ethical Use license
```

## Key Counts

| Category | Count |
|----------|-------|
| Backend microservices | 13 |
| Frontend pages | 20 |
| Python test files | 16 |
| SDK languages | 3 (Python, TypeScript, Go) |
| Database tables | 16 |
| GitHub Actions workflows | 6 |
| Docker Compose services | 16+ (including observability) |
| Documented API endpoints | 100+ |
| Planned access modes | 8 (3 stable + 5 in Wave 2–3) |

