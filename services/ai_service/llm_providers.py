"""
Phase Q.2 — Multi-Provider LLM abstraction for CosmicSec AI service.

Supports:
  - OpenAI (GPT-4o, GPT-4o-mini, o1-preview)
  - Ollama (llama3.1:8b, codellama:13b, mistral:7b — locally-hosted)

Provider selection order:
  1. Explicit ``provider`` argument to generate()
  2. ``COSMICSEC_DEFAULT_LLM_PROVIDER`` environment variable
  3. Auto-detect: use OpenAI if OPENAI_API_KEY is set, else Ollama

Fallback chain when a provider fails:
  primary provider → alternate provider → rule-based analysis (empty context)
"""

from __future__ import annotations

import asyncio
import logging
import os
from abc import ABC, abstractmethod
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------


class LLMProvider(ABC):
    """Abstract LLM provider interface."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def model(self) -> str: ...

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str:
        """Return the assistant's reply text or raise an exception on failure."""
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """Return True if the provider endpoint is reachable."""
        ...


# ---------------------------------------------------------------------------
# OpenAI provider
# ---------------------------------------------------------------------------

_OPENAI_DEFAULT_MODEL = "gpt-4o-mini"


class OpenAIProvider(LLMProvider):
    """OpenAI ChatCompletion provider."""

    def __init__(self, model: str | None = None) -> None:
        self._model = model or os.getenv("OPENAI_MODEL", _OPENAI_DEFAULT_MODEL)
        self._api_key = os.getenv("OPENAI_API_KEY", "")
        self._base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    @property
    def name(self) -> str:
        return "openai"

    @property
    def model(self) -> str:
        return self._model

    async def is_available(self) -> bool:
        return bool(self._api_key)

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str:
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self._base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            body = resp.json()

        return body["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Ollama provider
# ---------------------------------------------------------------------------

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_DEFAULT_MODEL = "llama3.1:8b"

# Supported Ollama model names with their use-case labels
OLLAMA_MODELS: dict[str, str] = {
    "llama3.1:8b": "general analysis",
    "codellama:13b": "code vulnerability analysis",
    "mistral:7b": "fast inference",
    "llama3.1:70b": "deep reasoning",
}


class OllamaProvider(LLMProvider):
    """Ollama locally-hosted LLM provider."""

    def __init__(self, model: str | None = None, base_url: str | None = None) -> None:
        self._model = model or os.getenv("OLLAMA_MODEL", _OLLAMA_DEFAULT_MODEL)
        self._base_url = (base_url or _OLLAMA_BASE_URL).rstrip("/")

    @property
    def name(self) -> str:
        return "ollama"

    @property
    def model(self) -> str:
        return self._model

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self._base_url}/api/tags")
                return resp.status_code == 200
        except (httpx.HTTPError, OSError):
            return False

    async def list_models(self) -> list[dict[str, Any]]:
        """Return available Ollama models from the local server."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self._base_url}/api/tags")
            resp.raise_for_status()
            return resp.json().get("models", [])

    async def pull_model(self, model_name: str) -> dict[str, Any]:
        """Trigger a model download from the Ollama registry."""
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{self._base_url}/api/pull",
                json={"name": model_name},
            )
            resp.raise_for_status()
            return {"status": "ok", "model": model_name}

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            },
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self._base_url}/api/generate",
                json=payload,
            )
            resp.raise_for_status()
            body = resp.json()

        return body.get("response", "")


# ---------------------------------------------------------------------------
# Provider factory & fallback chain
# ---------------------------------------------------------------------------


def get_llm_provider(name: str | None = None) -> LLMProvider:
    """
    Return a configured LLM provider instance.

    Resolution order:
      1. Explicit ``name`` argument
      2. ``COSMICSEC_DEFAULT_LLM_PROVIDER`` env var
      3. Use OpenAI if ``OPENAI_API_KEY`` is set, otherwise Ollama
    """
    resolved = (name or os.getenv("COSMICSEC_DEFAULT_LLM_PROVIDER") or _auto_detect_provider())
    match resolved.lower():
        case "openai":
            return OpenAIProvider()
        case "ollama":
            return OllamaProvider()
        case _:
            logger.warning("Unknown LLM provider '%s'; defaulting to Ollama", resolved)
            return OllamaProvider()


def _auto_detect_provider() -> str:
    """Auto-detect which provider to use based on available credentials/services."""
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    return "ollama"


class FallbackProviderChain:
    """
    Provider chain with automatic failover.

    On error from the primary, tries secondary; if that also fails, returns the
    rule-based fallback string ``"[rule-based fallback]"`` so callers always get
    some output rather than an exception.
    """

    def __init__(
        self,
        primary: LLMProvider | None = None,
        secondary: LLMProvider | None = None,
    ) -> None:
        self._primary = primary or get_llm_provider()
        # Build an alternate provider different from primary
        if secondary is not None:
            self._secondary = secondary
        elif self._primary.name == "openai":
            self._secondary = OllamaProvider()
        else:
            self._secondary = OpenAIProvider()

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str:
        for provider in (self._primary, self._secondary):
            try:
                result = await provider.generate(
                    prompt, system=system, max_tokens=max_tokens, temperature=temperature
                )
                logger.debug("LLM response from provider '%s'", provider.name)
                return result
            except Exception as exc:  # noqa: BLE001
                logger.warning("Provider '%s' failed: %s", provider.name, exc)

        logger.error("All LLM providers failed — returning rule-based fallback")
        return "[rule-based fallback]"


# ---------------------------------------------------------------------------
# Model management helpers (used by API endpoint handlers)
# ---------------------------------------------------------------------------


async def list_available_models() -> list[dict[str, Any]]:
    """Return a combined list of cloud and local models."""
    models: list[dict[str, Any]] = []

    # OpenAI cloud models (static list — API does not require a key to enumerate)
    models.extend([
        {"provider": "openai", "name": "gpt-4o", "description": "Best quality, multimodal"},
        {"provider": "openai", "name": "gpt-4o-mini", "description": "Efficient, cost-effective"},
        {"provider": "openai", "name": "o1-preview", "description": "Advanced reasoning"},
    ])

    # Ollama local models (dynamic from running Ollama instance)
    ollama = OllamaProvider()
    if await ollama.is_available():
        try:
            local_models = await ollama.list_models()
            for m in local_models:
                models.append({
                    "provider": "ollama",
                    "name": m.get("name", ""),
                    "description": OLLAMA_MODELS.get(m.get("name", ""), "locally hosted"),
                    "size": m.get("size"),
                    "modified_at": m.get("modified_at"),
                })
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not list Ollama models: %s", exc)
    else:
        # Return known supported models even if Ollama is offline
        for model_name, desc in OLLAMA_MODELS.items():
            models.append({"provider": "ollama", "name": model_name, "description": desc, "available": False})

    return models
