# CosmicSec Project Diagram

> Supplemental component-level visualization.
> Canonical implementation status remains in `report.md`, `ROADMAP.md`, and `gap_analysis.md`.

## Component Diagram

```mermaid
graph TB
    subgraph Users
        ClientWeb[WebApp Dashboard]
        ClientCLI[CLI Agent]
    end

    subgraph Edge
        Traefik[Traefik v3 Proxy]
    end

    subgraph Core Platform [CosmicSec API Gateway]
        Gateway[HybridRouter / API Gateway :8000]
        WAF[WAF / Rate Limiter]
    end

    subgraph Microservices
        Auth[Auth Service :8001]
        Scan[Scan Service :8002]
        AI[AI Service :8003]
        Recon[Recon Service :8004]
        Report[Report Service :8005]
        Collab[Collab Service :8006]
        Plugin[Plugin Registry :8007]
        Bounty[Bug Bounty Svc :8009]
        SOC[Professional SOC :8010]
        Relay[Agent Relay :8011]
    end

    subgraph Data Stores
        PG[(PostgreSQL - Core)]
        Redis[(Redis - Cache/Session)]
        Mongo[(MongoDB - OSINT)]
        Elastic[(Elasticsearch - Logs)]
    end

    ClientWeb --> Traefik
    Traefik --> Gateway
    ClientCLI -.->|WebSocket| Traefik
    
    Gateway --> WAF
    WAF --> Auth
    Gateway --> Scan & AI & Recon & Report & Collab & Plugin & Bounty & SOC & Relay
    
    Auth --> PG & Redis
    Scan --> PG & Redis
    AI --> Mongo
    Recon --> Mongo
    Collab --> PG & Redis
    Relay --> Redis
    
    Relay -.->|Task Dispatch| ClientCLI
```

---

## Progress Tracking

### ✅ What is Already Done
- Core infrastructure deployed via Docker Compose with Traefik Edge Proxy.
- Segregation of microservices into distinct functional blocks (Scan, AI, Auth, etc.).
- Robust storage backend migration from in-memory to PostgreSQL and Redis.
- Bug Bounty and Professional SOC modules established.

### 🚧 What Needs to be Implemented
- **Cisco AI Integration**: Plug in Cisco AI as the production LLM engine within the AI Service block.
- **Distributed Tracing**: Implement Jaeger/DataDog across the Microservices for detailed tracing.
- **Metrics**: Add Prometheus metrics collection endpoints to all microservices.

### 🔄 What Needs to be Updated/Modified
- **Plugin Registry**: Enhance signing validation mechanics to enforce role-scoped visibility and execution blocks dynamically at the API Gateway level.

### ❌ What Needs to be Removed (Deprecation Phase)
- **Legacy in-memory fallbacks**: Continue tightening production paths around persistent storage and explicit degraded-mode handling.
- **Legacy admin UX paths**: Keep converging on web-admin-first workflows and retire unused legacy surfaces over time.
