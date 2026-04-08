"""
Download Router
===============
Endpoints:
  POST /api/v1/download         – Start a background download, return download_id
  GET  /api/v1/progress/{id}    – SSE stream of progress events
  GET  /api/v1/file/{id}        – Stream the completed file to the browser
"""

import asyncio
import json
import logging
import os
import re
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from middleware.rate_limit import limiter
from services.progress import (
    create_download,
    delete_download,
    get_progress,
    update_progress_sync,
)
from services.ytdlp import (
    AccessDeniedError,
    DependencyMissingError,
    DownloadTimeoutError,
    StorageFullError,
    UnsupportedURLError,
    YtDlpError,
    download_media,
)

logger = logging.getLogger("mediasave.download")
router = APIRouter()

TEMP_DIR = os.getenv("TEMP_DIR", "/tmp/video-downloader")
FILE_TTL_MINUTES = int(os.getenv("FILE_TTL_MINUTES", "15"))


# ── Request Models ────────────────────────────────────────────────────────────

class DownloadRequest(BaseModel):
    url: str
    format_id: str
    type: str  # "video" | "audio"


# ── POST /download ────────────────────────────────────────────────────────────

@router.post("/download", tags=["media"])
@limiter.limit("5/minute")
async def start_download(request: Request, body: DownloadRequest):
    """
    Initiate a background download. Returns a download_id immediately.
    The client should then connect to /progress/{download_id} via SSE.
    Rate limited to 5 requests/minute per IP.
    """
    download_id = str(uuid.uuid4())
    logger.info(f"[{download_id}] Starting download: type={body.type}, format={body.format_id}, url={body.url}")

    # Initialize progress state
    await create_download(download_id)

    # Spawn background task (non-blocking)
    asyncio.create_task(
        _run_download(
            download_id=download_id,
            url=body.url,
            format_id=body.format_id,
            media_type=body.type,
        )
    )

    return {"download_id": download_id}


async def _run_download(download_id: str, url: str, format_id: str, media_type: str):
    """Background task that runs yt-dlp and updates progress store."""
    def progress_callback(data: dict):
        update_progress_sync(download_id, **data)

    try:
        filepath = await download_media(
            url=url,
            format_id=format_id,
            media_type=media_type,
            download_id=download_id,
            progress_callback=progress_callback,
        )

        filename = os.path.basename(filepath)
        update_progress_sync(
            download_id,
            status="complete",
            percent=100.0,
            filename=filename,
            download_url=f"/api/v1/file/{download_id}",
        )
        logger.info(f"[{download_id}] Completed: {filepath}")

        # Schedule file deletion after TTL
        asyncio.create_task(_schedule_file_deletion(filepath, FILE_TTL_MINUTES * 60))

    except UnsupportedURLError as e:
        update_progress_sync(download_id, status="error", error_message=str(e))
    except AccessDeniedError as e:
        update_progress_sync(download_id, status="error", error_message=str(e))
    except DependencyMissingError as e:
        update_progress_sync(download_id, status="error", error_message=str(e))
    except DownloadTimeoutError as e:
        update_progress_sync(download_id, status="error", error_message=str(e))
    except StorageFullError as e:
        update_progress_sync(download_id, status="error", error_message=str(e))
    except YtDlpError as e:
        update_progress_sync(download_id, status="error", error_message=str(e))
    except Exception as e:
        logger.exception(f"[{download_id}] Unexpected download error")
        update_progress_sync(download_id, status="error", error_message=f"Unexpected error: {e}")


async def _schedule_file_deletion(filepath: str, delay_seconds: int):
    """Delete a file after a delay (TTL enforcement)."""
    await asyncio.sleep(delay_seconds)
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Auto-deleted temp file: {filepath}")
    except Exception as e:
        logger.error(f"Failed to delete temp file {filepath}: {e}")


# ── GET /progress/{download_id} – SSE ────────────────────────────────────────

@router.get("/progress/{download_id}", tags=["media"])
async def get_download_progress(download_id: str, request: Request):
    """
    Server-Sent Events stream for download progress.
    Emits events every 500ms until status is 'complete' or 'error'.
    """
    state = await get_progress(download_id)
    if not state:
        raise HTTPException(
            status_code=404,
            detail={"error": "Download not found", "code": "NOT_FOUND", "details": None},
        )

    async def event_generator():
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                logger.info(f"[{download_id}] Client disconnected from SSE")
                break

            current = await get_progress(download_id)
            if not current:
                break

            payload = {
                "status": current.status,
                "percent": current.percent,
                "speed": current.speed,
                "eta": current.eta,
                "filename": current.filename,
            }

            if current.status == "complete":
                payload["download_url"] = current.download_url

            if current.status == "error":
                payload["error"] = current.error_message

            yield f"data: {json.dumps(payload)}\n\n"

            # Stop streaming when terminal state reached
            if current.status in ("complete", "error"):
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


# ── GET /file/{download_id} ───────────────────────────────────────────────────

@router.get("/file/{download_id}", tags=["media"])
async def download_file(download_id: str):
    """
    Stream the completed download file to the browser.
    Sets Content-Disposition: attachment with sanitized filename.
    """
    state = await get_progress(download_id)

    if not state or state.status != "complete":
        raise HTTPException(
            status_code=404,
            detail={"error": "File not found or not ready", "code": "NOT_FOUND", "details": None},
        )

    # Find file in temp dir
    filepath = None
    for fname in os.listdir(TEMP_DIR):
        if fname.startswith(download_id):
            filepath = os.path.join(TEMP_DIR, fname)
            break

    if not filepath or not os.path.exists(filepath):
        raise HTTPException(
            status_code=404,
            detail={"error": "File has expired or was deleted", "code": "FILE_EXPIRED", "details": None},
        )

    # Sanitize filename for Content-Disposition header
    safe_filename = _sanitize_filename(state.filename or os.path.basename(filepath))

    return FileResponse(
        path=filepath,
        filename=safe_filename,
        media_type="application/octet-stream",
    )


def _sanitize_filename(filename: str) -> str:
    """Remove characters unsafe for HTTP headers and filenames."""
    # Remove everything except alphanumerics, dots, dashes, underscores, spaces
    safe = re.sub(r"[^\w\s\-.]", "", filename)
    # Collapse multiple spaces/underscores
    safe = re.sub(r"\s+", "_", safe.strip())
    return safe or "download"
