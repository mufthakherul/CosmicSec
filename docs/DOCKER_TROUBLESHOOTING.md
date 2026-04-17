# Docker Troubleshooting and Best Practices Guide

## Quick Start

### 1. Development Setup
```bash
# Create .env file from template
cp .env.example .env

# Update passwords in .env
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_secure_password
JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Start all services
docker-compose up -d

# Check health
./scripts/health-check.sh

# View logs
docker-compose logs -f api-gateway
```

### 2. Production Setup
```bash
# Use secure configuration
cp .env.example .env.production
# Update all credentials with strong passwords

# Start with production overrides
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Verify all services are healthy
./scripts/health-check.sh
```

## Common Issues and Solutions

### Database Connection Issues

**Issue**: `PostgreSQL connection refused`
```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs cosmicsec-postgres

# Verify credentials in .env
grep POSTGRES_PASSWORD .env

# Restart the service
docker-compose restart postgres

# Verify health
docker exec cosmicsec-postgres pg_isready -U cosmicsec
```

**Issue**: `Database migration errors`
```bash
# Connect to database
docker exec -it cosmicsec-postgres psql -U cosmicsec -d cosmicsec

# Check migrations
SELECT version, description, success FROM alembic_version;

# Run migrations manually
docker-compose exec api-gateway alembic upgrade head
```

### Redis Connection Issues

**Issue**: `Redis authentication failed`
```bash
# Check Redis password in .env
grep REDIS_PASSWORD .env

# Test connection
docker exec cosmicsec-redis redis-cli ping

# With authentication
docker exec cosmicsec-redis redis-cli -a your_password ping

# View Redis info
docker exec cosmicsec-redis redis-cli -a your_password INFO
```

**Issue**: `Redis out of memory`
```bash
# Check memory usage
docker exec cosmicsec-redis redis-cli -a your_password INFO memory

# Clear old cache
docker exec cosmicsec-redis redis-cli -a your_password FLUSHDB

# Configure Redis eviction policy in infrastructure/redis.conf
maxmemory-policy allkeys-lru
```

### Service Connectivity Issues

**Issue**: `Service can't reach another service`
```bash
# Check if both services are in same network
docker network ls
docker network inspect cosmicsec_cosmicsec-network

# Test connectivity
docker exec cosmicsec-api-gateway curl http://auth-service:8001/health

# Check DNS
docker exec cosmicsec-api-gateway nslookup auth-service

# Restart networking
docker-compose down
docker-compose up -d
```

**Issue**: `API Gateway can't route to services`
```bash
# Check Traefik configuration
curl http://localhost:8080/api/http/routers

# Check service discovery
curl http://localhost:8500/v1/catalog/services

# View Traefik logs
docker logs cosmicsec-traefik

# Verify service labels in docker-compose.yml
docker inspect cosmicsec-auth-service | grep -A 10 "Labels"
```

### Container Resource Issues

**Issue**: `Out of memory or CPU maxed out`
```bash
# Monitor resource usage
docker stats

# Check specific container
docker stats cosmicsec-api-gateway

# View container logs
docker logs cosmicsec-api-gateway | tail -100

# Increase resource limits in docker-compose.yml
# Add to service:
# deploy:
#   resources:
#     limits:
#       cpus: '1'
#       memory: 512M
#     reservations:
#       cpus: '0.5'
#       memory: 256M
```

### Log Aggregation Issues

**Issue**: `Logs not appearing in Loki/Grafana`
```bash
# Check Loki is running
docker ps | grep loki

# Test Loki API
curl http://localhost:3100/loki/api/v1/status/buildinfo

# Check container logs are being sent
docker logs cosmicsec-api-gateway | head -20

# Restart log aggregation
docker-compose restart loki grafana
```

## Performance Optimization

### 1. Database Optimization
```bash
# Analyze query performance
docker exec cosmicsec-postgres psql -U cosmicsec -d cosmicsec -c \
  "EXPLAIN ANALYZE SELECT * FROM scans LIMIT 10;"

# Vacuum database
docker exec cosmicsec-postgres psql -U cosmicsec -d cosmicsec -c "VACUUM ANALYZE;"

# Check index usage
docker exec cosmicsec-postgres psql -U cosmicsec -d cosmicsec -c \
  "SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;"
```

