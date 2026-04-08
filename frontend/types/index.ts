/**
 * TypeScript type definitions for MediaSave.
 * All API request/response shapes, component props, and domain entities.
 */

// ── API Types ──────────────────────────────────────────────────────────────

export interface FormatItem {
  format_id: string;
  label: string;
  ext: string;
  filesize_approx: number | null;
  vcodec: string;
  acodec: string;
  height: number | null;
  type: "video" | "audio";
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number; // seconds
  uploader: string;
  view_count: number | null;
  platform: string;
  formats: FormatItem[];
}

export interface InfoRequest {
  url: string;
}

export interface DownloadRequest {
  url: string;
  format_id: string;
  type: "video" | "audio";
}

export interface DownloadResponse {
  download_id: string;
}

export interface ProgressEvent {
  status: "pending" | "downloading" | "converting" | "complete" | "error";
  percent: number;
  speed: string;
  eta: number; // seconds
  filename: string;
  download_url?: string;
  error?: string;
}

export interface ApiError {
  error: string;
  code: string;
  details: string | null;
}

// ── UI / Domain Types ──────────────────────────────────────────────────────

export type Platform =
  | "YouTube"
  | "TikTok"
  | "Instagram"
  | "Facebook"
  | "Twitter"
  | "Vimeo"
  | "Generic";

export interface PlatformInfo {
  name: Platform;
  color: string;        // Tailwind class or hex
  bgColor: string;
  label: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  platform: Platform;
  type: "video" | "audio";
  quality: string;
  timestamp: number; // Unix ms
  thumbnail: string;
}

// ── Hook State Types ───────────────────────────────────────────────────────

export type FetchState = "idle" | "loading" | "success" | "error";
export type DownloadState =
  | "idle"
  | "starting"
  | "downloading"
  | "converting"
  | "complete"
  | "error";

export interface UseVideoInfoReturn {
  info: VideoInfo | null;
  state: FetchState;
  error: string | null;
  fetchInfo: (url: string) => Promise<void>;
  reset: () => void;
}

export interface UseDownloadReturn {
  downloadState: DownloadState;
  progress: ProgressEvent | null;
  error: string | null;
  startDownload: (req: DownloadRequest) => Promise<void>;
  reset: () => void;
}
