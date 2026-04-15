COMPOSE_DEV = -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: install dev dev-frontend dev-backend test build clean help up \
       seed test-all lint-all format-all

help:
	@echo "CosmicSec — Universal Cybersecurity Intelligence Platform"
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install Python dependencies"
	@echo "  make dev           - Start dev environment (with hot-reload)"
	@echo "  make dev-frontend  - Start frontend dev server"
	@echo "  make dev-backend   - Start backend services in Docker"
	@echo "  make dev-build     - Rebuild & start dev containers"
	@echo "  make seed          - Seed database with dev test data"
	@echo "  make up            - Start production containers"
	@echo "  make stop          - Stop all containers"
	@echo "  make restart       - Restart all containers"
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
	@echo "  make clean         - Remove containers, volumes, caches"
	@echo "  make ps            - Show running containers"
	@echo "  make logs          - Tail all service logs"
	@echo "  make shell         - Open shell in API gateway"
	@echo "  make health        - Check service health endpoints"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate    - Run Alembic migrations"
	@echo "  make db-reset      - Reset database and restart"
	@echo ""
	@echo "Admin:"
	@echo "  make admin-cli     - Launch CosmicSec admin CLI"
	@echo "  make admin-tui     - Launch CosmicSec admin TUI"
	@echo "  make admin-ssh     - Start CosmicSec SSH admin server"
	@echo ""

install:
	pip install -r requirements.txt

dev:
	docker compose $(COMPOSE_DEV) up -d
	@echo "Dev services started (hot-reload enabled):"
	@echo "  API Gateway:  http://localhost:8000"
	@echo "  Auth Service: http://localhost:8001"
	@echo "  Scan Service: http://localhost:8002"
	@echo "  AI Service:   http://localhost:8003"
	@echo "  Recon Service:http://localhost:8004"
	@echo "  Report Service:http://localhost:8005"
	@echo "  API Docs:     http://localhost:8000/api/docs"

dev-build:
	docker compose $(COMPOSE_DEV) up --build -d

up:
	docker compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs -f

logs-gateway:
	docker-compose logs -f api-gateway

logs-auth:
	docker-compose logs -f auth-service

logs-scan:
	docker-compose logs -f scan-service

logs-ai:
	docker-compose logs -f ai-service

logs-recon:
	docker-compose logs -f recon-service

logs-report:
	docker-compose logs -f report-service

shell:
	docker-compose exec api-gateway /bin/sh

test:
	pytest tests/ -v --cov=services --cov-report=html

test-docker-env:
	pytest tests/test_docker_env.py -q

lint:
	ruff check .

format:
	ruff format .

build:
	docker-compose build

clean:
	docker-compose down -v
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true

ps:
	docker-compose ps

restart:
	docker-compose restart

db-migrate:
	docker-compose exec api-gateway alembic upgrade head

db-reset:
	docker-compose down -v
	docker-compose up -d postgres
	sleep 5
	docker-compose up -d

health:
	@echo "Checking service health..."
	@curl -sf http://localhost:8000/health && echo " API Gateway: UP" || echo " API Gateway: DOWN"
	@curl -sf http://localhost:8001/health && echo " Auth Service: UP" || echo " Auth Service: DOWN"
	@curl -sf http://localhost:8002/health && echo " Scan Service: UP" || echo " Scan Service: DOWN"
	@curl -sf http://localhost:8003/health && echo " AI Service: UP" || echo " AI Service: DOWN"
	@curl -sf http://localhost:8004/health && echo " Recon Service: UP" || echo " Recon Service: DOWN"
	@curl -sf http://localhost:8005/health && echo " Report Service: UP" || echo " Report Service: DOWN"

# Development shortcuts
watch-gateway:
	watch -n 2 'curl -s http://localhost:8000/health | jq'

watch-scans:
	watch -n 2 'curl -s http://localhost:8002/stats | jq'

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	docker compose $(COMPOSE_DEV) up api-gateway auth-service scan-service ai-service -d

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
