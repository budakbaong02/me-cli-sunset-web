"""WebUI-XL storage layer."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from webui.storage.backend import (
    ENCRYPTED_BLOB_KEYS,
    GLOBAL_SESSION_SECRET,
    GLOBAL_TELEGRAM_CONFIG,
    GLOBAL_USERS_REGISTRY,
    SHARED_HOT,
    SHARED_HOT2,
    StorageBackend,
    USER_ACTIVE_NUMBER,
    USER_AX_FP,
    USER_BOOKMARK,
    USER_DECOY_DIR,
    USER_MONITORING,
    USER_QUOTA_CACHE,
    USER_REFRESH_TOKENS,
    USER_TELEGRAM,
    is_encrypted_key,
    normalize_blob_key,
)
from webui.storage.crypto import (
    decrypt_bytes,
    decrypt_text,
    encrypt_bytes,
    encrypt_text,
    is_encrypted,
    resolve_encryption_key,
)
from webui.storage.file_backend import FileBackend
from webui.storage.tenant import (
    current_storage_username,
    ensure_user_bootstrap,
    get_storage_username,
    read_user_json,
    read_user_text,
    write_user_json,
    write_user_text,
)

__all__ = [
    "ENCRYPTED_BLOB_KEYS",
    "GLOBAL_SESSION_SECRET",
    "GLOBAL_TELEGRAM_CONFIG",
    "GLOBAL_USERS_REGISTRY",
    "SHARED_HOT",
    "SHARED_HOT2",
    "StorageBackend",
    "USER_ACTIVE_NUMBER",
    "USER_AX_FP",
    "USER_BOOKMARK",
    "USER_DECOY_DIR",
    "USER_MONITORING",
    "USER_QUOTA_CACHE",
    "USER_REFRESH_TOKENS",
    "USER_TELEGRAM",
    "clear_storage_cache",
    "current_storage_username",
    "ensure_user_bootstrap",
    "get_storage_username",
    "read_user_json",
    "read_user_text",
    "write_user_json",
    "write_user_text",
    "decrypt_bytes",
    "decrypt_text",
    "encrypt_bytes",
    "encrypt_text",
    "get_storage",
    "is_encrypted",
    "is_encrypted_key",
    "normalize_blob_key",
    "resolve_encryption_key",
]


def _storage_backend_name() -> str:
    return os.getenv("WEBUI_STORAGE_BACKEND", "file").strip().lower() or "file"


def _encrypt_at_rest_enabled() -> bool:
    raw = os.getenv("STORAGE_ENCRYPT_AT_REST", "1").strip().lower()
    return raw not in ("0", "false", "no", "off")


@lru_cache(maxsize=1)
def get_storage() -> StorageBackend:
    backend = _storage_backend_name()
    if backend == "file":
        return FileBackend(encrypt_at_rest=_encrypt_at_rest_enabled())
    if backend == "sqlite":
        raise NotImplementedError("SQLite backend ships in PR-3 (webui/storage/sqlite_backend.py)")
    raise ValueError(f"Unknown WEBUI_STORAGE_BACKEND: {backend!r}")


def clear_storage_cache() -> None:
    get_storage.cache_clear()