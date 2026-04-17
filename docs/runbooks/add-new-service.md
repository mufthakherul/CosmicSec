# Runbook: Adding a New Microservice

**Audience**: Backend developers  
**Last updated**: 2026-04-16

---

## Overview

CosmicSec uses a **FastAPI microservice** architecture.  
Each service runs as a separate Docker container and is proxied via the API Gateway.

---

## Step 1: Create the Service Directory

```bash
mkdir -p services/my_service
touch services/my_service/__init__.py
```

---

## Step 2: Create `services/my_service/main.py`

Minimum template:

```python
"""
CosmicSec My Service — brief description
"""
from __future__ import annotations

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

app = FastAPI(
    title="CosmicSec My Service",
    description="What this service does",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "healthy", "service": "my-service"}


@app.get("/my-resource")
async def list_resources() -> dict:
    return {"resources": []}
```

---

## Step 3: Add a `Dockerfile`

```dockerfile
# services/my_service/Dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8099
CMD ["uvicorn", "services.my_service.main:app", "--host", "0.0.0.0", "--port", "8099"]
```

---

## Step 4: Register in `docker-compose.yml`

```yaml
my-service:
  build: .
  dockerfile: services/my_service/Dockerfile
  ports:
    - "8099:8099"
  environment:
    - DATABASE_URL=${DATABASE_URL}
    - REDIS_URL=${REDIS_URL}
  depends_on:
    - db
    - redis
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8099/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## Step 5: Add API Gateway Route

In `services/api_gateway/main.py`, add a proxy block:

```python
MY_SERVICE_URL = os.getenv("MY_SERVICE_URL", "http://my-service:8099")

@app.api_route("/api/my-resource/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_my_service(path: str, request: Request):
    return await proxy_request(request, f"{MY_SERVICE_URL}/{path}")
```

---

## Step 6: Add Tests

Create `tests/test_my_service.py`:

```python
from fastapi.testclient import TestClient
from services.my_service.main import app

client = TestClient(app)

def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"
```

---

## Step 7: Verify

```bash
# Unit tests
python -m pytest tests/test_my_service.py -v

# Integration (Docker)
docker-compose up my-service
curl http://localhost:8099/health
```

---

## Checklist

- [ ] `services/my_service/main.py` created
- [ ] `/health` endpoint returns `{"status": "healthy"}`
- [ ] CORS configured via env var
- [ ] Dockerfile added
- [ ] `docker-compose.yml` updated
- [ ] API Gateway route added
- [ ] Tests added (≥ 80% coverage)
- [ ] Service listed in `docs/ROADMAP_UNIFIED.md` New File Map
