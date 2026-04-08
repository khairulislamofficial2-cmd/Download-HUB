"""
Info Router – POST /api/v1/info
================================
Accepts a URL, fetches video metadata via yt-dlp, and returns a structured
response including title, thumbnail, formats, and platform details.
Results are cached in memory for 5 minutes (TTLCache).
"""

import asyncio
import logging
from typing import Optional

from cachetools import TTLCache
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, HttpUrl

from middleware.rate_limit import limiter
from services.ytdlp import (
    AccessDeniedError,
    DependencyMissingError,
    UnsupportedURLError,
    YtDlpError,
    extract_formats,
    fetch_video_info,
)

logger = logging.getLogger("mediasave.info")
router = APIRouter()

# In-memory TTL cache: max 100 entries, 5-minute TTL
_cache: TTLCache = TTLCache(maxsize=100, ttl=300)


# ── Request / Response Models ─────────────────────────────────────────────────

class InfoRequest(BaseModel):
    url: str  # Keep as str to allow any URL format (yt-dlp validates)


class FormatItem(BaseModel):
    format_id: str
    label: str
    ext: str
    filesize_approx: Optional[int]
    vcodec: str
    acodec: str
    height: Optional[int]
    type: str  # "video" | "audio"


class InfoResponse(BaseModel):
    title: str
    thumbnail: str
    duration: int
    uploader: str
    view_count: Optional[int]
    platform: str
    formats: list[FormatItem]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/info", response_model=InfoResponse, tags=["media"])
@limiter.limit("10/minute")
async def get_video_info(request: Request, body: InfoRequest):
    """
    Fetch video metadata from any yt-dlp-supported URL.
    Rate limited to 10 requests/minute per IP.
    Results cached for 5 minutes.
    """
    url = body.url.strip()

    # Check cache first
    if url in _cache:
        logger.info(f"Cache hit for: {url}")
        return _cache[url]

    logger.info(f"Fetching info for: {url}")

    try:
        raw_data = await fetch_video_info(url)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"error": "Request timed out", "code": "TIMEOUT", "details": "yt-dlp info fetch exceeded 30s"},
        )
    except UnsupportedURLError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": str(e), "code": "UNSUPPORTED_URL", "details": None},
        )
    except AccessDeniedError as e:
        raise HTTPException(
            status_code=403,
            detail={"error": str(e), "code": "ACCESS_DENIED", "details": None},
        )
    except DependencyMissingError as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "code": "DEPENDENCY_MISSING", "details": None},
        )
    except YtDlpError as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "code": "YTDLP_ERROR", "details": None},
        )
    except Exception as e:
        logger.exception(f"Unexpected error fetching info for {url}")
        error_msg = repr(e)
        raise HTTPException(
            status_code=500,
            detail={"error": error_msg, "code": "INTERNAL_ERROR", "details": repr(e)},
        )

    # Extract and shape the response
    formats = extract_formats(raw_data)

    response = InfoResponse(
        title=raw_data.get("title", "Unknown Title"),
        thumbnail=raw_data.get("thumbnail", ""),
        duration=int(raw_data.get("duration", 0) or 0),
        uploader=raw_data.get("uploader", raw_data.get("channel", "Unknown")),
        view_count=raw_data.get("view_count"),
        platform=raw_data.get("extractor_key", "Generic"),
        formats=formats,
    )

    # Cache the result
    _cache[url] = response
    return response


@router.get("/test-ytdlp", tags=["system"])
async def test_ytdlp():
    """Test endpoint that runs yt-dlp against a known YouTube video."""
    url = "https://youtu.be/dQw4w9WgXcQ"
    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp", "--dump-json", "--no-playlist", url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        
        return {
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "returncode": proc.returncode
        }
    except Exception as e:
        return {"error": repr(e)}
