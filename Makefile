COMPOSE_DEV = -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE = docker compose

.PHONY: install dev dev-frontend dev-backend test build clean help up \
	seed test-all lint-all format-all setup-self-hosted cross-platform-info diagnose

help:
	@echo "CosmicSec — Universal Cybersecurity Intelligence Platform"
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install Python dependencies"
	@echo "  make dev           - Start dev environment (with hot-reload)"
	@echo "  make dev-frontend  - Start frontend dev server"
	@echo "  make dev-backend   - Start backend services in Docker"
	@echo "  make dev-build     - Rebuild & start dev containers"
	@echo "  make dev-build-no-cache - Rebuild from scratch and start dev containers"
	@echo "  make dev-restart-safe   - Restart dev stack with dependency health ordering"
	@echo "  make seed          - Seed database with dev test data"
	@echo "  make up            - Start production containers"
	@echo "  make stop          - Stop all containers"
	@echo "  make restart       - Restart all containers"
	@echo ""
	@echo "Cross-Platform & Deployment:"
	@echo "  make cross-platform-info - Show cross-platform setup info"
	@echo "  make setup-self-hosted   - Interactive self-hosted setup (home/server)"
	@echo "  make setup-self-hosted-ip IP=192.168.1.100 - Setup with specific IP"
	@echo "  make hosting-guide  - View hosting requirements & options"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test          - Run Python tests with coverage"
	@echo "  make test-all      - Run Python and frontend tests"
	@echo "  make lint          - Run Ruff linter"
	@echo "  make lint-all      - Run Ruff + TypeScript type check"
	@echo "  make format        - Auto-format Python code with Ruff"
	@echo "  make format-all    - Auto-format Python + frontend code"
	@echo ""
	@echo "Docker:"
	@echo "  make build         - Build Docker images"
	@echo "  make build-safe    - Build with auto-retry and legacy fallback"
	@echo "  make clean         - Remove containers, volumes, caches"
	@echo "  make ps            - Show running containers"
	@echo "  make logs          - Tail all service logs"
	@echo "  make shell         - Open shell in API gateway"
	@echo "  make health        - Check service health endpoints"
	@echo "  make diagnose      - Show unhealthy services, logs, and endpoint checks"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate    - Run Alembic migrations"
	@echo "  make db-reset      - Reset database and restart"
	@echo ""
	@echo "Admin:"
	@echo "  make admin-cli     - Launch CosmicSec admin CLI"
	@echo "  make admin-tui     - Launch CosmicSec admin TUI"
	@echo "  make admin-ssh     - Start CosmicSec SSH admin server"
	@echo "  make cli-manpage   - Regenerate CLI man page"
	@echo ""

install:
	pip install -r requirements/dev.txt

dev:
	$(COMPOSE) $(COMPOSE_DEV) up -d
	@echo "Dev services started (hot-reload enabled):"
	@echo "  API Gateway:  http://localhost:8000"
	@echo "  Auth Service: http://localhost:8001"
	@echo "  Scan Service: http://localhost:8002"
	@echo "  AI Service:   http://localhost:8003"
	@echo "  Recon Service:http://localhost:8004"
	@echo "  Report Service:http://localhost:8005"
	@echo "  API Docs:     http://localhost:8000/api/docs"
	@echo ""
	@echo "Note: Automatic cross-platform detection enabled!"
	@echo "  - Windows, Linux, macOS all supported"
	@echo "  - Services auto-detect localhost vs docker network"
	@echo "  See: make cross-platform-info"

dev-build:
	$(COMPOSE) $(COMPOSE_DEV) up --build -d

dev-build-no-cache:
	$(COMPOSE) $(COMPOSE_DEV) build --no-cache
	$(COMPOSE) $(COMPOSE_DEV) up -d

dev-restart-safe:
	$(COMPOSE) $(COMPOSE_DEV) down
	$(COMPOSE) $(COMPOSE_DEV) up -d

up:
	$(COMPOSE) up -d

stop:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

logs-gateway:
	$(COMPOSE) logs -f api-gateway

logs-auth:
	$(COMPOSE) logs -f auth-service

logs-scan:
	$(COMPOSE) logs -f scan-service

logs-ai:
	$(COMPOSE) logs -f ai-service

logs-recon:
	$(COMPOSE) logs -f recon-service

logs-report:
	$(COMPOSE) logs -f report-service

shell:
	$(COMPOSE) exec api-gateway /bin/sh

test:
	pytest tests/ -v --cov=services --cov-report=html

test-docker-env:
	pytest tests/test_docker_env.py -q

lint:
	ruff check .

format:
	ruff format .

build:
	$(COMPOSE) build

build-safe:
	powershell -ExecutionPolicy Bypass -File scripts/docker-build-safe.ps1

build-safe-no-cache:
	powershell -ExecutionPolicy Bypass -File scripts/docker-build-safe.ps1 -NoCache

