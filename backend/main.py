"""
MediaSave – FastAPI Backend Entry Point
======================================
Configures CORS, mounts all routers, handles startup/shutdown lifecycle events,
and exposes a health check endpoint.
"""

import asyncio
import logging
import os
import shutil
import subprocess
import sys
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    # Prevent Uvicorn from reverting to SelectorEventLoop on Windows
    asyncio.set_event_loop_policy = lambda policy: None

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from middleware.rate_limit import limiter
from routers import download, info

# ── Environment & Logging ─────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("mediasave")

TEMP_DIR = os.getenv("TEMP_DIR", "/tmp/video-downloader")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")


# ── Startup / Shutdown lifecycle ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify dependencies and prepare temp directory on startup; clean up on shutdown."""
    # --- Startup ---
    logger.info("Starting MediaSave backend…")

    # Ensure yt-dlp is available
    ytdlp_path = shutil.which("yt-dlp")
    if not ytdlp_path:
        raise RuntimeError(
            "yt-dlp binary not found. Install it with: pip install yt-dlp"
        )
    logger.info(f"yt-dlp found at: {ytdlp_path}")

    # Ensure ffmpeg is available
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        logger.warning(
            "ffmpeg not found – video merging and audio conversion will fail."
        )
    else:
        logger.info(f"ffmpeg found at: {ffmpeg_path}")

    # Create temp download directory
    os.makedirs(TEMP_DIR, exist_ok=True)
    logger.info(f"Temp directory ready: {TEMP_DIR}")

    # Start background cleanup task (every 30 minutes)
    cleanup_task = asyncio.create_task(_periodic_cleanup())

    yield  # Application is now running

    # --- Shutdown ---
    logger.info("Shutting down MediaSave backend…")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    _cleanup_temp_dir()


async def _periodic_cleanup():
    """Remove expired temp files every 30 minutes."""
    while True:
        await asyncio.sleep(30 * 60)
        _cleanup_temp_dir()


def _cleanup_temp_dir():
    """Delete all files in the temp directory."""
    try:
        for filename in os.listdir(TEMP_DIR):
            filepath = os.path.join(TEMP_DIR, filename)
            if os.path.isfile(filepath):
                os.remove(filepath)
                logger.debug(f"Cleaned up: {filepath}")
    except Exception as e:
        logger.error(f"Cleanup error: {e}")


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="MediaSave API",
    description="Video & audio downloader API powered by yt-dlp",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(info.router, prefix="/api/v1")
app.include_router(download.router, prefix="/api/v1")


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/v1/health", tags=["system"])
async def health_check():
    """Returns service health, yt-dlp version, and ffmpeg version."""
    
    # Get yt-dlp version
    ytdlp_version = "unknown"
    try:
        result = await asyncio.create_subprocess_exec(
            "yt-dlp", "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await asyncio.wait_for(result.communicate(), timeout=5)
        ytdlp_version = stdout.decode().strip()
    except Exception:
        ytdlp_version = "unavailable"

    # Get ffmpeg version
    ffmpeg_version = "unknown"
    ffmpeg_available = shutil.which("ffmpeg") is not None
    if ffmpeg_available:
        try:
            result = await asyncio.create_subprocess_exec(
                "ffmpeg", "-version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await asyncio.wait_for(result.communicate(), timeout=5)
            ffmpeg_version = stdout.decode().splitlines()[0] if stdout else "unknown"
        except Exception:
            ffmpeg_version = "unavailable"

    return {
        "status": "healthy",
        "yt_dlp_version": ytdlp_version,
        "ffmpeg_available": ffmpeg_available,
        "ffmpeg_version": ffmpeg_version,
    }
