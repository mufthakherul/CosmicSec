# 🛡️ CosmicSec — Universal Cybersecurity Intelligence Platform

[![License: Custom MIT + Ethical Use](https://img.shields.io/badge/License-Custom%20MIT%20%2B%20Ethical%20Use-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Code Style: Black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

> **⚠️ Authorized & Ethical Use Only.** CosmicSec is designed exclusively for ethical cybersecurity research, authorized penetration testing, and blue-team training. See [LICENSE](LICENSE) for full terms.

---

## What is CosmicSec?

CosmicSec is a **hybrid, AI-powered cybersecurity intelligence platform** that unifies vulnerability scanning, recon, threat analysis, reporting, and team collaboration into a single platform. It serves three user modes:

| Mode | User Type | Where Code Runs | Access |
|------|-----------|-----------------|--------|
| `STATIC` | Public / Unregistered | Server-side (pre-rendered) | Landing page, feature demo |
| `DYNAMIC` | Registered Dashboard User | Cloud / self-hosted microservices | Full dashboard, real-time scans, AI analysis |
| `LOCAL` | CLI / Local-Agent User | User's own machine | Terminal agent, local tool orchestration, optional cloud sync |

---

## ✨ Key Features

- **Hybrid Architecture** — intelligently routes requests between static, dynamic, and local-agent modes via a single API Gateway
- **AI-Powered Analysis** — LangChain-backed threat intelligence, MITRE ATT&CK mapping, zero-day prediction, anomaly detection
- **Distributed Scanning** — multi-engine scanner with Celery task queues, continuous monitoring, smart scan orchestration
- **Recon Engine** — DNS, Shodan, VirusTotal, crt.sh, RDAP, passive reconnaissance
- **Rich Reporting** — PDF, DOCX, JSON, CSV, HTML; compliance templates (OWASP, NIST, ISO 27001); attack-path visualization
- **Team Collaboration** — real-time WebSocket rooms, presence tracking, team chat, @mentions
- **Plugin Ecosystem** — extensible SDK with official plugins (nmap, metasploit, Jira, Slack, report exporters)
- **Enterprise RBAC** — JWT + OAuth2, TOTP/2FA, Casbin-based fine-grained permissions
- **CLI Local Agent** — discovers and orchestrates installed tools (nmap, nikto, sqlmap, metasploit) on the user's device

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Internet / User                       │
│                                                         │
│  ┌──────────────┐         ┌───────────────────────────┐ │
│  │  Unregistered│         │  Registered Web User      │ │
│  │   Browser    │         │      Browser              │ │
│  └──────┬───────┘         └────────────┬──────────────┘ │
│         │ STATIC mode                  │ DYNAMIC mode   │
│         ▼                              ▼                │
│  ┌────────────────────────────────────────────────────┐ │
│  │           CosmicSec API Gateway  (:8000)           │ │
│  │     HybridRouter · RBAC · WebSocket · Rate Limit   │ │
│  └────────────┬───────────────────────────────────────┘ │
│               │                                         │
│  ┌────────────┴─────────────────────────────────────┐   │
│  │              Microservices                       │   │
│  │  Auth:8001  Scan:8002  AI:8003  Recon:8004       │   │
│  │  Report:8005  Collab:8006  Plugins:8007          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │     CLI / Local Agent  (user's machine)            │ │
│  │   cosmicsec-agent → nmap / nikto / sqlmap / etc.  │ │
│  │   streams JSON results → WebSocket / REST          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Microservices

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | HybridRouter, RBAC, WebSocket, rate limiting, Prometheus metrics |
| Auth Service | 8001 | JWT, OAuth2, TOTP/2FA, Casbin RBAC, session management |
| Scan Service | 8002 | Distributed scanner, smart scanner, continuous monitor, Celery tasks |
| AI Service | 8003 | LangChain, ChromaDB, MITRE ATT&CK, anomaly detection, zero-day predictor |
| Recon Service | 8004 | DNS, Shodan, VirusTotal, crt.sh, RDAP passive recon |
| Report Service | 8005 | Multi-format reports, compliance templates, topology & heatmap visualizations |
| Collab Service | 8006 | WebSocket rooms, presence tracking, team chat, @mentions |
| Plugin Registry | 8007 | Plugin SDK, official plugins (nmap, metasploit, jira, slack) |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9–3.12
- Docker & Docker Compose
- Redis
- PostgreSQL
- MongoDB (for AI/threat intel storage)

### Clone & Setup

```bash
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Install dependencies
pip install -r requirements.txt

# Or with Poetry
poetry install
```

### Run with Docker

```bash
docker-compose up --build
```

The API Gateway will be available at `http://localhost:8000`.

### Run Individual Services

```bash
# API Gateway
uvicorn services.api_gateway.main:app --port 8000 --reload

# Auth Service
uvicorn services.auth_service.main:app --port 8001 --reload
```

### Run Tests

```bash
pytest tests/ -v --cov=services --cov-report=term-missing
```

### Linting & Formatting

```bash
black .
isort .
flake8 .
mypy .
```

---

## 📁 Project Structure

```
CosmicSec/
├── services/               # Microservice implementations
│   ├── api_gateway/        # HybridRouter, middleware, RBAC
│   ├── auth_service/       # JWT, OAuth2, 2FA
│   ├── scan_service/       # Distributed scanner, Celery workers
│   ├── ai_service/         # LangChain, MITRE ATT&CK, threat intel
│   ├── recon_service/      # Passive recon engines
│   ├── report_service/     # Multi-format report generation
│   └── collab_service/     # Real-time collaboration
├── cosmicsec_platform/     # Shared contracts, middleware, utilities
├── frontend/               # Web UI
├── sdk/                    # Public SDK for CLI / integrations
├── plugins/                # Plugin Registry, community plugins, official plugin examples
├── infrastructure/         # Kubernetes, Terraform, CI/CD configs
├── scripts/                # Dev, migration, seed scripts
├── tests/                  # Test suite
├── alembic/                # Database migrations
└── docs/                   # Extended documentation
```

---

## 🔌 Plugin Development

CosmicSec supports community plugins via the Plugin SDK. See [`sdk/`](sdk/) for the SDK and [`plugins/`](plugins/) for official plugin examples.

```python
from plugins.sdk import PluginBase

class MyPlugin(PluginBase):
    name = "my-plugin"
    version = "1.0.0"

    async def run(self, context):
        # Your plugin logic here
        ...
```

---

## 🤝 Contributing

We welcome contributions from the security community! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

---

## 🔒 Security

Found a vulnerability? Please follow our [responsible disclosure policy](SECURITY.md) — **do not open a public GitHub issue for security vulnerabilities**.

---

## 📜 License

This project is licensed under a **Custom MIT License with Ethical Use & AI Restriction Clauses**. See [LICENSE](LICENSE) for full terms.

**TL;DR**: Free for ethical cybersecurity research, education, and authorized engagements. Commercial use and offensive/unethical use are prohibited without explicit written permission.

---

## 👤 Author

**Mufthakherul Islam Miraz**
- Website: [mufthakherul.github.io](https://mufthakherul.github.io)
- Email: mufthakherul_cybersec@s6742.me

---

## 🌟 Acknowledgements

CosmicSec is built on the shoulders of giants in the open-source security community. We gratefully acknowledge FastAPI, LangChain, Celery, MITRE ATT&CK, and all contributors whose libraries make this platform possible.
