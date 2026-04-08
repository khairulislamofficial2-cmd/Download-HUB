"""
In-Memory Progress Store
========================
Tracks download progress states for active downloads.
Used by the SSE endpoint to emit real-time progress to clients.
"""

import asyncio
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DownloadState:
    """Represents the current state of a download job."""
    download_id: str
    status: str = "pending"          # pending | downloading | converting | complete | error
    percent: float = 0.0
    speed: str = ""
    eta: int = 0                     # seconds remaining
    filename: str = ""
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


# Global in-memory store: { download_id -> DownloadState }
_store: dict[str, DownloadState] = {}
_lock = asyncio.Lock()


async def create_download(download_id: str) -> DownloadState:
    """Initialize a new download entry in the store."""
    async with _lock:
        state = DownloadState(download_id=download_id)
        _store[download_id] = state
        return state


async def update_progress(download_id: str, **kwargs) -> None:
    """Update fields on an existing download state."""
    async with _lock:
        state = _store.get(download_id)
        if state:
            for key, value in kwargs.items():
                if hasattr(state, key):
                    setattr(state, key, value)
            state.updated_at = time.time()


async def get_progress(download_id: str) -> Optional[DownloadState]:
    """Retrieve the current state for a download_id."""
    return _store.get(download_id)


async def delete_download(download_id: str) -> None:
    """Remove a download state from the store."""
    async with _lock:
        _store.pop(download_id, None)


def update_progress_sync(download_id: str, **kwargs) -> None:
    """
    Synchronous version for use inside asyncio tasks without double-awaiting.
    Directly mutates the store (safe since Python GIL protects dict ops).
    """
    state = _store.get(download_id)
    if state:
        for key, value in kwargs.items():
            if hasattr(state, key):
                setattr(state, key, value)
        state.updated_at = time.time()
