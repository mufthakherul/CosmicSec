# Service Discovery & Console Log Fix

## Problem Statement

**Before Implementation:**
```
Issue: Inconsistent service routing in console logs
- Console shows: "Connecting to api-gateway:8000"
- Local dev expects: "Connecting to localhost:8000"
- Causes confusion and connectivity errors

When switching between local dev and Docker:
- Docker uses: service-name:8000 (api-gateway, auth-service, etc)
- Local dev uses: localhost:8000
- Manual reconfiguration required for each environment
```

## Solution Overview

The **ServiceRegistry** automatically detects the environment and provides correct URLs without manual configuration.

---

## Before vs After

### Before (Manual Configuration)

**Local Development Setup (Windows):**
```python
# Had to manually set in docker-compose.dev.yml
environment:
  - AUTH_SERVICE_URL=http://localhost:8001
  - SCAN_SERVICE_URL=http://localhost:8002
  - AI_SERVICE_URL=http://localhost:8003
```

**Docker Compose Setup:**
```python
# Had to manually set in docker-compose.yml
environment:
  - AUTH_SERVICE_URL=http://auth-service:8001
  - SCAN_SERVICE_URL=http://scan-service:8002
  - AI_SERVICE_URL=http://ai-service:8003
```

**Self-Hosted Setup:**
```python
# Had to manually set based on IP
environment:
  - AUTH_SERVICE_URL=http://192.168.1.100:8001
  - SCAN_SERVICE_URL=http://192.168.1.100:8002
  - AI_SERVICE_URL=http://192.168.1.100:8003
```

**Console Logs:**
```
❌ [2026-04-17 10:15:23] Connecting to api-gateway:8000
❌ Error: Cannot resolve api-gateway:8000 (localhost expected)
❌ [2026-04-17 10:15:25] Retrying connection to auth-service:8001
❌ Error: Connection refused (expected localhost:8001)
```

### After (Automatic)

**All Environments (No Configuration Needed):**
```python
from cosmicsec_platform.service_discovery import get_service_url

# Returns correct URL automatically based on environment
auth_url = get_service_url("auth")
scan_url = get_service_url("scan")
ai_url = get_service_url("ai")
```

**Console Logs (Correct URLs):**
```
✓ [2026-04-17 10:15:23] Platform Config: LocalDev environment
✓ [2026-04-17 10:15:23] Service Registry: auth -> http://localhost:8001
✓ [2026-04-17 10:15:23] Connecting to http://localhost:8001
✓ [2026-04-17 10:15:24] Authentication Service: Connected ✓

// Later, same code in Docker Compose:
✓ [2026-04-17 10:15:23] Platform Config: Docker environment
✓ [2026-04-17 10:15:23] Service Registry: auth -> http://auth-service:8001
✓ [2026-04-17 10:15:23] Connecting to http://auth-service:8001
✓ [2026-04-17 10:15:24] Authentication Service: Connected ✓
```

---

## How to Use

### 1. API Gateway (api-gateway/main.py)

**Old way (hardcoded):**
```python
SERVICE_URLS = {
    "auth": "http://auth-service:8001",      # Wrong in local dev
    "scan": "http://scan-service:8002",      # Wrong in local dev
}
```

**New way (automatic):**
```python
from cosmicsec_platform.service_discovery import get_registry

_service_registry = get_registry()
SERVICE_URLS = _service_registry.get_all_urls()
# Returns: 
# - Local dev: {"auth": "http://localhost:8001", ...}
# - Docker: {"auth": "http://auth-service:8001", ...}
```

### 2. Inter-Service Communication

**Old way:**
```python
# scan_service/main.py
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
# Problem: Default is wrong for local dev

async def _fetch_org_quotas(org_id: str) -> dict[str, int]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{AUTH_SERVICE_URL}/orgs/{org_id}/quotas")
```

**New way:**
```python
# scan_service/main.py
from cosmicsec_platform.service_discovery import get_service_url

def _get_auth_service_url() -> str:
    if explicit_url := os.getenv("AUTH_SERVICE_URL"):
        return explicit_url
    return get_service_url("auth")  # Automatic ✓

async def _fetch_org_quotas(org_id: str) -> dict[str, int]:
    async with httpx.AsyncClient() as client:
        auth_url = _get_auth_service_url()
        resp = await client.get(f"{auth_url}/orgs/{org_id}/quotas")
```

