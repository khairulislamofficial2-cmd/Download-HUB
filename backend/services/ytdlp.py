"""
yt-dlp Service
==============
Wraps yt-dlp subprocess calls for:
  - Fetching video metadata (--dump-json)
  - Downloading video/audio files with real-time progress parsing
"""

import asyncio
import json
import logging
import os
import re
import shutil
import tempfile
from typing import AsyncIterator, Callable

logger = logging.getLogger("mediasave.ytdlp")

TEMP_DIR = os.getenv("TEMP_DIR", "/tmp/video-downloader")
YTDLP_RATE_LIMIT = os.getenv("YTDLP_RATE_LIMIT", "5M")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "2048"))


# ── Error classes ─────────────────────────────────────────────────────────────

class YtDlpError(Exception):
    """Base error for yt-dlp failures."""
    code: str = "YTDLP_ERROR"


class UnsupportedURLError(YtDlpError):
    code = "UNSUPPORTED_URL"


class AccessDeniedError(YtDlpError):
    code = "ACCESS_DENIED"


class DependencyMissingError(YtDlpError):
    code = "DEPENDENCY_MISSING"


class DownloadTimeoutError(YtDlpError):
    code = "DOWNLOAD_TIMEOUT"


class StorageFullError(YtDlpError):
    code = "STORAGE_FULL"


# ── Metadata fetch ────────────────────────────────────────────────────────────

async def fetch_video_info(url: str) -> dict:
    """
    Run `yt-dlp --dump-json --no-playlist <url>` and return parsed JSON.
    Raises typed exceptions for known failure modes.
    Timeout: 30 seconds.
    """
    if not shutil.which("yt-dlp"):
        raise DependencyMissingError("yt-dlp binary not found on PATH")

    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-playlist",
        "--quiet",
        "--no-check-certificates",
        "--extractor-retries", "3",
        url,
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        except asyncio.TimeoutError:
            proc.kill()
            raise asyncio.TimeoutError()

    except asyncio.TimeoutError:
        raise asyncio.TimeoutError("yt-dlp info fetch timed out after 30s")
    except FileNotFoundError:
        raise DependencyMissingError("yt-dlp executable not found")

    if proc.returncode != 0:
        _raise_from_stderr(stderr.decode("utf-8", errors="replace"), url)

    try:
        data = json.loads(stdout.decode("utf-8", errors="replace"))
    except json.JSONDecodeError as e:
        raise YtDlpError(f"Failed to parse yt-dlp output: {e}")

    return data


def _raise_from_stderr(stderr: str, url: str):
    """Map yt-dlp stderr messages to typed exceptions."""
    lower = stderr.lower()
    if any(k in lower for k in ["unsupported url", "is not supported", "no video formats"]):
        raise UnsupportedURLError(f"URL not supported: {url}\n\nFull Output: {stderr}")
    if any(k in lower for k in ["private video", "age-restricted", "geo-restricted",
                                  "members only", "login required", "not available"]):
        raise AccessDeniedError(f"Access denied for: {url}\n\nFull Output: {stderr}")
    if "no space left" in lower:
        raise StorageFullError(f"Disk full – cannot download\n\nFull Output: {stderr}")
    raise YtDlpError(f"yt-dlp failed:\n\n{stderr}")


# ── Format filtering ──────────────────────────────────────────────────────────

def extract_formats(raw_data: dict) -> list[dict]:
    """
    Filter and deduplicate formats from yt-dlp metadata.
    Returns a clean list of format dicts for the API response.
    """
    raw_formats = raw_data.get("formats", [])
    seen_resolutions: set[str] = set()
    result = []

    # Video + Audio formats (best per resolution)
    for fmt in reversed(raw_formats):  # reversed = best quality first
        vcodec = fmt.get("vcodec", "none")
        acodec = fmt.get("acodec", "none")
        height = fmt.get("height")

        if vcodec == "none" or not height:
            continue  # skip audio-only in this pass

        key = str(height)
        if key in seen_resolutions:
            continue
        seen_resolutions.add(key)

        result.append({
            "format_id": fmt.get("format_id", ""),
            "label": f"{height}p {fmt.get('ext', 'mp4').upper()}",
            "ext": fmt.get("ext", "mp4"),
            "filesize_approx": fmt.get("filesize_approx") or fmt.get("filesize"),
            "vcodec": vcodec,
            "acodec": acodec,
            "height": height,
            "type": "video",
        })

    # Audio-only formats (best 2)
    audio_formats = [
        f for f in raw_formats
        if f.get("vcodec") == "none" and f.get("acodec") != "none"
    ]
    audio_formats.sort(key=lambda f: f.get("abr", 0) or 0, reverse=True)

    for fmt in audio_formats[:2]:
        abr = fmt.get("abr", 0) or 0
        result.append({
            "format_id": fmt.get("format_id", ""),
            "label": f"Audio {int(abr)}kbps {fmt.get('ext', 'webm').upper()}" if abr else "Audio (best)",
            "ext": fmt.get("ext", "webm"),
            "filesize_approx": fmt.get("filesize_approx") or fmt.get("filesize"),
            "vcodec": "none",
            "acodec": fmt.get("acodec", ""),
            "height": None,
            "type": "audio",
        })

    return result


