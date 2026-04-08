# ── Build stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

# System dependencies: ffmpeg for media processing, curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer-cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# Copy application source
COPY . .

# Create temp download directory
RUN mkdir -p /tmp/video-downloader

# Expose the API port
# Install latest yt-dlp via pip (ensured fresh install on rebuild)
RUN pip install -U yt-dlp

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with 2 workers for production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
