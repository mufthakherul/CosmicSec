# 🎯 CosmicSec Quick Start Guide

## Getting Started in 5 Minutes

This guide will help you get CosmicSec up and running quickly for evaluation and testing.

---

## Prerequisites

- Python 3.9+
- Docker & Docker Compose
- Git
- 8GB RAM minimum
- 20GB free disk space

---

## Option 1: Quick Start (Current Version)

### 1. Clone the Repository
```bash
git clone https://github.com/mufthakherul/hacker_ai.git
cd hacker_ai
```

### 2. Install Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
# Edit root .env and add API keys (optional)
nano .env
```

### 4. Run the Application
```bash
# Launch API gateway
uvicorn services.api_gateway.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Option 2: Docker Setup (Recommended for Testing)

### 1. Using Docker Compose
```bash
# Clone repository
git clone https://github.com/mufthakherul/hacker_ai.git
cd hacker_ai

# Start with Docker Compose
docker compose up -d

# Access the application
# Web dashboard: http://localhost:3000
# API docs: http://localhost:8000/api/docs
```

### 2. Docker Compose Configuration
```yaml
# docker-compose.yml (create this file)
services:
  api-gateway:
    build:
      context: .
      dockerfile: services/api_gateway/Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./:/app
    command: uvicorn services.api_gateway.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    image: node:20-alpine
    working_dir: /app/frontend
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 3000"
    ports:
      - "3000:3000"
    volumes:
      - ./:/app

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=cosmicsec
      - POSTGRES_USER=hacker
      - POSTGRES_PASSWORD=changeme
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Option 3: Future Modern Stack (Phase 1 Implementation)

Once Phase 1 is implemented, you'll be able to use:

### 1. Full Stack Deployment
```bash
# Clone repository
git clone https://github.com/mufthakherul/hacker_ai.git
cd hacker_ai

# Start all services
make dev-up

# Access web dashboard
# http://localhost:3000

# Access API docs
# http://localhost:8000/docs
```

### 2. Kubernetes Deployment
```bash
# Install with Helm
helm repo add hacker-ai https://charts.hacker-ai.io
helm install hacker-ai hacker-ai/hacker-ai

# Access dashboard
kubectl port-forward svc/hacker-ai-web 3000:3000
```

---

## Basic Usage

### Using the API & Services

1. **Check platform health**
```bash
curl http://localhost:8000/health
```

2. **Create a scan via gateway**
```bash
curl -X POST http://localhost:8000/api/scans \
  -H "Content-Type: application/json" \
  -d '{"target":"example.com","scan_types":["network","web"],"depth":1}'
```

3. **Run recon**
```python
import requests

r = requests.post("http://localhost:8000/api/recon", json={"target": "example.com"}, timeout=15)
print(r.json())
```

### Using Individual Modules

#### AI health check
```python
import requests
print(requests.get("http://localhost:8000/api/ai/health", timeout=10).json())
```

#### Runtime mode visibility
```python
import requests
print(requests.get("http://localhost:8000/api/runtime/mode", timeout=10).json())
```

---

## Configuration

### Environment Variables

Create a `.env` file in the repository root:

```env
# API Keys
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
SHODAN_API_KEY=...

# Database (for future use)
DATABASE_URL=postgresql://user:pass@localhost/cosmicsec
REDIS_URL=redis://localhost:6379

# Application
DEBUG=true
LOG_LEVEL=INFO
MAX_WORKERS=4

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret
```

### Multi-tenant setup

Use API endpoints (`/api/orgs`, `/api/orgs/{org_id}/workspaces`, `/api/orgs/{org_id}/quotas`) instead of local JSON profile files.

---

## Testing the Installation

### 1. Run Built-in Tests
```bash
# If tests are available
pytest tests/ -v

