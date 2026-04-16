# CosmicSec Incident Response Runbook

## Severity Levels

| Level | Response Time | Examples |
|-------|--------------|---------|
| **P1 — Critical** | 15 min | Service completely down, data breach, auth bypass |
| **P2 — High** | 1 hour | Performance degradation >50%, partial outage |
| **P3 — Medium** | 4 hours | Single feature broken, minor data inconsistency |
| **P4 — Low** | Next business day | UI glitch, non-critical feature degraded |

## Triage Steps

### 1. Identify scope
```bash
# Check all service health
curl http://api-gateway:8000/health
docker compose ps
docker compose logs --tail=50 api-gateway
```

### 2. Check monitoring
- Grafana: https://grafana.cosmicsec.internal — look for red panels
- Prometheus alerts: https://prometheus.cosmicsec.internal/alerts
- Application logs: `docker compose logs -f --tail=100 <service>`

### 3. Common Issues

#### Service crash-looping
```bash
docker compose logs <service> --tail=200
docker compose restart <service>
```

#### Database connection exhausted
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Kill idle connections > 10 min
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"
```

#### Redis out of memory
```bash
redis-cli INFO memory
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Communication Template

```
[P<N> INCIDENT] CosmicSec <affected feature> degraded

Status: Investigating / Identified / Monitoring / Resolved
Impact: <who is affected>
Start time: <UTC>
Updates: Every 30 min until resolved

Current status: <what we know>
Next update: <time>
```
