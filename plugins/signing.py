"""Plugin signing and verification helpers (Ed25519).

This module verifies detached signatures stored next to plugin source files.
Expected layout for a plugin file:
- plugin.py
- plugin.py.sig  (base64 signature of plugin.py bytes)
- plugin.py.pub  (PEM Ed25519 public key)
"""

from __future__ import annotations

import base64
from pathlib import Path


class PluginSignatureError(Exception):
    """Raised when plugin signature verification cannot be completed."""


def verify_plugin_file_signature(plugin_file: str | Path) -> tuple[bool, str]:
    """Verify a plugin file with Ed25519 detached signature.

    Returns (ok, reason).
    """
    path = Path(plugin_file)
    sig_path = Path(f"{path}.sig")
    pub_path = Path(f"{path}.pub")

    if not path.exists():
        return False, "plugin_file_missing"
    if not sig_path.exists():
        return False, "signature_missing"
    if not pub_path.exists():
        return False, "public_key_missing"

    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    except Exception as exc:  # pragma: no cover
        raise PluginSignatureError("cryptography dependency is required for signature checks") from exc

    try:
        payload = path.read_bytes()
        signature = base64.b64decode(sig_path.read_text(encoding="utf-8").strip())
        pub_data = pub_path.read_bytes()
        pub = serialization.load_pem_public_key(pub_data)
        if not isinstance(pub, Ed25519PublicKey):
            return False, "invalid_public_key_type"
        pub.verify(signature, payload)
        return True, "verified"
    except Exception:
        return False, "verification_failed"