# Basic verification
curl http://localhost:8000/health
```

### 2. Verify Modules
```bash
# Count service Python modules
python -c "
from pathlib import Path
modules = list(Path('services').rglob('*.py'))
print(f'Found {len(modules)} Python modules')
"
```

### 3. Test Basic Functionality
```python
import requests
print(requests.get("http://localhost:8000/health", timeout=10).json())
print(requests.get("http://localhost:8000/api/runtime/mode", timeout=10).json())
```

---

## Common Issues & Solutions

### Issue 1: Import Errors
```bash
# Solution: Install in development mode
pip install -e .
```

### Issue 2: Missing Dependencies
```bash
# Solution: Reinstall all dependencies
pip install --upgrade -r requirements.txt
```

### Issue 3: Permission Errors
```bash
# Solution: Run with appropriate permissions
# Some scanning features may require root/admin
sudo uvicorn services.api_gateway.main:app --host 0.0.0.0 --port 8000
```

### Issue 4: API Key Errors
```bash
# Solution: Set environment variables
export OPENAI_API_KEY="your-key-here"
# Or add to .env file
```

---

## Next Steps

### 1. Explore Documentation
```bash
# Read comprehensive guides
cd docs/
cat MODERNIZATION_ROADMAP.md
cat IMPLEMENTATION_GUIDE.md
cat FEATURES_SPEC.md
```

### 2. Review Current Features
- Check `docs/main_features.md`
- Explore service directories under `services/`:
  - `services/scan_service/`
  - `services/recon_service/`
  - `services/ai_service/`
  - `services/report_service/`

### 3. Plan Your Implementation
- Review `MODERNIZATION_ROADMAP.md` for upgrade path
- Check `IMPLEMENTATION_GUIDE.md` for step-by-step instructions
- See `ARCHITECTURE_DIAGRAM.md` for system design

### 4. Join the Community
- Star the repository on GitHub
- Report issues
- Submit pull requests
- Join discussions

---

## Development Workflow

### 1. Set Up Development Environment
```bash
# Install development dependencies
pip install -r requirements-dev.txt  # Create this file

# Install pre-commit hooks
pre-commit install

# Run code quality checks
black cosmicsec/
flake8 cosmicsec/
mypy cosmicsec/
```

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes and Test
```bash
# Make your changes
# ...

# Run tests
pytest tests/

# Run linters
black cosmicsec/
flake8 cosmicsec/
```

### 4. Submit Pull Request
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name

# Create PR on GitHub
```

---

## Production Deployment (Future)

Once modernization is complete, production deployment will be:

### 1. Cloud Deployment
```bash
# AWS
terraform apply -var-file=environments/production.tfvars

# Kubernetes
helm install hacker-ai ./charts/hacker-ai \
  --namespace production \
  --values values.production.yaml
```

### 2. Monitoring Setup
```bash
# Prometheus + Grafana
kubectl apply -f monitoring/prometheus.yaml
kubectl apply -f monitoring/grafana.yaml

# Access dashboards
kubectl port-forward svc/grafana 3000:3000
```

---

## Performance Tips

### 1. Optimize Scanning Speed
- Use multiple workers for concurrent scans
- Enable caching for repeated scans
- Use distributed scanning (future feature)

### 2. Resource Management
```python
# config.py
MAX_CONCURRENT_SCANS = 5
SCAN_TIMEOUT = 300  # seconds
CACHE_TTL = 3600  # 1 hour
```

### 3. Database Optimization
- Create indexes on frequently queried fields
- Use connection pooling
- Enable query caching

---

## Security Best Practices

### 1. API Key Management
- Never commit API keys to Git
- Use environment variables or secrets management
- Rotate keys regularly

### 2. Secure Configuration
```python
# Secure defaults
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### 3. Access Control
- Use strong passwords
- Enable 2FA
- Implement RBAC
- Regular access reviews

---

## Getting Help

### Documentation
- 📚 Full Documentation: `/docs`
- 🏗️ Architecture: `docs/ARCHITECTURE_DIAGRAM.md`
- 🚀 Roadmap: `docs/MODERNIZATION_ROADMAP.md`
- 📝 Implementation: `docs/IMPLEMENTATION_GUIDE.md`

### Support Channels
- 🐛 Issues: https://github.com/mufthakherul/cosmicsec/issues
- 💬 Discussions: https://github.com/mufthakherul/cosmicsec/discussions
- 📧 Email: mufthakherul_cybersec@s6742.me
- 🌐 Website: https://mufthakherul.github.io

### Community
- Star the repo to show support
- Watch for updates
- Contribute to discussions
- Submit feature requests

---

## License & Legal

This tool is for **educational and authorized security testing only**.

- Read `LICENSE` for license details
- Review `SECURITY.md` for security policies
- Check `terms_of_use.md` for usage terms
- Ensure compliance with local laws

⚠️ **Disclaimer**: Only use this tool on systems you own or have explicit permission to test.

---

## What's Next?

Now that you have CosmicSec running:

1. ✅ Explore the current features
2. 📖 Read the modernization roadmap
3. 🏗️ Plan Phase 1 implementation
4. 🤝 Contribute to the project
5. 🚀 Help build the future of security tooling

**Happy Hacking! 🎩**
