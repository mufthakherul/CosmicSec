.PHONY: install dev test build clean help

help:
	@echo "CosmicSec — Universal Cybersecurity Intelligence Platform"
	@echo ""
	@echo "Development:"
	@echo "  make install    - Install Python dependencies"
	@echo "  make dev        - Start dev environment (Docker Compose)"
	@echo "  make dev-build  - Rebuild & start all containers"
	@echo "  make stop       - Stop all containers"
	@echo "  make restart    - Restart all containers"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test       - Run Python tests with coverage"
	@echo "  make lint       - Run Ruff linter"
	@echo "  make format     - Auto-format code with Ruff"
	@echo ""
	@echo "Docker:"
	@echo "  make build      - Build Docker images"
	@echo "  make clean      - Remove containers, volumes, caches"
	@echo "  make ps         - Show running containers"
	@echo "  make logs       - Tail all service logs"
	@echo "  make shell      - Open shell in API gateway"
	@echo "  make health     - Check service health endpoints"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate - Run Alembic migrations"
	@echo "  make db-reset   - Reset database and restart"
	@echo ""
	@echo "Admin:"
	@echo "  make admin-cli  - Launch CosmicSec admin CLI"
	@echo "  make admin-tui  - Launch CosmicSec admin TUI"
	@echo "  make admin-ssh  - Start CosmicSec SSH admin server"
	@echo ""

install:
	pip install -r requirements.txt

dev:
	docker-compose up -d
	@echo "Services started:"
	@echo "  API Gateway:  http://localhost:8000"
	@echo "  Auth Service: http://localhost:8001"
	@echo "  Scan Service: http://localhost:8002"
	@echo "  AI Service:   http://localhost:8003"
	@echo "  Recon Service:http://localhost:8004"
	@echo "  Report Service:http://localhost:8005"
	@echo "  API Docs:     http://localhost:8000/api/docs"

dev-build:
	docker-compose up --build -d

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

admin-cli:
	python -m services.admin_service.cli shell

admin-tui:
	python -m services.admin_service.tui

admin-ssh:
	python -m services.admin_service.ssh_server
