# Security Policy

## Overview

CosmicSec is a cybersecurity platform. We take security seriously and are committed to responsible disclosure. If you discover a vulnerability in CosmicSec itself, please follow the process below.

> **This policy covers the CosmicSec platform codebase only.** It does not grant permission to test third-party systems, targets, or infrastructure. All security testing must target only systems you own or have explicit written authorization to test.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch (latest) | ✅ Active support |
| Tagged releases (latest minor) | ✅ Active support |
| Older tagged releases | ⚠️ Best-effort only |

---

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.** Public disclosure before a fix is available puts all CosmicSec users at risk.

### How to Report

Send an email to:

**📧 mufthakherul_cybersec@s6742.me**

**Subject line:** `[SECURITY] CosmicSec Vulnerability Report`

### What to Include

Please provide as much of the following as possible:

- **Vulnerability type** (e.g., SQL injection, authentication bypass, SSRF, privilege escalation)
- **Affected component(s)** — service name, file path(s), endpoint(s)
- **Severity assessment** — your view on the impact and exploitability
- **Step-by-step reproduction** — include commands, payloads, screenshots, or PoC code
- **Environment** — version/branch, OS, Python version, Docker vs bare-metal
- **Suggested fix** (optional but appreciated)

Encrypt sensitive reports using the PGP key available at [mufthakherul.github.io](https://mufthakherul.github.io) (if published).

---

## Response Timeline

| Milestone | Target |
|-----------|--------|
| Acknowledgement of report | Within **48 hours** |
| Initial severity assessment | Within **5 business days** |
| Status update / triage complete | Within **10 business days** |
| Patch released (critical/high) | Within **30 days** |
| Patch released (medium/low) | Within **90 days** |
| Public disclosure (coordinated) | After patch is released and users have had reasonable time to update |

If a timeline cannot be met, we will communicate proactively.

---

## Severity Classification

We use a simplified version of the CVSS severity scale:

| Severity | Description | Examples |
|----------|-------------|---------|
| **Critical** | Remote code execution, full auth bypass, platform-wide data breach | Unauthenticated RCE, JWT secret leakage |
| **High** | Significant data exposure, privilege escalation, SSRF to internal services | IDOR on reports, RBAC bypass |
| **Medium** | Limited data exposure, authenticated DoS, information leakage | Verbose error messages leaking stack traces |
| **Low** | Hardening improvements, minor information disclosure | Missing security headers |

---

## In Scope

The following are in scope for security reports:

- All services under `services/` (API Gateway, Auth, Scan, AI, Recon, Report, Collab, Plugin Registry)
- Shared platform code under `cosmicsec_platform/`
- Authentication and authorization logic (JWT, OAuth2, TOTP, Casbin RBAC)
- API Gateway routing, rate limiting, WebSocket handling
- Plugin SDK and plugin execution sandbox
- Frontend application under `frontend/`
- CLI / local-agent under `sdk/`

---

## Out of Scope

The following are **out of scope**:

- Social engineering attacks against project maintainers
- Physical attacks
- Denial-of-service attacks that require significant bandwidth or infrastructure
- Vulnerabilities in third-party dependencies — report those upstream to the dependency maintainer (and notify us if they affect CosmicSec)
- Issues in demo or sandbox environments that intentionally expose limited functionality
- Findings from automated scanners without manual verification and a clear exploit chain
- "Best practice" recommendations without a demonstrated security impact

---

## Safe Harbor

We support responsible security research. If you:

- Act in good faith
- Avoid accessing, modifying, or exfiltrating data beyond what is necessary to demonstrate the vulnerability
- Avoid disrupting production systems or other users
- Report findings promptly through the channel above
- Do not disclose publicly before coordinated disclosure is agreed

…we will not pursue legal action against you and will credit you in the security advisory (unless you prefer to remain anonymous).

---

## Coordinated Disclosure

After a fix is confirmed and released, we will:

1. Publish a GitHub Security Advisory
2. Credit the reporter (with their permission)
3. Tag a new release with the patch

We ask reporters to wait at least **7 days after the patch release** before any public disclosure, to allow users time to update.

---

## Contact

- **Security Email:** mufthakherul_cybersec@s6742.me
- **Project:** [https://github.com/mufthakherul/CosmicSec](https://github.com/mufthakherul/CosmicSec)
- **Author:** [mufthakherul.github.io](https://mufthakherul.github.io)
