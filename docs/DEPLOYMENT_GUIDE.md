"""
CosmicSec Modern Deployment Configurations
Multi-environment setup with automated scaling and observability
"""

import os

# Docker Compose with monitoring and best practices
DOCKER_COMPOSE_ADVANCED = """
# docker-compose.yml (additions for monitoring and advanced features)

version: '3.9'

services:
  # Existing services...
  
  # Advanced Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    networks:
      - cosmicsec

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - cosmicsec
    depends_on:
      - prometheus

  # Distributed Tracing (Jaeger)
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "5775:5775/udp"
      - "6831:6831/udp"
      - "16686:16686"
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    networks:
      - cosmicsec

  # Log Aggregation (Loki)
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./infrastructure/loki-config.yml:/etc/loki/local-config.yml
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yml
    networks:
      - cosmicsec

  # Redis Cluster (with persistence)
  redis-primary:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - cosmicsec
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Advanced API Gateway with Caching
  redis-cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6380:6379"
    volumes:
      - redis_cache_data:/data
    networks:
      - cosmicsec

  # Rate Limiting & Circuit Breaking (Envoy)
  envoy:
    image: envoyproxy/envoy:v1.28-latest
    ports:
      - "8001:8001"
      - "8002:8002"
    volumes:
      - ./infrastructure/envoy.yaml:/etc/envoy/envoy.yaml
    command: /usr/local/bin/envoy -c /etc/envoy/envoy.yaml
    networks:
      - cosmicsec
    depends_on:
      - api-gateway

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  redis_data:
  redis_cache_data:

networks:
  cosmicsec:
    driver: bridge
"""

# Kubernetes Helm Values (Production)
HELM_VALUES_ADVANCED = """
# helm/cosmicsec/values-production.yaml

replicaCount: 3

image:
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: api.cosmicsec.io
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: cosmicsec-tls
      hosts:
        - api.cosmicsec.io

serviceMonitor:
  enabled: true
  interval: 30s

monitoring:
  enabled: true
  alerts: true
"""

# Terraform AWS Module
TERRAFORM_ADVANCED_AWS = """
# infrastructure/terraform/modules/observability/main.tf

resource "aws_cloudwatch_log_group" "cosmicsec" {
  name              = "/aws/ecs/cosmicsec"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.logs.arn
}

resource "aws_kms_key" "logs" {
  description             = "KMS key for CloudWatch logs"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "CosmicSec-Main"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }],
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Cluster Health"
        }
      },
    ]
  })
}

resource "aws_sns_topic" "alerts" {
  name = "cosmicsec-alerts"
}

resource "aws_sns_topic_subscription" "alert_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "cosmicsec-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
"""

# GitHub Actions Deployment
GITHUB_ACTIONS_DEPLOYMENT = """
# .github/workflows/deploy-prod.yml

name: Deploy to Production

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to GHCR
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and Push Docker Image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}
      
      - name: Deploy to Kubernetes
        run: |
          helm upgrade --install cosmicsec ./helm/cosmicsec \\
            --values helm/cosmicsec/values-production.yaml \\
            --set image.tag=${{ github.ref_name }} \\
            --namespace production \\
            --create-namespace
      
      - name: Verify Deployment
        run: |
          kubectl rollout status deployment/cosmicsec -n production
      
      - name: Run Smoke Tests
        run: |
          npm install
          npm run test:e2e -- --project=production
      
      - name: Create Release
        uses: ncipollo/release-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          draft: false
"""

# ArgoCD GitOps Configuration
ARGOCD_APP_CONFIG = """
# infrastructure/argocd/cosmicsec-app.yaml

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cosmicsec
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/mufthakherul/CosmicSec.git
    targetRevision: main
    path: helm/cosmicsec
    helm:
      values: |
        environment: production
        replicaCount: 3
        
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
  
  # Health checks
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
"""

# Docker Buildkit Configuration
DOCKER_BUILD_ADVANCED = """
# .docker/buildx.yml

# Build with advanced caching and optimization

platforms:
  - linux/amd64
  - linux/arm64/v8

caches:
  - type: gha  # GitHub Actions cache

registry: ghcr.io/mufthakherul/cosmicsec
"""

print("Deployment & DevOps Configuration Complete")
