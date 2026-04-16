"""Secure credential storage for CosmicSec Agent profiles."""

from __future__ import annotations

import base64
import json
import os
import platform
from getpass import getuser
from pathlib import Path
from typing import Any

try:
    import keyring  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional dependency runtime fallback
    keyring = None

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

SERVICE_NAME = "cosmicsec-agent"
CREDENTIAL_KEYS = {"api_key", "access_token", "refresh_token", "server_url", "org_id"}


def _config_dir() -> Path:
    override = os.getenv("COSMICSEC_CONFIG_DIR")
    return Path(override).expanduser() if override else Path.home() / ".cosmicsec"


class CredentialStore:
    """Keyring-first secure credential store with AES-GCM fallback."""

    def __init__(self) -> None:
        self._dir = _config_dir()
        self._dir.mkdir(parents=True, exist_ok=True)
        self._enc_file = self._dir / "credentials.enc"
        self._salt_file = self._dir / "credentials.salt"

    def store(self, profile: str, key: str, value: str) -> None:
        self._validate(key)
        if self._store_keyring(profile, key, value):
            return

        payload = self._read_fallback_store()
        payload.setdefault(profile, {})[key] = value
        self._write_fallback_store(payload)

    def retrieve(self, profile: str, key: str) -> str | None:
        self._validate(key)

        value = self._retrieve_keyring(profile, key)
        if value is not None:
            return value

        payload = self._read_fallback_store()
        return payload.get(profile, {}).get(key)

    def delete(self, profile: str, key: str) -> None:
        self._validate(key)

        if keyring is not None:
            try:
                keyring.delete_password(SERVICE_NAME, f"{profile}:{key}")
            except Exception:
                pass

        payload = self._read_fallback_store()
        if profile in payload and key in payload[profile]:
            payload[profile].pop(key, None)
            if not payload[profile]:
                payload.pop(profile, None)
            self._write_fallback_store(payload)

    def list_profiles(self) -> list[str]:
        profiles: set[str] = set()
        if keyring is not None:
            # No portable profile-list support for keyring; best effort from fallback only.
            pass
        profiles.update(self._read_fallback_store().keys())
        return sorted(profiles)

    def migrate_legacy_config(self, legacy_config_file: Path) -> bool:
        """Migrate plaintext config.json credentials to secure store once."""
        if not legacy_config_file.exists():
            return False
        if legacy_config_file.suffix == ".bak":
            return False

        try:
            cfg = json.loads(legacy_config_file.read_text(encoding="utf-8"))
        except Exception:
            return False

        profile = "default"
        migrated = False
        for key in CREDENTIAL_KEYS:
            value = cfg.get(key)
            if isinstance(value, str) and value:
                self.store(profile, key, value)
                migrated = True

        if migrated:
            backup = legacy_config_file.with_suffix(".json.bak")
            try:
                legacy_config_file.replace(backup)
            except Exception:
                return False
        return migrated

    def _validate(self, key: str) -> None:
        if key not in CREDENTIAL_KEYS:
            raise ValueError(f"Unsupported credential key: {key}")

    def _store_keyring(self, profile: str, key: str, value: str) -> bool:
        if keyring is None:
            return False
        try:
            keyring.set_password(SERVICE_NAME, f"{profile}:{key}", value)
            return True
        except Exception:
            return False

    def _retrieve_keyring(self, profile: str, key: str) -> str | None:
        if keyring is None:
            return None
        try:
            return keyring.get_password(SERVICE_NAME, f"{profile}:{key}")
        except Exception:
            return None

    def _load_salt(self) -> bytes:
        if self._salt_file.exists():
            return self._salt_file.read_bytes()
        salt = os.urandom(32)
        self._salt_file.write_bytes(salt)
        return salt

    def _derive_key(self) -> bytes:
        machine_id = self._machine_id()
        material = f"{machine_id}:{getuser()}".encode("utf-8")
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self._load_salt(),
            iterations=600_000,
        )
        return kdf.derive(material)

    def _machine_id(self) -> str:
        machine_id_file = Path("/etc/machine-id")
        if machine_id_file.exists():
            return machine_id_file.read_text(encoding="utf-8").strip()
        fallback_file = self._dir / "machine-id"
        if fallback_file.exists():
            return fallback_file.read_text(encoding="utf-8").strip()
        generated_suffix = base64.urlsafe_b64encode(os.urandom(12)).decode("utf-8")
        generated = f"{platform.system()}-{platform.node()}-{generated_suffix}"
        fallback_file.write_text(generated, encoding="utf-8")
        return generated

    def _read_fallback_store(self) -> dict[str, dict[str, str]]:
        if not self._enc_file.exists():
            return {}
        try:
            blob = json.loads(self._enc_file.read_text(encoding="utf-8"))
            nonce = base64.b64decode(blob["nonce"])
            ciphertext = base64.b64decode(blob["ciphertext"])
            plaintext = AESGCM(self._derive_key()).decrypt(nonce, ciphertext, None)
            data = json.loads(plaintext.decode("utf-8"))
            if isinstance(data, dict):
                return {k: dict(v) for k, v in data.items() if isinstance(v, dict)}
        except Exception:
            return {}
        return {}

    def _write_fallback_store(self, payload: dict[str, Any]) -> None:
        data = json.dumps(payload).encode("utf-8")
        key = self._derive_key()
        nonce = os.urandom(12)
        ciphertext = AESGCM(key).encrypt(nonce, data, None)
        self._enc_file.write_text(
            json.dumps(
                {
                    "nonce": base64.b64encode(nonce).decode("utf-8"),
                    "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
