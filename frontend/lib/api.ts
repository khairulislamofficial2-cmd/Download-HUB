/**
 * Typed API client for MediaSave backend.
 * All requests go through these typed wrappers.
 */

import type {
  DownloadRequest,
  DownloadResponse,
  InfoRequest,
  ProgressEvent,
  VideoInfo,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Generic fetch wrapper ─────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorBody: { error?: string; code?: string; detail?: { error?: string } };
    try {
      errorBody = await res.json();
    } catch {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // FastAPI wraps our error dicts under `detail`
    const msg =
      errorBody?.detail?.error ??
      errorBody?.error ??
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ── API Methods ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/info
 * Fetch video metadata for a given URL.
 */
export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  return apiFetch<VideoInfo>("/api/v1/info", {
    method: "POST",
    body: JSON.stringify({ url } satisfies InfoRequest),
  });
}

/**
 * POST /api/v1/download
 * Initiate a download and receive a download_id.
 */
export async function startDownload(
  req: DownloadRequest
): Promise<DownloadResponse> {
  return apiFetch<DownloadResponse>("/api/v1/download", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * GET /api/v1/progress/{download_id}
 * Subscribe to SSE progress events.
 * Returns an EventSource instance – caller is responsible for closing it.
 */
export function subscribeToProgress(
  downloadId: string,
  onMessage: (event: ProgressEvent) => void,
  onError: (err: Event) => void
): EventSource {
  const url = `${BASE_URL}/api/v1/progress/${downloadId}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data as string) as ProgressEvent;
      onMessage(data);
    } catch {
      console.error("Failed to parse SSE event:", e.data);
    }
  };

  es.onerror = (err) => {
    onError(err);
  };

  return es;
}

/**
 * GET /api/v1/file/{download_id}
 * Trigger a file download in the browser.
 */
export function triggerFileDownload(downloadId: string, filename: string): void {
  const url = `${BASE_URL}/api/v1/file/${downloadId}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * GET /health
 */
export async function checkHealth(): Promise<{
  status: string;
  yt_dlp_version: string;
  ffmpeg_available: boolean;
}> {
  return apiFetch("/health");
}
