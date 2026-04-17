#!/bin/bash
# CosmicSec Docker Health Check Helper
# Run this script to verify all containers are healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 CosmicSec Health Check"
echo "========================"
echo ""

# List of services to check
SERVICES=(
    "cosmicsec-postgres:5432"
    "cosmicsec-redis:6379"
    "cosmicsec-mongodb:27017"
    "cosmicsec-elasticsearch:9200"
    "cosmicsec-rabbitmq:5672"
    "cosmicsec-traefik:8080"
    "cosmicsec-consul:8500"
)

# Health check functions
check_postgres() {
    echo -n "Checking PostgreSQL... "
    if docker exec cosmicsec-postgres pg_isready -U cosmicsec &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

check_redis() {
    echo -n "Checking Redis... "
    if docker exec cosmicsec-redis redis-cli ping &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

check_mongodb() {
    echo -n "Checking MongoDB... "
    if docker exec cosmicsec-mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

check_elasticsearch() {
    echo -n "Checking Elasticsearch... "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health)
    if [ "$RESPONSE" == "200" ]; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy (HTTP $RESPONSE)${NC}"
        return 1
    fi
}

check_rabbitmq() {
    echo -n "Checking RabbitMQ... "
    if docker exec cosmicsec-rabbitmq rabbitmq-diagnostics -q ping &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

check_traefik() {
    echo -n "Checking Traefik... "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ping)
    if [ "$RESPONSE" == "200" ]; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy (HTTP $RESPONSE)${NC}"
        return 1
    fi
}

check_consul() {
    echo -n "Checking Consul... "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8500/v1/status/leader)
    if [ "$RESPONSE" == "200" ]; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy (HTTP $RESPONSE)${NC}"
        return 1
    fi
}

check_api_gateway() {
    echo -n "Checking API Gateway... "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
    if [ "$RESPONSE" == "200" ]; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy (HTTP $RESPONSE)${NC}"
        return 1
    fi
}

# Run all checks
FAILED=0

check_postgres || FAILED=$((FAILED + 1))
check_redis || FAILED=$((FAILED + 1))
check_mongodb || FAILED=$((FAILED + 1))
check_elasticsearch || FAILED=$((FAILED + 1))
check_rabbitmq || FAILED=$((FAILED + 1))
check_traefik || FAILED=$((FAILED + 1))
check_consul || FAILED=$((FAILED + 1))
check_api_gateway || FAILED=$((FAILED + 1))

echo ""
echo "========================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All services healthy!${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILED service(s) unhealthy${NC}"
    exit 1
fi
