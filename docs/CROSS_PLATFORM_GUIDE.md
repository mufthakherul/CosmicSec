# Cross-Platform Development Guide

> Seamless development across Windows, Linux, and macOS without reconfiguration.

---

## Overview

CosmicSec automatically detects your operating system and deployment environment, applying appropriate configurations for services, paths, and connectivity. No manual configuration needed when switching between OSes!

## How It Works

### Automatic Detection

When you start CosmicSec, the platform automatically detects:

1. **Operating System**
   - Windows (10/11+)
   - Linux (any distribution)
   - macOS (10.15+)

2. **Deployment Mode**
   - **Local Development** (your machine)
   - **Docker Container** (via `make dev`)
   - **Docker Compose** (multi-service)
   - **Kubernetes** (enterprise)
   - **Self-Hosted** (home server)

3. **Service Connectivity**
   - Uses **Docker service names** inside containers
   - Uses **localhost:PORT** for local development
   - Uses **configured hostnames** for self-hosted
   - Uses **cloud endpoints** for cloud deployments

### Configuration Hierarchy

```
Environment Variable (highest priority)
    ↓
Detected Mode (docker, kubernetes, self-hosted, etc)
    ↓
Operating System (Windows, Linux, macOS)
    ↓
Default Configuration (lowest priority)
```

## Development Workflow

### Switching Between OSes

#### Scenario: Switch from Windows to Linux

**Before (Manual Reconfiguration)**
```
1. Edit docker-compose.yml (change paths)
2. Update .env file (change service hostnames)
3. Rebuild containers (docker-compose down && up)
4. Wait 5 minutes for services to start
5. Update frontend API endpoint configuration
6. Clear browser cache
7. Restart service manually
❌ Error-prone, time-consuming, easy to break
```

**After (Automatic)**
```
1. Push code to git: git push
2. Pull on Linux: git pull
3. Run: make dev
4. Access: http://localhost:8000
✓ Works instantly, no configuration needed!
```

#### Example: Windows → Linux → macOS

```bash
# On Windows
C:\Projects\CosmicSec> make dev
# Detects: Windows, Local Dev, Uses localhost:8000

# Work on Windows, commit changes
C:\Projects\CosmicSec> git add . && git commit -m "Feature X"

# Move to Linux machine
user@linux:~/CosmicSec$ git pull
user@linux:~/CosmicSec$ make dev
# Detects: Linux, Local Dev, Uses localhost:8000
# All services work without any configuration!

# Later on macOS
$ git pull
$ make dev
# Detects: macOS, Local Dev, Uses localhost:8000
# Everything works the same way!
```

## Platform-Specific Information

### Windows

#### Paths Configuration

```python
# Automatic path detection for Windows
app_data_dir = Path(APPDATA) / "CosmicSec"  # C:\Users\User\AppData\Roaming\CosmicSec
cache_dir = Path(LOCALAPPDATA) / "CosmicSec"  # C:\Users\User\AppData\Local\CosmicSec
logs_dir = app_data_dir / "logs"
```

#### Service Discovery

```python
# In Docker container on Windows
Service URLs: http://service-name:8000  # Docker Compose network

# Local development on Windows
Service URLs: http://localhost:8000  # Host machine ports
```

#### Commands

```powershell
# Development
make dev                    # Starts containers
docker compose logs -f      # View logs
docker compose exec api-gateway powershell  # Access container

# Troubleshooting
Get-Process docker
docker system prune          # Clean up
wsl --list --verbose        # Check WSL2
```

### Linux

#### Paths Configuration

```python
# Automatic path detection for Linux
app_data_dir = Path.home() / ".config" / "cosmicsec"
cache_dir = Path.home() / ".cache" / "cosmicsec"
logs_dir = app_data_dir / "logs"
```

#### Service Discovery

```python
# In Docker container on Linux
Service URLs: http://service-name:8000  # Docker bridge network

# Local development on Linux
Service URLs: http://localhost:8000  # Localhost
```

#### Commands

```bash
# Development
make dev                    # Starts containers
docker compose logs -f      # View logs
docker compose exec api-gateway bash  # Access container

# Troubleshooting
sudo systemctl status docker
docker system prune -a      # Clean up
lsof -i :8000              # Check port usage
```