### 2. Redis Optimization
```bash
# Monitor Redis performance
docker exec cosmicsec-redis redis-cli -a your_password --stat

# Check slow commands
docker exec cosmicsec-redis redis-cli -a your_password SLOWLOG GET 10

# Optimize memory
docker exec cosmicsec-redis redis-cli -a your_password BGSAVE
docker exec cosmicsec-redis redis-cli -a your_password INFO memory
```

### 3. API Gateway Optimization
```bash
# Check active connections
docker exec cosmicsec-api-gateway ps aux | wc -l

# Monitor request metrics
curl http://localhost:8000/metrics | grep http_requests

# Check rate limiting status
curl http://localhost:8000/metrics | grep rate_limit
```

## Monitoring and Metrics

### 1. Access Prometheus
```bash
# Prometheus UI: http://localhost:9090
# Query: rate(http_requests_total[5m])
# Query: histogram_quantile(0.95, http_request_duration_seconds)
```

### 2. Access Grafana
```bash
# URL: http://localhost:3000
# Default login: admin/admin
# Import dashboards from grafana/dashboards/
```

### 3. Access Jaeger (Distributed Tracing)
```bash
# URL: http://localhost:16686
# Search for traces by service name
# Analyze latency and error rates
```

## Cleanup and Maintenance

### Remove All Containers and Volumes
```bash
# Stop all containers
docker-compose down

# Remove all volumes (data loss!)
docker-compose down -v

# Remove orphaned containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused networks
docker network prune
```

### Backup Data

```bash
# Backup PostgreSQL
docker exec cosmicsec-postgres pg_dump -U cosmicsec cosmicsec | gzip > backup.sql.gz

# Backup MongoDB
docker exec cosmicsec-mongodb mongodump --out /backup
docker cp cosmicsec-mongodb:/backup ./backup_mongo

# Backup Redis
docker exec cosmicsec-redis redis-cli -a your_password BGSAVE
docker cp cosmicsec-redis:/data/dump.rdb ./redis_backup.rdb
```

### Restore Data

```bash
# Restore PostgreSQL
gunzip < backup.sql.gz | docker exec -i cosmicsec-postgres psql -U cosmicsec cosmicsec

# Restore MongoDB
docker exec -i cosmicsec-mongodb mongorestore /backup

# Restore Redis
docker cp redis_backup.rdb cosmicsec-redis:/data/
docker exec cosmicsec-redis redis-cli shutdown
docker-compose restart redis
```

## Health Check Best Practices

### Custom Health Endpoints
```python
# In your FastAPI app
from services.common.health_checks import SystemHealthReport, ServiceHealthChecker

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": VERSION,
    }

@app.get("/health/detailed")
async def health_detailed():
    checker = ServiceHealthChecker()
    services = {
        "auth-service": "http://auth-service:8001",
        "scan-service": "http://scan-service:8002",
    }
    health = await checker.check_multiple(services)
    report = SystemHealthReport(health)
    return report.to_dict()
```

### Docker Compose Health Check Configuration
```yaml
services:
  api-gateway:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

## Environment-Specific Configuration

### Development
- Debug logging enabled
- Hot reload enabled
- Less strict resource limits
- Simplified health checks

### Staging
- Info level logging
- No hot reload
- Standard resource limits
- Full health checks

### Production
- Error level logging only
- No debug endpoints
- Strict resource limits
- Comprehensive monitoring
- Database replication
- Cache clustering
- Load balancing

## Troubleshooting Checklist

- [ ] All containers running: `docker ps | wc -l`
- [ ] All networks created: `docker network ls | grep cosmicsec`
- [ ] All volumes mounted: `docker volume ls | grep cosmicsec`
- [ ] Health checks passing: `./scripts/health-check.sh`
- [ ] Logs clean of errors: `docker-compose logs | grep -i error`
- [ ] Port conflicts: `netstat -tuln | grep LISTEN`
- [ ] Firewall rules: `sudo iptables -L`
- [ ] DNS resolution: `nslookup localhost`
- [ ] Environment variables: `docker exec cosmicsec-api-gateway env | grep COSMICSEC`
- [ ] Resource usage acceptable: `docker stats`

## Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs -f service-name`
2. Run health checks: `./scripts/health-check.sh`
3. Check this guide for similar issues
4. Review Docker documentation: https://docs.docker.com
5. Open an issue: https://github.com/mufthakherul/CosmicSec/issues
