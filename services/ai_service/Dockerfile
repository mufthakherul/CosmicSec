FROM python:3.13-slim

WORKDIR /app

ENV VENV_PATH=/opt/venv \
    PATH=/opt/venv/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/runtime.txt /tmp/requirements/runtime.txt
RUN python -m venv ${VENV_PATH}
RUN --mount=type=cache,target=/root/.cache/pip \
    ${VENV_PATH}/bin/pip install --no-cache-dir -r /tmp/requirements/runtime.txt

COPY services/__init__.py /app/services/__init__.py
COPY services/common /app/services/common
COPY services/ai_service /app/services/ai_service

RUN useradd -m -u 1000 cosmicsec && chown -R cosmicsec:cosmicsec /app
USER cosmicsec

EXPOSE 8003

CMD ["uvicorn", "services.ai_service.main:app", "--host", "0.0.0.0", "--port", "8003"]