### 3. AI Service Workflows

**Old way:**
```python
# langgraph_flow.py
RECON_URL = "http://recon-service:8004"  # Wrong in local dev
SCAN_URL = "http://scan-service:8002"    # Wrong in local dev
AI_URL = "http://ai-service:8003"        # Wrong in local dev
REPORT_URL = "http://report-service:8005" # Wrong in local dev
```

**New way:**
```python
# langgraph_flow.py
from cosmicsec_platform.service_discovery import get_service_url

RECON_URL = get_service_url("recon")    # Automatic ✓
SCAN_URL = get_service_url("scan")      # Automatic ✓
AI_URL = get_service_url("ai")          # Automatic ✓
REPORT_URL = get_service_url("report")  # Automatic ✓
```

---

## Environment Detection in Action

### Local Development (Windows/Linux/macOS)

```
Platform Detection:
├─ OS: Windows/Linux/macOS ✓
├─ /.dockerenv exists? No
├─ KUBERNETES_SERVICE_HOST? No
└─ Conclusion: LOCAL_DEV

Service URLs:
├─ auth → http://localhost:8001 ✓
├─ scan → http://localhost:8002 ✓
├─ ai → http://localhost:8003 ✓
└─ recon → http://localhost:8004 ✓

Console Output:
✓ Service Registry: 13 services registered
✓ API Gateway: http://localhost:8000
✓ Listening for connections...
```

### Docker Compose

```
Platform Detection:
├─ OS: Linux (container OS)
├─ /.dockerenv exists? Yes ✓
├─ COMPOSE_PROJECT_NAME? Yes ✓
└─ Conclusion: DOCKER_COMPOSE

Service URLs:
├─ auth → http://auth-service:8001 ✓
├─ scan → http://scan-service:8002 ✓
├─ ai → http://ai-service:8003 ✓
└─ recon → http://recon-service:8004 ✓

Console Output:
✓ Service Registry: 13 services registered
✓ API Gateway: http://api-gateway:8000
✓ All services discovered via docker network
✓ Listening for connections...
```

### Self-Hosted (192.168.1.100)

```
Platform Detection:
├─ OS: Linux (server OS)
├─ /.dockerenv exists? Yes ✓
├─ SERVICE_HOST set? Yes (192.168.1.100) ✓
└─ Conclusion: SELF_HOSTED

Service URLs:
├─ auth → http://192.168.1.100:8001 ✓
├─ scan → http://192.168.1.100:8002 ✓
├─ ai → http://192.168.1.100:8003 ✓
└─ recon → http://192.168.1.100:8004 ✓

Console Output:
✓ Service Registry: 13 services registered
✓ API Gateway: http://192.168.1.100:8000
✓ Configured for self-hosted deployment
✓ Listening for connections...
```

---

## Console Log Improvement

### Before (Confusing)

```
[2026-04-17 10:15:20.123] INFO: Starting API Gateway...
[2026-04-17 10:15:20.456] INFO: Connecting to auth-service:8001
[2026-04-17 10:15:20.789] ERROR: Connection refused: auth-service:8001
    Why? I'm on Windows, it should be localhost:8001!
    Have I configured the .env correctly? Let me check...
[2026-04-17 10:15:25.123] INFO: Retrying connection to scan-service:8002
[2026-04-17 10:15:25.456] ERROR: Cannot resolve scan-service
    Debugging info would help here... which environment am I in?
[2026-04-17 10:15:30.123] ERROR: GraphQL: Cannot connect to ai-service:8003
[2026-04-17 10:15:30.456] ERROR: Recon service: Cannot reach recon-service:8004
[2026-04-17 10:15:30.789] ERROR: System is unhealthy
```

### After (Clear & Helpful)

