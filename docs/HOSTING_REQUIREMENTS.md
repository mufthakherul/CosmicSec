# CosmicSec Hosting & Deployment Requirements

> **Last Updated:** April 2026  
> **Document Version:** 1.0

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Deployment Options](#deployment-options)
4. [Local Development Setup](#local-development-setup)
5. [Self-Hosted Setup](#self-hosted-setup-home-server)
6. [Cloud Hosting Options](#cloud-hosting-options)
7. [Hosting Providers Comparison](#hosting-providers-comparison)
8. [Security Considerations](#security-considerations)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Local Development (Any OS - Windows, Linux, macOS)

```bash
# Clone repository
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec

# Install dependencies
make install

# Start development environment
make dev

# Access at http://localhost:8000
```

**No reconfiguration needed when switching between Windows/Linux/macOS!** The platform automatically detects your OS and environment.

### For Self-Hosted (Home/Server)

```bash
# Run setup script
python scripts/setup-self-hosted.py

# Follow prompts to configure your deployment

# Start CosmicSec
docker compose -f docker-compose.yml -f docker-compose.self-hosted.yml up -d
```

---

## System Requirements

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores (Intel/AMD x64) |
| **RAM** | 4 GB | 8-16 GB |
| **Storage** | 20 GB | 100+ GB SSD |
| **Network** | 10 Mbps | 100+ Mbps |
| **OS** | Linux 4.15+ / Windows 10+ / macOS 10.15+ | Latest LTS |

### Disk Space Breakdown

```
├─ Operating System: 2-5 GB
├─ Docker Images: 5-8 GB
├─ Database (PostgreSQL): 5-20 GB
├─ MongoDB (optional): 5-10 GB
├─ Elasticsearch: 5-15 GB
├─ Application Data: 5-50 GB
└─ Logs & Cache: 2-10 GB
───────────────────────────
  Total: 30-120+ GB
```

### Network Requirements

```
Inbound:
  - HTTP (80): For redirects and initial access
  - HTTPS (443): For secure access
  - Custom Port (8000-8020): If not using reverse proxy
  
Outbound:
  - 443: HTTPS (to external APIs)
  - 53: DNS resolution
  - 22: SSH (if agent-based scanning)
```

---

## Deployment Options

### 1. Local Development (No Domain Required)

**Best For:** Development, testing, learning

**Pros:**
- No domain needed
- Automatic OS detection (Windows/Linux/macOS)
- Hot reload for development
- Full feature access
- Easy to reset/debug

**Cons:**
- No external access
- Data not persistent
- Single-user only

**Setup Time:** 5-10 minutes

### 2. Self-Hosted at Home

**Best For:** Small teams, personal use, learning

**Pros:**
- No subscription fees
- Full data control
- No external dependencies
- Works without domain
- Learn DevOps/infrastructure

**Cons:**
- Requires 24/7 internet
- Network stability matters
- Need dynamic DNS or static IP
- Home ISP may block ports
- Bandwidth limitations

**Setup Time:** 30-60 minutes

**Estimated Cost:** $0 (existing hardware)

### 3. Cloud Hosting (Small)

**Best For:** Small teams, medium security audits

**Pros:**
- Professional infrastructure
- 99.9% uptime SLA
- Professional backups
- Easy scaling
- DDoS protection

**Cons:**
- Recurring costs
- Data in third-party hands
- Vendor lock-in

**Estimated Cost:** $20-50/month

### 4. Cloud Hosting (Enterprise)

**Best For:** Large organizations, critical systems

**Pros:**
- 99.99% uptime SLA
- Advanced security
- Compliance certifications
- Dedicated support
- Advanced monitoring

**Cons:**
- Higher costs
- Complex setup

**Estimated Cost:** $500-5000+/month

---

## Local Development Setup

### Windows

#### Prerequisites
```powershell
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker compose version
```

#### Setup
```powershell
# Clone and navigate
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec

# Install Python dependencies
pip install -r requirements.txt

# Start development
make dev

# Access
Start-Process "http://localhost:8000"
```

#### Important Notes
- Docker Desktop must be running
- WSL2 (Windows Subsystem for Linux 2) recommended for better performance
- Automatic port forwarding to Windows host

### Linux (Ubuntu/Debian)

```bash
# Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose python3.11 python3-pip

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Clone and setup
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec
pip install -r requirements.txt

# Start
make dev
```

### macOS

```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Or via Homebrew
brew install --cask docker

# Setup
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec
pip install -r requirements.txt

# Start
make dev
open http://localhost:8000
```

---

## Self-Hosted Setup (Home Server)

### Prerequisites

1. **Hardware**
   - Computer or NAS that can stay on 24/7
   - Minimum 4 GB RAM, 2 CPU cores
   - 50+ GB free storage

2. **Network**
   - Static IP or Dynamic DNS
   - Port forwarding configured
   - Stable internet connection

3. **Software**
   - Docker & Docker Compose
   - Python 3.11+
   - 2-5 GB of available disk for images

### Step 1: Prepare Your Server

#### On Linux Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker compose version
```

#### On Windows Server
```powershell
# Install Docker Desktop or Docker Engine
# Download: https://docs.docker.com/engine/install/windows/

# Or via Chocolatey
choco install docker-desktop
```

#### On macOS
```bash
# Install via Homebrew
brew install --cask docker

# Start Docker
open /Applications/Docker.app
```

### Step 2: Run Setup Script

```bash
# Clone CosmicSec
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec

# Run setup script
python scripts/setup-self-hosted.py

# Optional: Specify IP or domain
python scripts/setup-self-hosted.py --ip 192.168.1.100
python scripts/setup-self-hosted.py --domain cosmicsec.home
python scripts/setup-self-hosted.py --port 9000 --enable-ssl
```

### Step 3: Configure Network Access

#### Option A: Dynamic DNS (Recommended for Home)

1. **Choose a DDNS Service**
   - No-IP (free tier available)
   - DuckDNS (free)
   - Cloudflare (advanced, free domain)

2. **Setup DDNS Client**
   ```bash
   # On Linux
   sudo apt install ddclient
   sudo nano /etc/ddclient/ddclient.conf
   
   # Add your DDNS configuration
   ```

3. **Access via Domain**
   - Instead of IP: `http://your-ddns-domain.com:8000`

#### Option B: Static IP (If Available from ISP)

```bash
# Configure port forwarding on router
Router IP: 192.168.1.1
Internal IP: 192.168.1.100
Port: 8000 → 8000
Protocol: TCP
```

#### Option C: Reverse SSH Tunnel (Advanced)

```bash
# Create reverse tunnel to public server
ssh -R 8000:localhost:8000 user@public-server.com

# Access via: http://public-server.com:8000
```

### Step 4: Start CosmicSec

```bash
# Start with generated config
docker compose -f docker-compose.yml -f docker-compose.self-hosted.yml up -d

# Monitor startup
docker compose logs -f api-gateway

# Wait 2-5 minutes for all services to be ready
```

### Step 5: Configure Firewall

#### Linux (UFW)
```bash
# Allow CosmicSec port
sudo ufw allow 8000/tcp

# Allow HTTP redirect
sudo ufw allow 80/tcp

# Check rules
sudo ufw status
```

#### Windows Firewall
```powershell
# PowerShell as Administrator
New-NetFirewallRule -DisplayName "CosmicSec" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000
```

#### macOS
```bash
# Firewall handled via System Preferences
# System Preferences > Security & Privacy > Firewall Options
```

### Step 6: Access Your Instance

```
http://your-ip:8000          # Direct IP access
http://your-domain:8000      # If using Dynamic DNS
https://your-domain:8000     # If SSL enabled
```

**Default Credentials:**
```
Username: admin
Password: (from .env.self-hosted file)
```

⚠️ **Change these immediately after first login!**

---

## Cloud Hosting Options

### Recommended Providers by Size

#### Tier 1: Budget (Development, Learning)

| Provider | Starting Price | Best For | Setup Time |
|----------|---|---|---|
| **Heroku** | $7/month | Simple deployments | 15 mins |
| **Render** | $7/month | FastAPI hosting | 15 mins |
| **Railway** | Pay-as-you-go | Quick prototypes | 10 mins |
| **Replit** | Free tier | Learning | 5 mins |

**Deployment Method:**
```bash
# For Heroku
heroku create cosmicsec
git push heroku main

# For Render
# Connect GitHub repo via dashboard
```

#### Tier 2: Standard (Small Teams, SMB)

| Provider | Starting Price | Best For | Setup Time |
|----------|---|---|---|
| **DigitalOcean** | $5-12/month | Droplets (VPS) | 20 mins |
| **Linode** | $5-10/month | Linux VPS | 20 mins |
| **Vultr** | $2.50-6/month | High-performance | 20 mins |
| **AWS Lightsail** | $3.50/month | AWS ecosystem | 25 mins |

**Deployment Method:**
```bash
# SSH into server
ssh root@your-server-ip

# Clone CosmicSec
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec

# Run setup
python scripts/setup-self-hosted.py --ip your-server-ip

# Start
docker compose -f docker-compose.yml -f docker-compose.self-hosted.yml up -d
```

#### Tier 3: Professional (SMB, Enterprise)

| Provider | Starting Price | Best For | Setup Time |
|----------|---|---|---|
| **AWS EC2** | $10+/month | Enterprise | 30-60 mins |
| **Google Cloud** | $10+/month | GCP ecosystem | 30-60 mins |
| **Azure** | $10+/month | Microsoft stack | 30-60 mins |
| **OVH** | $5-20/month | Europe-friendly | 20 mins |

**Deployment Method:**
```bash
# Using AWS CLI
aws ec2 run-instances --image-id ami-0c02fb55731490381 \
  --instance-type t2.medium --key-name your-key

# Then SSH and run setup
```

#### Tier 4: Fully Managed (Enterprise)

| Provider | Starting Price | Best For | Setup Time |
|----------|---|---|---|
| **Vercel** | $20/month | Next.js apps | 10 mins |
| **Netlify** | $19/month | Static + functions | 10 mins |
| **PaaS** | $50+/month | Full DevOps | 15-30 mins |

---

## Hosting Providers Comparison

### Cost Comparison (Annual)

```
Local Development (Home):
  ├─ Electricity: $50-150/year
  ├─ Internet: Already paying
  └─ Hardware: $0 (existing)
  Total: $50-150/year

Self-Hosted on Home Server:
  └─ Electricity + Internet: $200-400/year

Budget Cloud (DigitalOcean Droplet):
  ├─ Compute: $60-180/year
  ├─ Database: $0-50/year
  ├─ Storage: $0-50/year
  └─ Bandwidth: Free-$100/year
  Total: $120-380/year

Standard Cloud (AWS):
  ├─ Compute (t3.medium): $200-300/year
  ├─ Database (RDS): $200-500/year
  ├─ Storage (100GB): $100-200/year
  ├─ Data Transfer: $50-200/year
  └─ Other: $50-100/year
  Total: $600-1300/year

Enterprise Cloud (Multi-region):
  └─ $5000-50000+/year

Commercial SaaS (Managed Service):
  └─ $500-10000+/month
```

### Feature Comparison

| Feature | Local Dev | Self-Hosted | Budget Cloud | Standard Cloud | Enterprise |
|---------|-----------|-------------|---|---|---|
| **Cost** | $0 | $50-200 | $100-300 | $600-1300 | $5k-50k+ |
| **Setup** | 10 mins | 45 mins | 20 mins | 45 mins | Hours-Days |
| **Uptime** | Manual | 85-90% | 95%+ | 99%+ | 99.99%+ |
| **Backups** | Manual | Manual | Manual | Automatic | Automatic |
| **Scaling** | Manual | Manual | Manual | Auto | Auto + Load balance |
| **SSL/TLS** | Self-signed | Optional | Let's Encrypt | Managed | Managed |
| **DDoS Protection** | None | None | Basic | Advanced | Enterprise |
| **Support** | Community | Community | Community | Paid | Premium |
| **Compliance** | N/A | N/A | GDPR | GDPR+HIPAA | GDPR+HIPAA+SOC2 |

---

## Security Considerations

### Development Environment

```yaml
Development Setup (.env):
  DATABASE_PASSWORD: dev_password_change_in_prod
  JWT_SECRET_KEY: dev_secret_key_change_in_prod
  ALLOW_LOCALHOST_AUTH: true
  ENABLE_SWAGGER_DOCS: true  # For development only
  LOG_LEVEL: debug
```

⚠️ **Never use these in production!**

### Self-Hosted Environment

#### Essential Security Measures

```bash
# 1. Change all default credentials
# Edit .env.self-hosted file:
  - ADMIN_PASSWORD: (use strong password)
  - POSTGRES_PASSWORD: (use strong password)
  - JWT_SECRET_KEY: (use strong random key)
  - API_KEY_HASH_SECRET: (use strong random key)

# 2. Enable SSL/TLS
python scripts/setup-self-hosted.py --enable-ssl

# 3. Configure firewall
sudo ufw enable
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp

# 4. Keep system updated
sudo apt update && sudo apt upgrade -y

# 5. Monitor logs
docker compose logs -f api-gateway | grep -i error

# 6. Regular backups
docker exec cosmicsec-postgres pg_dump -U cosmicsec cosmicsec > backup.sql
```

#### SSL/TLS Certificate Options

1. **Let's Encrypt (Free, Auto-renew)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot certonly --standalone -d yourdomain.com
   ```

2. **Self-Signed (Free, Manual)**
   ```bash
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
   ```

3. **Commercial Certificates**
   - DigiCert, Sectigo, GlobalSign
   - $50-300/year
   - Advanced validation

### Cloud Environment

```yaml
Cloud Setup Checklist:
  ✓ Enable VPC/Security Groups
  ✓ Restrict SSH to specific IPs
  ✓ Use IAM roles (not root credentials)
  ✓ Enable encryption at rest
  ✓ Enable encryption in transit (TLS)
  ✓ Enable audit logging
  ✓ Enable intrusion detection
  ✓ Regular security audits
  ✓ Implement WAF (Web Application Firewall)
  ✓ DDoS protection enabled
```

---

## Performance Tuning

### Resource Allocation by Size

#### Small (1-10 users, Home)
```yaml
Services Configuration:
  PostgreSQL:
    shared_buffers: "256MB"
    effective_cache_size: "1GB"
  Redis:
    maxmemory: "512MB"
  Elasticsearch:
    heap.size: "512MB"
  API Gateway:
    workers: "2"
    threads: "4"

Hardware:
  CPU: 2 cores
  RAM: 4 GB
  Storage: 50 GB SSD
```

#### Medium (10-50 users)
```yaml
Services Configuration:
  PostgreSQL:
    shared_buffers: "1GB"
    effective_cache_size: "4GB"
  Redis:
    maxmemory: "2GB"
  Elasticsearch:
    heap.size: "2GB"
  API Gateway:
    workers: "4"
    threads: "8"

Hardware:
  CPU: 4 cores
  RAM: 8-16 GB
  Storage: 100 GB SSD + 50 GB HDD for backups
```

#### Large (50+ users)
```yaml
Services Configuration:
  PostgreSQL:
    shared_buffers: "4GB"
    effective_cache_size: "16GB"
  Redis:
    maxmemory: "8GB"
  Elasticsearch:
    heap.size: "8GB"
  API Gateway:
    workers: "8+"
    threads: "16+"

Hardware:
  CPU: 8+ cores
  RAM: 32+ GB
  Storage: 500+ GB NVMe SSD + 1 TB HDD for backups
  Network: 1 Gbps+
```

### Database Optimization

```sql
-- Enable query optimization
CREATE INDEX idx_scans_org_id ON scans(org_id);
CREATE INDEX idx_findings_scan_id ON findings(scan_id);
CREATE INDEX idx_findings_severity ON findings(severity);

-- Enable autovacuum
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 3;

-- Configure wal
ALTER SYSTEM SET max_wal_size = '4GB';
```

### Caching Strategy

```python
# Redis cache configuration
CACHE_TTL = {
    "auth_tokens": 3600,          # 1 hour
    "user_permissions": 1800,     # 30 minutes
    "scan_results": 7200,         # 2 hours
    "org_quotas": 600,            # 10 minutes
    "service_health": 30,         # 30 seconds
}
```

---

## Troubleshooting

### Common Issues

#### Issue: "Connection refused" when accessing services

**Cause:** Services using wrong hostname (localhost vs service name)

**Solution:**
```bash
# Check if running in Docker
docker ps | grep cosmicsec

# Check service URLs
docker compose exec api-gateway env | grep SERVICE_

# Restart services
docker compose restart
```

#### Issue: Ports already in use

**Solution:**
```bash
# Windows
netstat -ano | findstr :8000

# Linux/macOS
lsof -i :8000

# Kill the process using the port
kill -9 <PID>
```

#### Issue: Database connection errors

**Solution:**
```bash
# Check PostgreSQL health
docker compose exec postgres pg_isready

# Check connection string in logs
docker compose logs postgres

# Reset database
docker compose down -v postgres
docker compose up -d postgres
make db-migrate
```

#### Issue: Out of disk space

**Solution:**
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old logs
docker compose logs --follow --tail 10 > /dev/null
```

#### Issue: Memory usage too high

**Solution:**
```bash
# Check memory usage
docker stats

# Reduce Elasticsearch heap size
docker compose exec elasticsearch-service /bin/bash
# Edit jvm.options

# Or restart with lower limits
docker compose down
# Edit docker-compose.yml
docker compose up -d
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
docker compose restart

# Monitor all logs
docker compose logs -f

# Check specific service
docker compose logs -f api-gateway

# Check health endpoints
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### Useful Commands

```bash
# Health check all services
make health

# View all running containers
docker compose ps

# Execute command in container
docker compose exec api-gateway bash

# Check resource usage
docker stats

# View service logs
docker compose logs -f <service-name>

# Restart specific service
docker compose restart <service-name>

# Rebuild containers
docker compose up --build -d

# Complete reset (WARNING: Deletes data!)
docker compose down -v
docker compose up -d
```

---

## Migration Between Environments

### Local Dev → Self-Hosted

```bash
# Export local database
docker compose exec postgres pg_dump -U cosmicsec cosmicsec > backup.sql

# On self-hosted server
cat backup.sql | docker compose exec -T postgres psql -U cosmicsec cosmicsec

# Verify migration
docker compose exec postgres psql -U cosmicsec cosmicsec -c "SELECT COUNT(*) FROM scans;"
```

### Self-Hosted → Cloud

1. **Export data**
   ```bash
   docker compose exec postgres pg_dump -U cosmicsec cosmicsec > backup.sql
   ```

2. **Create cloud database**
   ```bash
   # Via cloud provider CLI or console
   ```

3. **Import data**
   ```bash
   # Cloud-specific restore command
   ```

4. **Update environment variables**
   ```bash
   # Point to cloud database
   DATABASE_URL=postgresql://user:pass@cloud-db:5432/cosmicsec
   ```

---

## Getting Help

### Resources

- **Documentation:** [docs/](../docs/)
- **GitHub Issues:** [github.com/mufthakherul/CosmicSec/issues](https://github.com/mufthakherul/CosmicSec/issues)
- **Community:** [GitHub Discussions](https://github.com/mufthakherul/CosmicSec/discussions)
- **Discord:** [CosmicSec Community](https://discord.gg/cosmicsec)

### When Reporting Issues

Include:
1. OS and version
2. Docker version
3. Full error message
4. Steps to reproduce
5. Configuration (redacted passwords)
6. Logs from `docker compose logs`

---

## Additional Resources

- [Docker Installation Guide](https://docs.docker.com/get-docker/)
- [Docker Compose Reference](https://docs.docker.com/compose/reference/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Nginx Reverse Proxy Guide](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

## License

CosmicSec is distributed under the [Custom MIT + Ethical Use License](../../LICENSE).

---

**Version:** 1.0  
**Last Updated:** April 2026  
**Maintained By:** CosmicSec Team
