# Deploy CosmicSec to Production

## Prerequisites
- Docker 24+ and Docker Compose 2.20+
- PostgreSQL 16 instance (managed or self-hosted)
- Redis 7+ instance
- Domain name with DNS control
- TLS certificate (Let's Encrypt recommended)

## Quick Deploy

```bash
# 1. Clone repository
git clone https://github.com/mufthakherul/CosmicSec.git
cd CosmicSec

# 2. Create .env from template
cp .env.example .env
# Edit .env with your values (see required vars below)

# 3. Generate secrets
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(64))" >> .env

# 4. Run database migrations
docker compose run --rm api-gateway alembic upgrade head

# 5. Seed initial admin user
docker compose run --rm api-gateway python scripts/init-admin.py

# 6. Start all services
docker compose -f docker-compose.yml up -d

# 7. Verify health
curl https://your-domain.com/health
```

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/cosmicsec` |
| `REDIS_URL` | Redis connection string | `redis://host:6379/0` |
| `JWT_SECRET_KEY` | 64-char random secret | `secrets.token_urlsafe(64)` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://app.cosmicsec.com` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |

## Health Checks

All services expose `/health` endpoints. After deploy, verify:

```bash
for port in 8000 8001 8002 8003 8004 8005; do
  echo -n "Port $port: "
  curl -sf http://localhost:$port/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))"
done
```

## Rollback

```bash
# Tag current deployment
git tag -a "v$(date +%Y.%m.%d)" -m "Production deployment"

# If issues arise, rollback:
git checkout <previous-tag>
docker compose up -d --force-recreate
```
