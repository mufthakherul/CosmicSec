# CosmicSec Developer & Development Documentation (Detailed)

> Generated automatically from repository documentation and metadata.

## Metadata
- Generated at: 2026-05-05 05:28 UTC
- Audience: Developers, maintainers, and platform engineers
- Markdown files scanned: 65
- Aggregate documentation words: 0
- Average words per document: 0

## Project Snapshot
- Python files: 204
- TypeScript files: 108
- Service directories: 17
- Test files: 29
- Workflow files: 28

## Action Checklist
- Set up Python/Node toolchains and run all tests locally.
- Validate service boundaries and contracts before changes.
- Keep workflows and quality gates green before merge.
- Update roadmap and runbooks with behavior-level changes.

## Priority Documentation Map
- **Changelog** (`CHANGELOG.md`)  
  * add DX linting/docs uplift and roadmap progress updates ([0d61e1d](https://github.com/mufthakherul/CosmicSec/commit/0d61e1d3c7f30cca2df4ca6dd45a9c1a905e959a)) * add UUID validation for agent_id, regenerate frontend lockfile, additional improvements ([5c26498](https://github.com/mufthakherul/CosmicSec/commit/5c26498a2d296819e34ba1cc08e3bf1e4675d9a8)) * **api:** add SSO authorization and callback routes for external 
- **Contributing to CosmicSec** (`CONTRIBUTING.md`)  
  Thank you for your interest in contributing to CosmicSec! We welcome contributions that advance **ethical cybersecurity research, education, and authorized security tooling**. By contributing, you agree to uphold the ethical standards described in our [LICENSE](LICENSE) and [Code of Conduct](CODE_OF_CONDUCT.md).
- **CosmicSec Comprehensive Redesign Roadmap** (`ROADMAP.md`)  
  **Version:** 2.0 — Unified Platform Architecture **Last Updated:** April 19, 2026 **Target Release:** Q3 2026 (12 weeks)
- **Service Discovery & Console Log Fix** (`docs/SERVICE_DISCOVERY_FIX.md`)  
  **Before Implementation:** ``` Issue: Inconsistent service routing in console logs - Console shows: "Connecting to api-gateway:8000" - Local dev expects: "Connecting to localhost:8000" - Causes confusion and connectivity errors
- **CosmicSec Architecture** (`docs/architecture.md`)  
  > Supplemental architecture narrative. > Canonical implementation status remains in `report.md`, `ROADMAP.md`, and `gap_analysis.md`.
- **cosmicsec-go-sdk** (`sdk/go/README.md`)  
  Official Go SDK for the [CosmicSec](https://cosmicsec.io) Universal Cybersecurity Intelligence Platform.
- **@cosmicsec/sdk — TypeScript SDK** (`sdk/typescript/README.md`)  
  Official TypeScript/JavaScript SDK for the [CosmicSec](https://cosmicsec.io) Universal Cybersecurity Intelligence Platform.
- **Code of Conduct** (`CODE_OF_CONDUCT.md`)  
  CosmicSec exists to advance **ethical cybersecurity** — protecting systems, educating defenders, and empowering authorized security professionals. As contributors and maintainers, we pledge to make participation in this project a respectful, harassment-free experience for everyone, regardless of background, experience level, or identity.
- **Quick Start Guide - Implementation Summary** (`QUICK_START.md`)  
  **Problem Solved:** Developers no longer need to reconfigure services when switching between Windows, Linux, and macOS.
- **CosmicSec CLI Agent Roadmap → Moved** (`ROADMAP_CLI_AGENT.md`)  
  > ⚠️ **This file has been replaced.** The active roadmap is now in: > > **[`ROADMAP.md`](ROADMAP.md)** > > Historical snapshots of the old CLI agent phases CA-1–CA-10 are preserved in: > > **[`docs/archive/roadmaps/ROADMAP_CLI_AGENT_ORIGINAL.md`](docs/archive/roadmaps/ROADMAP_CLI_AGENT_ORIGINAL.md)**
- **CosmicSec Next-Generation Roadmap → Moved** (`ROADMAP_NEXT.md`)  
  > ⚠️ **This file has been replaced.** The active roadmap is now in: > > **[`ROADMAP.md`](ROADMAP.md)** > > Historical snapshots of the old roadmap phases K–V are preserved in: > > **[`docs/archive/roadmaps/ROADMAP_NEXT_ORIGINAL.md`](docs/archive/roadmaps/ROADMAP_NEXT_ORIGINAL.md)**
- **Security Policy** (`SECURITY.md`)  
  CosmicSec is a cybersecurity platform. We take security seriously and are committed to responsible disclosure. If you discover a vulnerability in CosmicSec itself, please follow the process below.
- **CosmicSec CLI Agent** (`cli/README.md`)  
  The CosmicSec local agent discovers and runs security tools on your machine, streams findings to the CosmicSec cloud platform, and supports full offline operation with automatic sync on reconnect.
- **CosmicSec Agent CLI** (`cli/agent/README.md`)  
  CosmicSec Agent is a local-first security automation CLI that discovers tools on your machine, executes scans, and syncs results to CosmicSec cloud when available.
- **Cross-Platform Development Guide** (`docs/CROSS_PLATFORM_GUIDE.md`)  
  > Seamless development across Windows, Linux, and macOS without reconfiguration.
- **CosmicSec — Project Directory Structure** (`docs/DIRECTORY_STRUCTURE.md`)  
  > **Last updated:** 2026-04-14 — Phase J additions included.
- **CosmicSec Multi-Channel Method Expansion Roadmap** (`docs/ROADMAP_CHANNEL_EXPANSION.md`)  
  - Program scope completion: 100% - Document completion: 100% - Implementation status: Completed for defined channel-integration scope
- **Test Configuration for Vitest (Frontend)** (`docs/TESTING_GUIDE.md`)  
  """ CosmicSec Testing & Quality Assurance Setup Comprehensive testing strategy covering unit, integration, E2E, and performance tests """
- **ADR-001: Why FastAPI (vs Flask, Django)** (`docs/adr/ADR-001-fastapi-over-flask.md`)  
  **Status**: Accepted **Date**: 2026-01-15 **Authors**: CosmicSec Platform Team
- **Archived Roadmaps** (`docs/archive/roadmaps/README.md`)  
  These files are **read-only historical snapshots**. They document the planning work that led to the CosmicSec v1 release and the platform's initial growth phases (A–J, K–V, CA-1–CA-10).
- **CosmicSec CLI Agent — Dedicated Implementation Roadmap** (`docs/archive/roadmaps/ROADMAP_CLI_AGENT_ORIGINAL.md`)  
  > ⚠️ **ARCHIVED** — This is a read-only historical snapshot (formerly `ROADMAP_CLI_AGENT.md`). > Active planning is in [`ROADMAP.md`](../../../ROADMAP.md). Do not edit this file.
- **CosmicSec — Next-Generation Implementation Roadmap (v2)** (`docs/archive/roadmaps/ROADMAP_NEXT_ORIGINAL.md`)  
  > ⚠️ **ARCHIVED** — This is a read-only historical snapshot (formerly `ROADMAP_NEXT.md`). > Active planning is in [`ROADMAP.md`](../../../ROADMAP.md). Do not edit this file.
- **CosmicSec — Hybrid Platform Roadmap** (`docs/archive/roadmaps/ROADMAP_ORIGINAL.md`)  
  > ⚠️ **ARCHIVED** — This is a read-only historical snapshot (formerly `ROADMAP.md`). > Active planning is in [`ROADMAP.md`](../../../ROADMAP.md). Do not edit this file.
- **CosmicSec CLI Authentication** (`docs/cli/authentication.md`)  
  ```bash cosmicsec-agent auth login --server https://app.cosmicsec.io --api-key <API_KEY> ```
- **CosmicSec Flowchart** (`docs/flowchart.md`)  
  > Supplemental execution-flow view. > Canonical implementation status remains in `report.md`, `ROADMAP.md`, and `gap_analysis.md`.
- **CosmicSec Project Algorithm** (`docs/project_algorithm.md`)  
  > Supplemental algorithm-oriented summary. > Canonical implementation status remains in `report.md`, `ROADMAP.md`, and `gap_analysis.md`.
- **CosmicSec Project Diagram** (`docs/project_diagram.md`)  
  > Supplemental component-level visualization. > Canonical implementation status remains in `report.md`, `ROADMAP.md`, and `gap_analysis.md`.
- **Runbook: Adding a New Scanner Plugin** (`docs/runbooks/add-new-scanner-plugin.md`)  
  **Audience**: Security engineers, plugin contributors **Last updated**: 2026-04-16
- **Runbook: Adding a New Microservice** (`docs/runbooks/add-new-service.md`)  
  **Audience**: Backend developers **Last updated**: 2026-04-16
- **CosmicSec Incident Response Runbook** (`docs/runbooks/incident-response.md`)  
  | Level | Response Time | Examples | |-------|--------------|---------| | **P1 — Critical** | 15 min | Service completely down, data breach, auth bypass | | **P2 — High** | 1 hour | Performance degradation >50%, partial outage | | **P3 — Medium** | 4 hours | Single feature broken, minor data inconsistency | | **P4 — Low** | Next business day | UI glitch, non-critical feature degraded |
- **CosmicSec Directory Structure** (`docs/structure.md`)  
  > Supplemental structure overview. > Canonical structure mapping remains in `docs/DIRECTORY_STRUCTURE.md`.
- **CosmicSec Project Analysis & Redesign Report** (`report.md`)  
  **Date:** April 19, 2026 **Project:** CosmicSec — Universal Cybersecurity Intelligence Platform **Target Users:** Cybersecurity & hacking professionals **Vision:** Unified local+cloud automation platform with AI assistance

## Recent Commits
- `cfd16a0 fix(security): resolve lint gate failures and patch rust advisories`
- `bada906 fix(ci): resolve typecheck, e2e runtime, and alembic head split`
- `fae035d fix(api): update service ports and refine gateway route checks`
- `9f41cac Merge branch 'main' of https://github.com/mufthakherul/CosmicSec`
- `d22379f Add automated login verification script using Playwright`
- `5bd8b35 Merge pull request #88 from mufthakherul/automation/main-security-autofix-24632204870`
- `3ad1f0c Merge pull request #89 from mufthakherul/automation/recommit-24650435002`
- `08cc221 Merge pull request #86 from mufthakherul/automation/docs-suite`

## Documentation Quality Flags
- Candidate docs missing explicit top title: 1
- Candidate very small docs (<30 words): 65

### Missing Top Title Candidates
- `CHANGELOG.md`

### Very Small Docs Candidates
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `DEPENDENCY_AUDIT.md`
- `IMPLEMENTATION_CHECKLIST.md`
- `IMPROVEMENTS_SUMMARY.md`
- `QUICK_START.md`
- `README.md`
- `ROADMAP.md`
- `ROADMAP_CLI_AGENT.md`
- `ROADMAP_NEXT.md`
- `SECURITY.md`
- `SESSION_COMPLETION_REPORT.md`
- `cli/README.md`
- `cli/agent/README.md`
- `cli/agent/npm/README.md`
- `docs/CROSS_PLATFORM_GUIDE.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/DIRECTORY_STRUCTURE.md`
- `docs/DOCKER_TROUBLESHOOTING.md`
- `docs/HOSTING_REQUIREMENTS.md`
- `docs/IMPLEMENTATION_SUMMARY.md`
- `docs/PROJECT_GOAL_AND_PROGRESS.md`
- `docs/ROADMAP_CHANNEL_EXPANSION.md`
- `docs/SERVICE_DISCOVERY_FIX.md`
- `docs/TESTING_GUIDE.md`
- `docs/adr/ADR-001-fastapi-over-flask.md`
- `docs/adr/ADR-002-postgresql-over-mysql.md`
- `docs/adr/ADR-003-rust-for-ingest.md`
- `docs/adr/ADR-004-nats-for-events.md`
- `docs/adr/ADR-005-zustand-over-redux.md`
- `docs/architecture.md`
- `docs/archive/roadmaps/README.md`
- `docs/archive/roadmaps/ROADMAP_CLI_AGENT_ORIGINAL.md`
- `docs/archive/roadmaps/ROADMAP_NEXT_ORIGINAL.md`
- `docs/archive/roadmaps/ROADMAP_ORIGINAL.md`
- `docs/cli/ai-features.md`
- `docs/cli/authentication.md`
- `docs/cli/ci-cd.md`
- `docs/cli/getting-started.md`
- `docs/cli/installation.md`
- `docs/cli/plugins.md`
- `docs/cli/scanning.md`
- `docs/cli/troubleshooting.md`
- `docs/cli/workflows.md`
- `docs/flowchart.md`
- `docs/generated/USER_GUIDE_DETAILED.md`
- `docs/project_algorithm.md`
- `docs/project_diagram.md`
- `docs/runbooks/MULTI_CHANNEL_NOTIFICATIONS.md`
- `docs/runbooks/add-new-scanner-plugin.md`
- `docs/runbooks/add-new-service.md`
- `docs/runbooks/database-migration.md`
- `docs/runbooks/deploy-production.md`
- `docs/runbooks/incident-response.md`
- `docs/structure.md`
- `frontend/src/store/REDUX_SETUP_GUIDE.md`
