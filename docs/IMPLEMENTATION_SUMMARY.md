# CosmicSec Cross-Platform & Self-Hosting Implementation Summary

> **Implementation Date:** April 17, 2026

## Overview

CosmicSec now includes automatic cross-platform support and self-hosting capabilities. Developers can seamlessly switch between Windows, Linux, and macOS without manual reconfiguration.

---

## What Was Implemented

### 1. Cross-Platform OS Detection (`cosmicsec_platform/config.py`)

**Features:**
- Automatic detection of operating system (Windows, Linux, macOS)
- Automatic detection of deployment environment (local dev, Docker, Kubernetes, self-hosted)
- OS-specific path resolution for logs, cache, and config files
- Singleton pattern for consistent configuration across the application

**Usage:**
```python
from cosmicsec_platform.config import get_config

config = get_config()
print(config.os_type)           # OSType.WINDOWS | LINUX | MACOS
print(config.deployment_mode)   # DeploymentMode.LOCAL_DEV | DOCKER | etc
print(config.is_windows)        # True/False
print(config.get_logs_dir())    # OS-specific path
```

### 2. Service Discovery Manager (`cosmicsec_platform/service_discovery.py`)

**Fixes the localhost vs api-gateway issue:**
- In **Docker Compose**: Uses service names (auth-service:8001, scan-service:8002)
- In **Local Development**: Uses localhost:PORT  
- In **Self-Hosted**: Uses configured SERVICE_HOST:PORT

**Usage:**
```python
from cosmicsec_platform.service_discovery import get_service_url

# Automatically uses correct URL based on environment
auth_url = get_service_url("auth")    # http://localhost:8001 or http://auth-service:8001
scan_url = get_service_url("scan")    # http://localhost:8002 or http://scan-service:8002
```

### 3. Updated Service URLs in Core Services

**Modified files:**
- `services/api_gateway/main.py` - Now uses ServiceRegistry instead of hardcoded URLs
- `services/scan_service/main.py` - Uses get_service_url("auth") for Auth Service
- `services/ai_service/langgraph_flow.py` - Uses service discovery for all inter-service calls

### 4. Self-Hosted Setup Script (`scripts/setup-self-hosted.py`)

**Interactive setup for home/server deployment:**
- Checks Docker and Docker Compose prerequisites
- Detects network configuration (local IP, hostname)
- Generates secure environment variables
- Creates Docker Compose override files
- Provides firewall configuration instructions
- Generates Nginx reverse proxy configuration
- Creates systemd service file (for Linux)

**Usage:**
```bash
# Basic setup (auto-detect IP)
python scripts/setup-self-hosted.py

# With specific IP
python scripts/setup-self-hosted.py --ip 192.168.1.100

# With domain and SSL
python scripts/setup-self-hosted.py --domain cosmicsec.example.com --enable-ssl

# With custom port
python scripts/setup-self-hosted.py --port 9000
```

### 5. Comprehensive Documentation

#### [docs/CROSS_PLATFORM_GUIDE.md](../docs/CROSS_PLATFORM_GUIDE.md)
- Detailed guide for cross-platform development
- OS-specific information (Windows, Linux, macOS)
- How automatic detection works
- Switching between environments
- Debugging cross-platform issues
- Best practices

#### [docs/HOSTING_REQUIREMENTS.md](../docs/HOSTING_REQUIREMENTS.md)
- System requirements for different deployment sizes
- Step-by-step self-hosting setup guide
- Cloud hosting options with cost comparison
- Security considerations
- Performance tuning guidelines
- Troubleshooting common issues
- Migration guides (local → self-hosted → cloud)

### 6. Updated Configuration Files

#### `.env.example`
- Documents new deployment mode variables
- Explains service discovery options
- Notes that service URL overrides are now optional
- Includes self-hosted configuration examples

#### `Makefile`
- New commands: `make cross-platform-info`
- New commands: `make setup-self-hosted`
- New commands: `make hosting-guide`

---

## How It Works

### Automatic Detection Hierarchy

