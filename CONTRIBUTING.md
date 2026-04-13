# Contributing to CosmicSec

Thank you for your interest in contributing to CosmicSec! We welcome contributions that advance **ethical cybersecurity research, education, and authorized security tooling**. By contributing, you agree to uphold the ethical standards described in our [LICENSE](LICENSE) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Table of Contents

1. [Before You Start](#before-you-start)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Branching Strategy](#branching-strategy)
5. [Commit Conventions](#commit-conventions)
6. [Code Style & Quality](#code-style--quality)
7. [Testing Requirements](#testing-requirements)
8. [Submitting a Pull Request](#submitting-a-pull-request)
9. [Issue Reporting](#issue-reporting)
10. [Security Vulnerabilities](#security-vulnerabilities)
11. [Scope & Restrictions](#scope--restrictions)

---

## Before You Start

- Read the [README](README.md) for project overview and architecture.
- Read the [LICENSE](LICENSE) — contributions must comply with the ethical use restrictions.
- Read the [Security Policy](SECURITY.md) before reporting any vulnerability.
- Search [existing issues](https://github.com/mufthakherul/CosmicSec/issues) and [pull requests](https://github.com/mufthakherul/CosmicSec/pulls) to avoid duplicates.

For significant features or design changes, **open an issue first** to discuss the approach before writing code.

---

## Development Setup

### Requirements

- Python 3.9–3.12
- Docker & Docker Compose
- `git`

### Local Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/CosmicSec.git
cd CosmicSec

# 2. Add the upstream remote
git remote add upstream https://github.com/mufthakherul/CosmicSec.git

# 3. Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 4. Install dependencies (including dev extras)
pip install -r requirements.txt
# Or with Poetry:
poetry install

# 5. Set up environment variables
cp .env.example .env
# Edit .env with local configuration (never commit .env)

# 6. Run pre-commit hooks (first time)
pre-commit install
```

### Running Services Locally

```bash
# All services via Docker Compose
docker-compose up --build

# A single service for faster iteration
uvicorn services.auth_service.main:app --port 8001 --reload
```

---

## Project Structure

Key directories relevant to contributors:

```
services/          # One directory per microservice
cosmicsec_platform/ # Shared contracts, middleware, platform utils
sdk/               # Public SDK (be careful — this is a public API surface)
plugins/           # Official and community plugins
tests/             # All tests (mirror the services/ structure)
```

> **Private/Restricted modules** are marked in code with `# PRIVATE` or `# RESTRICTED` comments. Do not expose internal APIs from these modules in public-facing interfaces.

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, always deployable |
| `develop` | Integration branch for next release |
| `feature/<name>` | New feature work |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation-only changes |
| `security/<name>` | Security fixes (may be kept private until patched) |

**Always branch off `develop`**, not `main`:

```bash
git fetch upstream
git checkout develop
git pull upstream develop
git checkout -b feature/my-feature
```

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:**

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change without new feature or bug fix |
| `test` | Adding or fixing tests |
| `chore` | Build, CI, dependency updates |
| `security` | Security-related fix or hardening |
| `perf` | Performance improvement |

**Examples:**

```
feat(scan_service): add continuous monitor Celery beat schedule
fix(auth_service): handle expired TOTP token edge case
docs(contributing): add branching strategy section
security(api_gateway): enforce rate limit on unauthenticated endpoints
```

---

## Code Style & Quality

We enforce consistent style using the following tools (all configured in `pyproject.toml`):

| Tool | Purpose | Command |
|------|---------|---------|
| [Black](https://black.readthedocs.io) | Code formatting | `black .` |
| [isort](https://pycqa.github.io/isort/) | Import ordering | `isort .` |
| [Flake8](https://flake8.pycqa.org) | Linting | `flake8 .` |
| [mypy](https://mypy.readthedocs.io) | Type checking | `mypy .` |

**Run all checks at once:**

```bash
black . && isort . && flake8 . && mypy .
```

Pre-commit hooks (`.pre-commit-config.yaml`) run these checks automatically before each commit.

**Key conventions:**

- Line length: **100 characters** (Black/isort configured)
- Target Python versions: 3.9, 3.10, 3.11, 3.12
- Use type annotations on all public functions and methods
- Do not commit secrets, credentials, API keys, or private data
- Keep microservices self-contained — avoid cross-service imports outside `cosmicsec_platform/`

---

## Testing Requirements

- All new features **must** include tests
- All bug fixes **must** include a regression test
- Tests live in `tests/` and mirror the `services/` structure (e.g., `tests/auth_service/`)
- Minimum coverage expectation: **80%** for new code

**Run tests:**

```bash
# Full test suite
pytest tests/ -v --cov=services --cov-report=term-missing

# A single service
pytest tests/auth_service/ -v

# With coverage HTML report
pytest tests/ --cov=services --cov-report=html
```

---

## Submitting a Pull Request

1. **Sync your fork** with the latest `develop`:
   ```bash
   git fetch upstream && git rebase upstream/develop
   ```

2. **Run all checks** before pushing:
   ```bash
   black . && isort . && flake8 . && mypy . && pytest tests/
   ```

3. **Push your branch** and open a PR against `develop`:
   ```bash
   git push origin feature/my-feature
   ```

4. **Fill in the PR template** completely.

5. **PR checklist before requesting review:**
   - [ ] Code follows style guidelines (Black, isort, Flake8, mypy pass)
   - [ ] Tests added/updated and all tests pass
   - [ ] No secrets or credentials in the diff
   - [ ] Ethical use compliance verified (no offensive tooling added without explicit scope)
   - [ ] Documentation updated if necessary
   - [ ] Commit messages follow Conventional Commits

6. A maintainer will review your PR. Be prepared for feedback and iterations.

---

## Issue Reporting

Use the appropriate GitHub issue template:

- **Bug Report** — for unexpected behaviour or errors
- **Feature Request** — for new capabilities or improvements

Please provide as much context as possible. Vague issues may be closed without action.

---

## Security Vulnerabilities

**Do NOT open a public GitHub issue for security vulnerabilities.**

Follow the [Security Policy](SECURITY.md) for responsible disclosure. Security reports should be emailed to **mufthakherul_cybersec@s6742.me** with the subject line `[SECURITY] CosmicSec Vulnerability Report`.

---

## Scope & Restrictions

Contributions that fall outside the ethical use scope will be rejected:

- No contributions that enable **unauthorized access, surveillance, or exploitation** of systems without owner consent
- No contributions that add **malware delivery, phishing automation, or offensive AI** capabilities
- No contributions that expose **PRIVATE / RESTRICTED module APIs** to unauthorized users
- No contributions that introduce **commercial redistribution** mechanisms

When in doubt, open an issue and discuss with maintainers before writing code.

---

Thank you for helping make CosmicSec better for the ethical security community! 🛡️
