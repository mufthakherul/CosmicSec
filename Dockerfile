# Multi-stage build for CosmicSec platform
FROM python:3.13-slim as builder

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    VENV_PATH=/opt/venv

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy runtime requirements first to maximize layer cache reuse.
COPY requirements/runtime.txt /tmp/requirements/runtime.txt
RUN python -m venv ${VENV_PATH}
RUN --mount=type=cache,target=/root/.cache/pip \
    ${VENV_PATH}/bin/pip install --no-cache-dir -r /tmp/requirements/runtime.txt

# Production stage
FROM python:3.13-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Ensure runtime uses app virtualenv binaries
ENV PATH=/opt/venv/bin:$PATH

# Create app user for security
RUN useradd -m -u 1000 cosmicsec && \
    mkdir -p /app /logs /data && \
    chown -R cosmicsec:cosmicsec /app /logs /data

WORKDIR /app

# Copy application code
COPY --chown=cosmicsec:cosmicsec . .

# Switch to non-root user
USER cosmicsec

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "services.api_gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