```
1. Check explicit COSMICSEC_DEPLOYMENT_MODE env var
   ↓ (if not set)
2. Check if running in Docker container (/.dockerenv, /proc/self/cgroup)
   ↓ (if not Docker)
3. Check for Kubernetes (KUBERNETES_SERVICE_HOST)
   ↓ (if not Kubernetes)
4. Check for self-hosted flag
   ↓ (if not set)
5. Default to LOCAL_DEV
```

### Service URL Resolution

**Example: Getting Auth Service URL**

```python
get_service_url("auth")
```

**Returns:**
- `http://localhost:8001` → Local development (Windows/Linux/macOS)
- `http://auth-service:8001` → Docker Compose environment
- `http://192.168.1.100:8001` → Self-hosted (SERVICE_HOST=192.168.1.100)
- Custom URL if `AUTH_SERVICE_URL` env var is set

---

## Developer Workflow

### Scenario 1: Switch from Windows to Linux

**Before (Manual):**
```
1. Edit docker-compose.yml for Linux paths
2. Update .env file for service hostnames
3. Rebuild containers
4. Wait 5 minutes
5. Manually test connectivity
❌ Error-prone, tedious
```

**After (Automatic):**
```
1. Push to git: git push
2. Pull on Linux: git pull
3. Run: make dev
4. Works immediately ✓
```

### Scenario 2: Deploy from Home Server

**Before:**
```
1. Manually configure service discovery
2. Configure firewall rules manually
3. Setup SSL/TLS certificates manually
4. Create systemd service manually
5. Test connectivity (trial and error)
```

**After:**
```
1. Run: python scripts/setup-self-hosted.py --ip 192.168.1.100
2. Answer a few questions
3. All configs generated automatically ✓
4. Start: docker compose -f docker-compose.yml -f docker-compose.self-hosted.yml up -d
```

---

## Files Modified/Created

### New Files Created
```
✓ cosmicsec_platform/config.py                    (320 lines)
✓ cosmicsec_platform/service_discovery.py         (250 lines)
✓ scripts/setup-self-hosted.py                    (520 lines)
✓ docs/CROSS_PLATFORM_GUIDE.md                    (500+ lines)
✓ docs/HOSTING_REQUIREMENTS.md                    (900+ lines)
```

### Files Modified
```
✓ services/api_gateway/main.py                    (Updated imports + SERVICE_URLS)
✓ services/scan_service/main.py                   (Updated AUTH_SERVICE_URL)
✓ services/ai_service/langgraph_flow.py           (Updated service URLs)
✓ .env.example                                    (Added deployment mode docs)
✓ Makefile                                        (Added new targets)
```

---

## Testing the Implementation

### Test 1: Verify Cross-Platform Detection

```bash
# Check current configuration
docker compose exec api-gateway python -c "
from cosmicsec_platform.config import get_config
config = get_config()
print(f'OS: {config.os_type}')
print(f'Mode: {config.deployment_mode}')
print(f'Is Docker: {config.is_docker}')
"
```

### Test 2: Verify Service Discovery

```bash
# Check service URLs
docker compose exec api-gateway python -c "
from cosmicsec_platform.service_discovery import get_registry
registry = get_registry()
print(registry)
"
```

### Test 3: Test Cross-OS Development

```bash
# On Windows
C:\CosmicSec> make dev
# Services should be available at localhost:8000

# Later on Linux
~/CosmicSec$ git pull
~/CosmicSec$ make dev
# Services should work identically, no configuration needed!
```

### Test 4: Test Self-Hosted Setup

```bash
# Run the setup script
python scripts/setup-self-hosted.py

# Check generated files
ls -la .env.self-hosted
ls -la docker-compose.self-hosted.yml
ls -la nginx.cosmicsec.conf

# Start the deployment
docker compose -f docker-compose.yml -f docker-compose.self-hosted.yml up -d
```

---

## Hosting Recommendations

### For Development (Local Machine)
- **Cost:** Free
- **Setup Time:** 5 minutes
- **Best For:** Individual developers
- **Command:** `make dev`

### For Small Teams (Self-Hosted at Home)
- **Cost:** $0-200/year (electricity)
- **Setup Time:** 45 minutes
- **Requirements:** 24/7 internet, stable connection
- **Command:** `python scripts/setup-self-hosted.py`