# ── Download ──────────────────────────────────────────────────────────────────

# Regex pattern to parse yt-dlp progress output lines like:
# [download]  45.2% of ~123.45MiB at 2.50MiB/s ETA 00:30
_PROGRESS_RE = re.compile(
    r"\[download\]\s+([\d.]+)%\s+of\s+[\S]+\s+at\s+([\S]+)\s+ETA\s+([\d:]+)"
)


async def download_media(
    url: str,
    format_id: str,
    media_type: str,  # "video" | "audio"
    download_id: str,
    progress_callback: Callable[[dict], None],
) -> str:
    """
    Run yt-dlp to download media, calling progress_callback with status updates.
    Returns the path to the downloaded file.
    Timeout: 10 minutes.
    """
    if not shutil.which("yt-dlp"):
        raise DependencyMissingError("yt-dlp binary not found on PATH")

    os.makedirs(TEMP_DIR, exist_ok=True)
    output_template = os.path.join(TEMP_DIR, f"{download_id}.%(ext)s")

    if media_type == "audio":
        cmd = [
            "yt-dlp",
            "--format", "bestaudio",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--output", output_template,
            "--no-playlist",
            "--newline",           # Force progress on separate lines
            "--rate-limit", YTDLP_RATE_LIMIT,
            url,
        ]
    else:
        cmd = [
            "yt-dlp",
            "--format", f"{format_id}+bestaudio/best",
            "--merge-output-format", "mp4",
            "--output", output_template,
            "--no-playlist",
            "--newline",
            "--rate-limit", YTDLP_RATE_LIMIT,
            url,
        ]

    logger.info(f"[{download_id}] Starting download: {' '.join(cmd)}")

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        # Stream output and parse progress
        async def _read_output():
            assert proc.stdout
            async for raw_line in proc.stdout:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                logger.debug(f"[{download_id}] yt-dlp: {line}")

                # Detect conversion stage
                if "[ExtractAudio]" in line or "Merging" in line or "ffmpeg" in line.lower():
                    progress_callback({
                        "status": "converting",
                        "percent": 99.0,
                        "speed": "",
                        "eta": 0,
                    })
                    continue

                # Parse download progress
                match = _PROGRESS_RE.search(line)
                if match:
                    percent = float(match.group(1))
                    speed = match.group(2)
                    eta_str = match.group(3)
                    eta_seconds = _parse_eta(eta_str)
                    progress_callback({
                        "status": "downloading",
                        "percent": percent,
                        "speed": speed,
                        "eta": eta_seconds,
                    })

        try:
            await asyncio.wait_for(
                asyncio.gather(_read_output(), proc.wait()),
                timeout=600,  # 10 minutes
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise DownloadTimeoutError("Download exceeded 10-minute timeout")

    except FileNotFoundError:
        raise DependencyMissingError("yt-dlp executable not found")

    if proc.returncode != 0:
        raise YtDlpError(f"yt-dlp exited with code {proc.returncode}")

    # Find the output file
    ext = "mp3" if media_type == "audio" else "mp4"
    output_path = os.path.join(TEMP_DIR, f"{download_id}.{ext}")

    if not os.path.exists(output_path):
        # Search for any file matching the download_id prefix
        for fname in os.listdir(TEMP_DIR):
            if fname.startswith(download_id):
                output_path = os.path.join(TEMP_DIR, fname)
                break
        else:
            raise YtDlpError("Downloaded file not found after yt-dlp completed")

    logger.info(f"[{download_id}] Download complete: {output_path}")
    return output_path


def _parse_eta(eta_str: str) -> int:
    """Convert ETA string like '01:23' or '1:02:03' to seconds."""
    try:
        parts = list(map(int, eta_str.split(":")))
        if len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
    except ValueError:
        pass
    return 0