### macOS

#### Paths Configuration

```python
# Automatic path detection for macOS
app_data_dir = Path.home() / "Library" / "Application Support" / "CosmicSec"
cache_dir = Path.home() / "Library" / "Caches" / "CosmicSec"
logs_dir = app_data_dir / "logs"
```

#### Service Discovery

```python
# In Docker container on macOS
Service URLs: http://service-name:8000  # Docker for Mac network

# Local development on macOS
Service URLs: http://localhost:8000  # Localhost
```

#### Commands

```bash
# Development
make dev                    # Starts containers
docker compose logs -f      # View logs
docker compose exec api-gateway bash  # Access container

# Troubleshooting
open /Applications/Docker.app  # Start Docker
docker system prune -a      # Clean up
lsof -i :8000              # Check port usage
```

## Configuration Files

### Automatic Storage Locations

#### Windows
```
C:\Users\{User}\AppData\Roaming\CosmicSec\
├── logs/
├── config/
└── data/

C:\Users\{User}\AppData\Local\CosmicSec\
└── cache/
```

#### Linux
```
~/.config/cosmicsec/
├── logs/
├── config/
└── data/

~/.cache/cosmicsec/
└── cache/
```

#### macOS
```
~/Library/Application Support/CosmicSec/
├── logs/
├── config/
└── data/

~/Library/Caches/CosmicSec/
└── cache/
```

## Environment Variables

### Key Variables for Cross-Platform Support

```bash
# Explicit deployment mode (optional, auto-detected if not set)
COSMICSEC_DEPLOYMENT_MODE=local_dev|docker|self_hosted

# Service connectivity (auto-configured based on deployment)
SERVICE_HOST=localhost          # Local dev
SERVICE_HOST=api-gateway        # Docker Compose
SERVICE_HOST=192.168.1.100      # Self-hosted
SERVICE_PROTOCOL=http|https

# Logging
LOG_LEVEL=debug|info|warning|error

# Feature flags
COSMICSEC_USE_NATS=false        # Turn off advanced features if not available
```

## Service Discovery Details

### How Services Find Each Other

#### Local Development (Windows/Linux/macOS)

```
Frontend (http://localhost:3000)
    ↓ calls
API Gateway (http://localhost:8000)
    ↓ routes to (using ServiceRegistry)
Auth Service (http://localhost:8001)
Scan Service (http://localhost:8002)
AI Service (http://localhost:8003)
...
```

**Code Path:**
```python
from cosmicsec_platform.service_discovery import get_service_url

# In any service
auth_url = get_service_url("auth")  # Returns http://localhost:8001
scan_url = get_service_url("scan")  # Returns http://localhost:8002
```

#### Docker Compose (Any OS)

```
Frontend Container (port 3000)
    ↓ calls via docker network
API Gateway Container (port 8000)
    ↓ routes using docker DNS
Auth Service Container (port 8001)
    ↓ accessed as: http://auth-service:8001
Scan Service Container (port 8002)
    ↓ accessed as: http://scan-service:8002
...
```

#### Self-Hosted Deployment

```
External Users (Internet)
    ↓
Reverse Proxy (Nginx/Traefik)
    ↓ on port 8000
API Gateway (http://service-host:8000)
    ↓ routes to (using ServiceRegistry + SERVICE_HOST)
Other Services (http://service-host:800X)
```

## Switching Between Development Modes

### Mode 1: Pure Local Development

```bash
# Do NOT run Docker
# Run services directly:
uvicorn services.api_gateway.main:app --port 8000
uvicorn services.auth_service.main:app --port 8001
uvicorn services.scan_service.main:app --port 8002
...

# Services will auto-detect LOCAL_DEV mode
# ServiceRegistry will use http://localhost:8000 etc
```

### Mode 2: Docker Development (Recommended)

```bash
# Run all services in Docker
make dev

# Services will auto-detect DOCKER mode
# Services will use Docker Compose network names
```

### Mode 3: Self-Hosted Deployment

```bash
# Configure for self-hosted
COSMICSEC_DEPLOYMENT_MODE=self_hosted
SERVICE_HOST=192.168.1.100

# Services will use configured host
```

## Debugging Cross-Platform Issues

### Check Current Configuration