clean:
	$(COMPOSE) down -v
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true

ps:
	$(COMPOSE) ps

restart:
	$(COMPOSE) restart

db-migrate:
	$(COMPOSE) exec api-gateway alembic upgrade head

db-reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d postgres
	sleep 5
	$(COMPOSE) up -d

health:
	@echo "Checking service health..."
	@curl -sf http://localhost:8000/health && echo " API Gateway: UP" || echo " API Gateway: DOWN"
	@curl -sf http://localhost:8001/health && echo " Auth Service: UP" || echo " Auth Service: DOWN"
	@curl -sf http://localhost:8002/health && echo " Scan Service: UP" || echo " Scan Service: DOWN"
	@curl -sf http://localhost:8003/health && echo " AI Service: UP" || echo " AI Service: DOWN"
	@curl -sf http://localhost:8004/health && echo " Recon Service: UP" || echo " Recon Service: DOWN"
	@curl -sf http://localhost:8005/health && echo " Report Service: UP" || echo " Report Service: DOWN"

diagnose:
	@echo "== Docker service status =="
	@docker compose $(COMPOSE_DEV) ps
	@echo ""
	@echo "== Non-healthy services =="
	@FAILED="$$(docker compose $(COMPOSE_DEV) ps --format '{{.Service}}\t{{.Status}}' | grep -Ei 'unhealthy|exited|dead|restarting' | cut -f1)"; \
	if [ -n "$$FAILED" ]; then \
		echo "$$FAILED"; \
	else \
		echo "None"; \
	fi
	@echo ""
	@echo "== Tail logs for non-healthy services =="
	@FAILED="$$(docker compose $(COMPOSE_DEV) ps --format '{{.Service}}\t{{.Status}}' | grep -Ei 'unhealthy|exited|dead|restarting' | cut -f1)"; \
	if [ -n "$$FAILED" ]; then \
		docker compose $(COMPOSE_DEV) logs --no-color --tail=120 $$FAILED; \
	else \
		echo "No non-healthy services to inspect."; \
	fi
	@echo ""
	@echo "== Endpoint probes =="
	@for endpoint in \
		http://localhost:8000/health \
		http://localhost:8001/health \
		http://localhost:8002/health \
		http://localhost:8003/health \
		http://localhost:8004/health \
		http://localhost:8005/health \
		http://localhost:8006/health \
		http://localhost:8007/health \
		http://localhost:8008/health \
		http://localhost:8009/health \
		http://localhost:8010/health \
		http://localhost:8011/health \
		http://localhost:8012/health \
		http://localhost:8090/health \
		http://localhost:8099/health \
		http://localhost:8222/healthz; do \
		if curl -sf $$endpoint >/dev/null; then \
			echo "OK   $$endpoint"; \
		else \
			echo "FAIL $$endpoint"; \
		fi; \
	done

# Development shortcuts
watch-gateway:
	watch -n 2 'curl -s http://localhost:8000/health | jq'

watch-scans:
	watch -n 2 'curl -s http://localhost:8002/stats | jq'

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	$(COMPOSE) $(COMPOSE_DEV) up api-gateway auth-service scan-service ai-service -d

seed:
	python scripts/seed-dev-data.py

test-all:
	pytest tests/ -v --cov=services --cov-report=html
	cd frontend && npm run test

lint-all:
	ruff check .
	cd frontend && npx tsc --noEmit

format-all:
	ruff format .
	cd frontend && npx prettier --write src/

admin-cli:
	python -m services.admin_service.cli shell

admin-tui:
	python -m services.admin_service.tui

admin-ssh:
	python -m services.admin_service.ssh_server

cli-manpage:
	python scripts/generate-cli-manpage.py

# Cross-Platform & Self-Hosted Deployment
cross-platform-info:
	@echo "CosmicSec Cross-Platform Support"
	@echo "================================"
	@echo ""
	@echo "✓ Automatic OS Detection:"
	@echo "  • Windows (10/11+)"
	@echo "  • Linux (any distribution)"
	@echo "  • macOS (10.15+)"
	@echo ""
	@echo "✓ Automatic Environment Detection:"
	@echo "  • Local Development (localhost:PORT)"
	@echo "  • Docker Compose (service-name:PORT)"
	@echo "  • Self-Hosted (SERVICE_HOST:PORT)"
	@echo ""
	@echo "✓ Features:"
	@echo "  • No reconfiguration when switching OSes"
	@echo "  • Service discovery handled automatically"
	@echo "  • Works with Windows, Linux, and macOS"
	@echo ""
	@echo "For detailed info, see: docs/CROSS_PLATFORM_GUIDE.md"

setup-self-hosted:
	python scripts/setup-self-hosted.py

setup-self-hosted-ip:
	python scripts/setup-self-hosted.py --ip $(IP)

hosting-guide:
	@cat docs/HOSTING_REQUIREMENTS.md | less

.DEFAULT_GOAL := help