### For Small Business (Cloud)
- **Cost:** $100-500/year
- **Setup Time:** 20-30 minutes
- **Providers:** DigitalOcean, Vultr, Linode
- **Deployment:** Manual setup on VPS

### For Enterprise (Managed Cloud)
- **Cost:** $500-5000+/year
- **Setup Time:** 1-2 hours
- **Providers:** AWS, Azure, Google Cloud
- **Features:** 99.99% uptime, advanced security

---

## Troubleshooting

### Issue: Services can't connect

**Check service discovery:**
```bash
# Verify the registry
docker compose exec api-gateway python -c "
from cosmicsec_platform.service_discovery import get_registry
print(get_registry())
"

# Check logs
docker compose logs -f api-gateway | grep -i service
```

### Issue: Wrong OS detected

**Override the detection:**
```bash
# Force specific mode
export COSMICSEC_DEPLOYMENT_MODE=docker
docker compose restart api-gateway
```

### Issue: Port conflicts

```bash
# Find what's using port 8000
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Kill the process and retry
```

---

## Future Enhancements

1. **Kubernetes Support:** Auto-generate K8s manifests
2. **Service Mesh:** Istio integration for advanced routing
3. **Configuration Management:** Consul/etcd integration
4. **Auto-Scaling:** Horizontal pod autoscaling configs
5. **Multi-Region:** Cross-region deployment templates
6. **Blue-Green Deployment:** Zero-downtime update scripts

---

## Documentation References

- **Cross-Platform Guide:** [docs/CROSS_PLATFORM_GUIDE.md](../docs/CROSS_PLATFORM_GUIDE.md)
- **Hosting Requirements:** [docs/HOSTING_REQUIREMENTS.md](../docs/HOSTING_REQUIREMENTS.md)
- **Setup Script:** [scripts/setup-self-hosted.py](../scripts/setup-self-hosted.py)
- **Configuration Module:** [cosmicsec_platform/config.py](../cosmicsec_platform/config.py)
- **Service Discovery:** [cosmicsec_platform/service_discovery.py](../cosmicsec_platform/service_discovery.py)

---

## Implementation Details

### Architecture

```
┌─ Platform Config (OS/Deployment Detection)
│  ├─ Windows/Linux/macOS detection
│  ├─ Docker/Kubernetes/Self-hosted detection
│  └─ OS-specific path resolution
│
├─ Service Registry (Service Discovery)
│  ├─ Maps service keys → URLs
│  ├─ Environment-aware routing
│  └─ Fallback to env var overrides
│
├─ Core Services
│  ├─ API Gateway (uses ServiceRegistry)
│  ├─ Scan Service (uses get_service_url)
│  ├─ AI Service (uses get_service_url)
│  └─ Other services (inherit behavior)
│
└─ Self-Hosted Setup
   ├─ Interactive configuration
   ├─ Security best practices
   └─ Deployment automation
```

### Key Design Decisions

1. **Singleton Pattern:** Single PlatformConfig instance ensures consistent behavior
2. **Lazy Initialization:** Service URLs only resolved when needed
3. **Environment Variable Fallback:** Explicit overrides always take precedence
4. **Backward Compatibility:** Existing hardcoded URLs still work
5. **Graceful Degradation:** Works without external dependencies

---

## Success Metrics

- ✅ Cross-platform development without reconfiguration
- ✅ Service discovery fixed (localhost vs service-name issue resolved)
- ✅ Self-hosting simplified (one-command setup)
- ✅ Comprehensive documentation provided
- ✅ No breaking changes to existing code
- ✅ Backward compatible with current deployments

---

## Questions & Support

For detailed information, see:
- 📖 [Cross-Platform Guide](../docs/CROSS_PLATFORM_GUIDE.md)
- 🚀 [Hosting Requirements](../docs/HOSTING_REQUIREMENTS.md)
- 🔧 [Setup Script Help](../scripts/setup-self-hosted.py) - `python scripts/setup-self-hosted.py --help`

---

**Status:** ✅ Implementation Complete  
**Last Updated:** April 17, 2026  
**Maintainer:** CosmicSec Team
