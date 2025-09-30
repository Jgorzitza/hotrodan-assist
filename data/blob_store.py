"""Local blob storage helper."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

DEFAULT_BLOB_ROOT = Path(os.getenv("BLOB_ROOT", "./blob_store"))


class BlobStore:
    """Stores binary assets on the filesystem.

    Designed so we can swap for S3 later while keeping the interface stable.
    """

    def __init__(self, root: Optional[Path] = None) -> None:
        self.root = root or DEFAULT_BLOB_ROOT
        self.root.mkdir(parents=True, exist_ok=True)

    def put_bytes(self, key: str, data: bytes) -> Path:
        target = self.root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return target

    def put_text(self, key: str, text: str) -> Path:
        return self.put_bytes(key, text.encode("utf-8"))

    def open(self, key: str, mode: str = "rb"):
        target = self.root / key
        return target.open(mode)