```
[2026-04-17 10:15:20.123] INFO: Platform Config: PlatformConfig(os=windows, deployment=local_dev)
[2026-04-17 10:15:20.234] INFO: Service Registry:
[2026-04-17 10:15:20.234]   api_gateway: http://localhost:8000 ✓
[2026-04-17 10:15:20.234]   auth: http://localhost:8001 ✓
[2026-04-17 10:15:20.234]   scan: http://localhost:8002 ✓
[2026-04-17 10:15:20.234]   ai: http://localhost:8003 ✓
[2026-04-17 10:15:20.234]   recon: http://localhost:8004 ✓
[2026-04-17 10:15:20.456] INFO: Starting API Gateway (localhost:8000)...
[2026-04-17 10:15:20.789] INFO: Connecting to http://localhost:8001 (auth)
[2026-04-17 10:15:20.850] INFO: ✓ Auth Service connected
[2026-04-17 10:15:20.950] INFO: ✓ Scan Service connected
[2026-04-17 10:15:21.050] INFO: ✓ AI Service connected
[2026-04-17 10:15:21.150] INFO: ✓ Recon Service connected
[2026-04-17 10:15:21.250] INFO: ✓ All services healthy
[2026-04-17 10:15:21.350] INFO: API Gateway ready - http://localhost:8000/api/docs
```

---

## Switching Environments

### Same Code, Different Results

**Code (services/scan_service/main.py):**
```python
from cosmicsec_platform.service_discovery import get_service_url

auth_url = get_service_url("auth")
print(f"Auth Service: {auth_url}")
```

**Windows Development:**
```bash
C:\CosmicSec> make dev
```
Output: `Auth Service: http://localhost:8001`

**Linux Server (Self-Hosted at 192.168.1.100):**
```bash
ubuntu@server:~/CosmicSec$ python scripts/setup-self-hosted.py --ip 192.168.1.100
ubuntu@server:~/CosmicSec$ docker compose -f docker-compose.yml -f docker-compose.self-hosted.yml up -d
```
Output: `Auth Service: http://192.168.1.100:8001`

**Same code, correct URLs automatically!**

---

## Debugging Service Discovery

### Check Current Configuration

```bash
docker compose exec api-gateway python << 'EOF'
from cosmicsec_platform.config import get_config
from cosmicsec_platform.service_discovery import get_registry

config = get_config()
registry = get_registry()

print(f"OS: {config.os_type.value}")
print(f"Mode: {config.deployment_mode.value}")
print(f"\nService URLs:")
for name, url in sorted(registry.get_all_urls().items()):
    print(f"  {name}: {url}")
EOF
```

### View Service Discovery Logs

```bash
# Enable debug logging
export LOG_LEVEL=debug
docker compose restart api-gateway

# Check logs
docker compose logs -f api-gateway | grep -i "service\|registry\|platform"
```

### Test Service Connectivity

```bash
# From inside a container
docker compose exec api-gateway python << 'EOF'
import httpx
from cosmicsec_platform.service_discovery import get_service_url

for service in ["auth", "scan", "ai", "recon"]:
    url = get_service_url(service)
    try:
        response = httpx.get(f"{url}/health", timeout=2)
        print(f"✓ {service}: {response.status_code}")
    except Exception as e:
        print(f"✗ {service}: {e}")
EOF
```

---

## Environment Variable Overrides

If you need custom URLs for special cases:

```bash
# Override specific service URL (takes precedence over auto-detection)
export AUTH_SERVICE_URL=http://custom-auth:8001
export SCAN_SERVICE_URL=http://custom-scan:8002

docker compose restart
```

---

## Migration Guide

### For Existing Services

If you have custom code using hardcoded service URLs:

**Before:**
```python
auth_url = "http://auth-service:8001"
```

**After:**
```python
from cosmicsec_platform.service_discovery import get_service_url
auth_url = get_service_url("auth")
```

### For New Services

Always use service discovery:

```python
from cosmicsec_platform.service_discovery import get_service_url

# Service discovery handles all environment variations
scan_url = get_service_url("scan")
ai_url = get_service_url("ai")
recon_url = get_service_url("recon")
```

---

## Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| **Console Logs** | ❌ Confusing service names | ✅ Correct URLs logged |
| **Windows Support** | ❌ Hardcoded docker names | ✅ Automatic localhost |
| **Service Switching** | ❌ Manual .env changes | ✅ Automatic detection |
| **Debugging** | ❌ Unclear which env | ✅ Clear environment info |
| **Self-Hosting** | ❌ Manual IP configuration | ✅ ServiceRegistry handles it |
| **Maintenance** | ❌ Update multiple files | ✅ Single source of truth |

---

**Last Updated:** April 17, 2026
