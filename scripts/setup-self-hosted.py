#!/usr/bin/env python3
"""
CosmicSec Self-Hosted Setup Script
Setup and configure CosmicSec for home/self-hosted deployment without a domain.

Usage:
    python scripts/setup-self-hosted.py
    python scripts/setup-self-hosted.py --ip 192.168.1.100
    python scripts/setup-self-hosted.py --port 9000 --enable-ssl
"""

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


class Colors:
    """ANSI color codes for terminal output."""

    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"


def print_header(text: str):
    """Print a section header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message."""
    print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")


def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message."""
    print(f"{Colors.RED}✗ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message."""
    print(f"{Colors.CYAN}ℹ {text}{Colors.ENDC}")


def check_prerequisites() -> bool:
    """Check if Docker and Docker Compose are installed."""
    print_header("Checking Prerequisites")

    # Check Docker
    try:
        subprocess.run(["docker", "--version"], capture_output=True, check=True)
        print_success("Docker is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("Docker is not installed. Please install Docker first.")
        print_info("Visit: https://docs.docker.com/get-docker/")
        return False

    # Check Docker Compose
    try:
        subprocess.run(["docker", "compose", "version"], capture_output=True, check=True)
        print_success("Docker Compose is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("Docker Compose is not installed.")
        return False

    # Check if system is suitable for self-hosting
    import platform

    os_name = platform.system()
    print_success(f"Running on {os_name}")

    return True


def get_network_info() -> dict[str, Any]:
    """Get the system's network information."""
    import socket

    # Get hostname
    hostname = socket.gethostname()

    # Get local IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"

    return {
        "hostname": hostname,
        "local_ip": local_ip,
    }


def create_env_file(args: argparse.Namespace, network_info: dict[str, Any]) -> Path:
    """Create .env file for self-hosted deployment."""
    print_header("Creating Environment Configuration")

    # Determine the service host
    if args.domain:
        service_host = args.domain
        print_info(f"Using custom domain: {service_host}")
    else:
        service_host = args.ip or network_info["local_ip"]
        print_info(f"Using local IP: {service_host}")

    # Generate secrets
    import secrets
    import string

    def generate_secret(length: int = 32) -> str:
        """Generate a random secret."""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return "".join(secrets.choice(alphabet) for _ in range(length))

    # Create environment configuration
    env_content = f"""# CosmicSec Self-Hosted Configuration
# Generated: {datetime.now().isoformat()}
# This file configures CosmicSec for self-hosted deployment

# ==============================================================================
# Deployment Mode
# ==============================================================================
COSMICSEC_DEPLOYMENT_MODE=self_hosted
COSMICSEC_SELF_HOSTED=true

# ==============================================================================
# Network Configuration
# ==============================================================================
# The IP or hostname where CosmicSec will be accessible
SERVICE_HOST={service_host}
SERVICE_PROTOCOL=http{"s" if args.enable_ssl else ""}

# External access URL (how users will access CosmicSec)
COSMICSEC_PUBLIC_URL=http{"s" if args.enable_ssl else ""}://{service_host}:{args.port}

# ==============================================================================
# Docker & Networking
# ==============================================================================
# Network for Docker containers
COSMICSEC_NETWORK=cosmicsec-network

# ==============================================================================
# Database
# ==============================================================================
POSTGRES_DB=cosmicsec
POSTGRES_USER=cosmicsec
POSTGRES_PASSWORD={generate_secret(32)}
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://cosmicsec:$POSTGRES_PASSWORD@postgres:5432/cosmicsec

# ==============================================================================
# Cache & Message Queue
# ==============================================================================
REDIS_PASSWORD={generate_secret(32)}
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379/0

# MongoDB
MONGO_PASSWORD={generate_secret(32)}

# RabbitMQ
RABBITMQ_PASSWORD={generate_secret(32)}

# ==============================================================================
# Security
# ==============================================================================
JWT_SECRET_KEY={generate_secret(64)}
API_KEY_HASH_SECRET={generate_secret(32)}
RELAY_INTERNAL_SECRET={generate_secret(32)}

# ==============================================================================
# AI & External Services
# ==============================================================================
# OpenAI (optional)
OPENAI_API_KEY=sk-your-key-here

# Shodan API (optional)
SHODAN_API_KEY=

# VirusTotal API (optional)
VIRUSTOTAL_API_KEY=

# Recon network strategy (optional)
# Comma-separated proxy list, for example:
# COSMICSEC_RECON_PROXY_POOL=http://proxy1:8080,http://proxy2:8080
COSMICSEC_RECON_PROXY_POOL=

# Optional custom user-agent pool (comma-separated)
COSMICSEC_RECON_USER_AGENT_POOL=

# Tor SOCKS endpoint for onion routing (enable in UI with "Use Tor")
# Example: socks5://tor-proxy:9050
COSMICSEC_RECON_TOR_PROXY_URL=

# Global egress strategy (applies to multiple services using shared egress helper)
COSMICSEC_GLOBAL_PROXY_POOL=
COSMICSEC_GLOBAL_USER_AGENT_POOL=
COSMICSEC_GLOBAL_TOR_PROXY_URL=socks5://tor-proxy:9050
# Global Tor mode: disabled | auto | enabled
COSMICSEC_GLOBAL_TOR_MODE=auto

# ==============================================================================
# Observability
# ==============================================================================
ENABLE_PROMETHEUS=true
PROMETHEUS_PORT=9090

ENABLE_SENTRY=false
SENTRY_DSN=

# ==============================================================================
# Storage
# ==============================================================================
COSMICSEC_STORAGE_MODE=dynamic

# ==============================================================================
# Feature Flags
# ==============================================================================
COSMICSEC_USE_NATS=false

# ==============================================================================
# Admin Configuration
# ==============================================================================
# Default admin credentials (CHANGE THESE IN PRODUCTION!)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@cosmicsec.local
ADMIN_PASSWORD={generate_secret(16)}

# ==============================================================================
# TLS/SSL Configuration (if enabled)
# ==============================================================================
"""

    if args.enable_ssl:
        env_content += """TLS_CERT_PATH=/etc/cosmicsec/certs/tls.crt
TLS_KEY_PATH=/etc/cosmicsec/certs/tls.key
"""

    env_content += f"""
# ==============================================================================
# Port Configuration
# ==============================================================================
EXTERNAL_PORT={args.port}

# ==============================================================================
# Logging
# ==============================================================================
LOG_LEVEL=info
ENABLE_STRUCTURED_LOGGING=true
"""

    env_file = Path(".env.self-hosted")
    env_file.write_text(env_content)

    print_success(f"Created environment file: {env_file}")

    # Extract and display important credentials
    import re

    passwords = re.findall(r"(\w+)_PASSWORD=([^\n]+)", env_content)

    print_warning("Important: Save these credentials securely!")
    print("\nGenerated Passwords:")
    for name, value in passwords:
        print(f"  {name}_PASSWORD: {value[:16]}... (hidden for security)")

    return env_file


def create_docker_compose_override(args: argparse.Namespace) -> Path:
    """Create Docker Compose override file for self-hosted deployment."""
    print_header("Creating Docker Compose Configuration")

    override_content = f"""# Docker Compose Override for Self-Hosted Deployment
# This file extends docker-compose.yml with self-hosted configurations

version: '3.8'

services:
  # Traefik - Reverse Proxy (optional for SSL/domain routing)
  traefik:
    environment:
      TRAEFIK_ENTRYPOINTS_WEB_ADDRESS: :80
      TRAEFIK_ENTRYPOINTS_WEBSECURE_ADDRESS: :443
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard

  # PostgreSQL
  postgres:
    environment:
      POSTGRES_PASSWORD: ${{POSTGRES_PASSWORD}}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis
  redis:
    environment:
      REDIS_PASSWORD: ${{REDIS_PASSWORD}}
    ports:
      - "6379:6379"

  # MongoDB
  mongodb:
    environment:
      MONGO_INITDB_ROOT_PASSWORD: ${{MONGO_PASSWORD}}
    ports:
      - "27017:27017"

  # Elasticsearch
  elasticsearch:
    ports:
      - "9200:9200"

  # Consul (Service Discovery)
  consul:
    ports:
      - "8500:8500"

  # API Gateway - Main entry point
  api-gateway:
    environment:
      SERVICE_HOST: ${{SERVICE_HOST}}
      SERVICE_PROTOCOL: ${{SERVICE_PROTOCOL}}
      COSMICSEC_PUBLIC_URL: ${{COSMICSEC_PUBLIC_URL}}
      COSMICSEC_DEPLOYMENT_MODE: ${{COSMICSEC_DEPLOYMENT_MODE}}
    ports:
      - "{args.port}:8000"  # External port mapping
    expose:
      - "8000"

  # Auth Service
  auth-service:
    environment:
      SERVICE_HOST: ${{SERVICE_HOST}}
      DATABASE_URL: ${{DATABASE_URL}}
    expose:
      - "8001"

  # Scan Service
  scan-service:
    environment:
      SERVICE_HOST: ${{SERVICE_HOST}}
      DATABASE_URL: ${{DATABASE_URL}}
    expose:
      - "8002"

  # AI Service
  ai-service:
    environment:
      SERVICE_HOST: ${{SERVICE_HOST}}
    expose:
      - "8003"

  # Recon Service
  recon-service:
    environment:
      SERVICE_HOST: ${{SERVICE_HOST}}
    expose:
      - "8004"

  # Report Service
  report-service:
    environment:
      SERVICE_HOST: ${{SERVICE_HOST}}
    expose:
      - "8005"

  # Other services...
  collab-service:
    expose:
      - "8006"

  integration-service:
    expose:
      - "8008"

  agent-relay:
    expose:
      - "8011"

  notification-service:
    expose:
      - "8012"

  # Prometheus for monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: cosmicsec-prometheus
    volumes:
      - ./infrastructure/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    networks:
      - cosmicsec-network

  # Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    container_name: cosmicsec-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    networks:
      - cosmicsec-network

volumes:
  postgres_data:
  redis_data:
  mongodb_data:
  elasticsearch_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:

networks:
  cosmicsec-network:
    driver: bridge
"""

    override_file = Path("docker-compose.self-hosted.yml")
    override_file.write_text(override_content)

    print_success(f"Created Docker Compose override: {override_file}")
    return override_file


def create_systemd_service(args: argparse.Namespace) -> Path | None:
    """Create systemd service file for Linux systems."""
    import platform

    if platform.system() != "Linux":
        return None

    print_header("Creating Systemd Service")

    workspace_dir = Path.cwd()

    service_content = f"""[Unit]
Description=CosmicSec Security Platform
Documentation=https://cosmicsec.local
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=cosmicsec
WorkingDirectory={workspace_dir}

# Start the service
ExecStart=docker compose -f docker-compose.yml -f docker-compose.self-hosted.yml up

# Restart policy
Restart=on-failure
RestartSec=10
StartLimitInterval=600
StartLimitBurst=3

# Resource limits (adjust based on your hardware)
MemoryMax=4G
CPUQuota=80%

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths={workspace_dir}/data

[Install]
WantedBy=multi-user.target
"""

    service_file = Path("/etc/systemd/system/cosmicsec.service")

    print_warning(f"Systemd service file would be created at: {service_file}")
    print_info("To install the service, run:")
    print("  sudo mkdir -p /etc/systemd/system")
    print(f"  sudo tee {service_file} > /dev/null << 'EOF'")
    print(service_content)
    print("EOF")
    print("  sudo systemctl daemon-reload")
    print("  sudo systemctl enable cosmicsec")
    print("  sudo systemctl start cosmicsec")

    return None


def create_firewall_rules(args: argparse.Namespace):
    """Display firewall configuration instructions."""
    print_header("Firewall Configuration")

    print_info("Configure your firewall to allow access to CosmicSec:")
    print()

    import platform

    os_name = platform.system()

    if os_name == "Linux":
        print("For UFW (Ubuntu/Debian):")
        print(f"  sudo ufw allow {args.port}/tcp")
        print("  sudo ufw allow 80/tcp   # HTTP redirect")
        if args.enable_ssl:
            print("  sudo ufw allow 443/tcp  # HTTPS")
        print()
        print("For iptables:")
        print(f"  sudo iptables -A INPUT -p tcp --dport {args.port} -j ACCEPT")

    elif os_name == "Windows":
        print("For Windows Firewall (PowerShell as Admin):")
        print(
            f"  New-NetFirewallRule -DisplayName 'CosmicSec' -Direction Inbound -Action Allow -Protocol TCP -LocalPort {args.port}"
        )

    elif os_name == "Darwin":
        print("For macOS, allow the application through System Preferences:")
        print("  System Preferences > Security & Privacy > Firewall Options")

    print()


def create_reverse_proxy_config(args: argparse.Namespace) -> Path | None:
    """Create Nginx reverse proxy configuration."""
    print_header("Creating Reverse Proxy Configuration")

    nginx_config = """# Nginx configuration for CosmicSec
# Save as: /etc/nginx/sites-available/cosmicsec
# Then: sudo ln -s /etc/nginx/sites-available/cosmicsec /etc/nginx/sites-enabled/
# And: sudo systemctl restart nginx

upstream cosmicsec_backend {
    server localhost:8000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://cosmicsec_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /health {
        access_log off;
        proxy_pass http://cosmicsec_backend;
    }
}
"""

    config_file = Path("nginx.cosmicsec.conf")
    config_file.write_text(nginx_config)

    print_success(f"Created Nginx configuration: {config_file}")
    print_info("To use this configuration:")
    print(f"  sudo cp {config_file} /etc/nginx/sites-available/cosmicsec")
    print("  sudo ln -s /etc/nginx/sites-available/cosmicsec /etc/nginx/sites-enabled/")
    print("  sudo systemctl restart nginx")

    return config_file


def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(
        description="CosmicSec Self-Hosted Setup",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Setup with local IP
  python scripts/setup-self-hosted.py

  # Setup with specific IP
  python scripts/setup-self-hosted.py --ip 192.168.1.100

  # Setup with custom port
  python scripts/setup-self-hosted.py --port 9000

  # Setup with domain and SSL
  python scripts/setup-self-hosted.py --domain cosmicsec.example.com --enable-ssl
        """,
    )

    parser.add_argument(
        "--ip",
        help="IP address where CosmicSec will be accessible (auto-detected if not provided)",
        default=None,
    )
    parser.add_argument(
        "--domain",
        help="Domain name where CosmicSec will be accessible (e.g., cosmicsec.example.com)",
        default=None,
    )
    parser.add_argument("--port", type=int, default=8000, help="External port (default: 8000)")
    parser.add_argument("--enable-ssl", action="store_true", help="Enable SSL/TLS configuration")
    parser.add_argument(
        "--skip-docker-check", action="store_true", help="Skip Docker prerequisite check"
    )

    args = parser.parse_args()

    print()
    print(f"{Colors.BOLD}{Colors.CYAN}")
    print(r"""
    _____ _____ _____ _____ _____ _____ _____
    |     |     |  |  |     |  |  |     |  _  |
    |     |_____| ___ |_____|-   -|_____| ____|
    |_____| --- | ---   --- |       |__  | ____)

    CosmicSec Self-Hosted Setup
    """)
    print(f"{Colors.ENDC}")

    # Check prerequisites
    if not args.skip_docker_check and not check_prerequisites():
        sys.exit(1)

    # Get network info
    network_info = get_network_info()
    print_success(f"Hostname: {network_info['hostname']}")
    print_success(f"Local IP: {network_info['local_ip']}")

    # Create configuration files
    env_file = create_env_file(args, network_info)
    docker_compose_file = create_docker_compose_override(args)

    # Create additional configurations
    create_firewall_rules(args)
    create_reverse_proxy_config(args)
    create_systemd_service(args)

    # Final instructions
    print_header("Setup Complete!")

    print(f"{Colors.BOLD}Next Steps:{Colors.ENDC}")
    print()
    print("1. Review the generated configuration files:")
    print(f"   - {env_file}")
    print(f"   - {docker_compose_file}")
    print()
    print("2. Start CosmicSec:")
    print(f"   docker compose -f docker-compose.yml -f {docker_compose_file} up -d")
    print()
    print("3. Wait for services to be ready (2-5 minutes):")
    print("   docker compose logs -f api-gateway")
    print()
    print("4. Access CosmicSec:")
    if args.domain:
        print(f"   http{'s' if args.enable_ssl else ''}://{args.domain}:{args.port}")
    else:
        print(f"   http://{network_info['local_ip']}:{args.port}")
    print()
    print("5. Login with default credentials:")
    print("   Username: admin")
    print("   Password: Check .env.self-hosted file")
    print()
    print(
        f"{Colors.YELLOW}⚠️  IMPORTANT: Change the admin password immediately after first login!{Colors.ENDC}"
    )
    print()


if __name__ == "__main__":
    main()