```python
from cosmicsec_platform.config import get_config
from cosmicsec_platform.service_discovery import get_registry

config = get_config()
registry = get_registry()

print(f"OS: {config.os_type}")
print(f"Mode: {config.deployment_mode}")
print(f"Services: {registry.get_all_urls()}")
```

### View Detection Logs

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Start services
make dev

# Check logs for detection output
docker compose logs -f api-gateway | grep -i "platform\|config\|service"
```

### Manual Override

```bash
# Force specific deployment mode
export COSMICSEC_DEPLOYMENT_MODE=docker

# Force specific service host
export SERVICE_HOST=192.168.1.100

# Restart services
docker compose restart
```

## Troubleshooting

### Issue: Services can't connect to each other

**Windows/Docker Desktop Issue:**
```
Error: Cannot reach http://localhost:8001
Reason: localhost != docker-desktop network

Solution 1: Use SERVICE_HOST=host.docker.internal
Solution 2: Upgrade Docker Desktop
Solution 3: Check Windows Firewall settings
```

**Resolution:**
```bash
# Check service discovery
docker compose exec api-gateway python -c "
from cosmicsec_platform.service_discovery import get_registry
print(get_registry())
"

# Restart services
docker compose down
docker compose up -d --build
```

### Issue: Wrong paths on different OS

**Error:** `FileNotFoundError: [Errno 2] No such file or directory: 'C:\\...'`

**Solution:**
```python
# Use automatic path detection
from cosmicsec_platform.config import get_config

config = get_config()
log_file = config.get_logs_dir() / "app.log"  # Works on all OSes

# NOT: Path("C:\\Users\\...") or Path("/home/...")
```

### Issue: Port conflicts

**Windows:**
```powershell
# Find what's using port 8000
Get-NetTCPConnection -LocalPort 8000

# Kill the process
Stop-Process -Id <PID> -Force
```

**Linux/macOS:**
```bash
# Find what's using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

## Best Practices

### 1. Use the ServiceRegistry API

```python
# ✓ Good - Uses platform detection
from cosmicsec_platform.service_discovery import get_service_url
auth_url = get_service_url("auth")

# ✗ Avoid - Hardcoded
auth_url = "http://auth-service:8001"
auth_url = "http://localhost:8001"
```

### 2. Use Path detection for files

```python
# ✓ Good - Works on all OSes
from cosmicsec_platform.config import get_config
config = get_config()
log_dir = config.get_logs_dir()

# ✗ Avoid - OS-specific
log_dir = Path("/var/log/cosmicsec")
log_dir = Path("C:\\Logs\\CosmicSec")
```

### 3. Document OS-specific behavior

```python
"""
Service routing logic.

Behavior varies by deployment mode:
- LOCAL_DEV: Uses localhost:PORT
- DOCKER: Uses service-name:PORT
- SELF_HOSTED: Uses configured SERVICE_HOST:PORT
"""
```

### 4. Test across platforms

```bash
# Before committing, test on:
1. Windows (or WSL2)
2. Linux
3. macOS (or remote)

# Or use CI/CD:
# GitHub Actions can run tests on multiple OSes
```

## Advanced: Custom Configuration

### Override Service Discovery

```python
from cosmicsec_platform.service_discovery import ServiceRegistry

# For custom deployments
class CustomRegistry(ServiceRegistry):
    def _build_urls(self):
        super()._build_urls()
        # Add custom services
        self._url_cache["custom_service"] = "http://custom:9000"

# Use it
registry = CustomRegistry()
```

### Custom Path Resolution

```python
from cosmicsec_platform.config import PlatformConfig

# Override for specific use case
config = PlatformConfig()
custom_storage = Path("/mnt/cosmicsec-data")
```

---

## FAQ

**Q: Does this work with existing deployments?**
A: Yes! Legacy hardcoded URLs still work. New code should use ServiceRegistry.

**Q: What if I don't want automatic detection?**
A: Set `COSMICSEC_DEPLOYMENT_MODE` explicitly in environment.

**Q: Can I use different service hosts per environment?**
A: Yes! Set `SERVICE_HOST` per environment (localhost, service-name, IP, domain).

**Q: How do I debug service discovery?**
A: Check logs with `make logs` or enable DEBUG logging.

---

**Last Updated:** April 2026
