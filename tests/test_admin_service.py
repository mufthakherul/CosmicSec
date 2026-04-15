"""Tests for admin service state management utilities."""

from __future__ import annotations

import json

import pytest

from services.admin_service import state as admin_state


def _set_temp_paths(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setattr(admin_state, "STATE_PATH", tmp_path / "admin_state.json")
    monkeypatch.setattr(admin_state, "BACKUP_PATH", tmp_path / "admin_state_backup.json")
    monkeypatch.setattr(admin_state, "_MEMORY_STATE", None)


def test_dynamic_mode_uses_in_memory_singleton(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "dynamic")

    first = admin_state.load_state()
    second = admin_state.load_state()

    assert first is second
    assert first.config["maintenance_mode"] is False


def test_dynamic_mode_save_state_updates_memory(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "dynamic")

    st = admin_state.load_state()
    st.users.append({"email": "admin@cosmicsec.local", "role": "admin"})
    admin_state.save_state(st)

    loaded = admin_state.load_state()
    assert loaded.users[0]["email"] == "admin@cosmicsec.local"
    assert not admin_state.STATE_PATH.exists()


def test_dynamic_mode_backup_raises(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "dynamic")

    with pytest.raises(RuntimeError):
        admin_state.backup_state()


def test_dynamic_mode_restore_returns_false(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "dynamic")

    assert admin_state.restore_backup() is False


def test_emergency_load_creates_state_file(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "emergency_json")

    st = admin_state.load_state()

    assert admin_state.STATE_PATH.exists()
    raw = json.loads(admin_state.STATE_PATH.read_text(encoding="utf-8"))
    assert raw["config"]["maintenance_mode"] is False
    assert st.modules["scan"] is True


def test_emergency_save_and_reload(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "emergency_json")

    st = admin_state.load_state()
    st.roles["admin@cosmicsec.local"] = "owner"
    admin_state.save_state(st)

    reloaded = admin_state.load_state()
    assert reloaded.roles["admin@cosmicsec.local"] == "owner"


def test_emergency_backup_and_restore(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "emergency_json")

    st = admin_state.load_state()
    st.config["maintenance_mode"] = True
    admin_state.save_state(st)
    backup = admin_state.backup_state()
    assert backup.exists()

    st.config["maintenance_mode"] = False
    admin_state.save_state(st)

    restored = admin_state.restore_backup()
    restored_state = admin_state.load_state()
    assert restored is True
    assert restored_state.config["maintenance_mode"] is True


def test_emergency_restore_without_backup_returns_false(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    _set_temp_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(admin_state, "STORAGE_MODE", "emergency_json")

    assert admin_state.restore_backup() is False
