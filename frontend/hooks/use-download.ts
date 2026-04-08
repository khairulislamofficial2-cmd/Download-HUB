"use client";

/**
 * useDownload hook
 * Manages the full download lifecycle:
 *   1. POST /download → receive download_id
 *   2. Subscribe to SSE progress stream
 *   3. On complete → trigger file download
 */

import { useCallback, useRef, useState } from "react";
import { startDownload, subscribeToProgress, triggerFileDownload } from "@/lib/api";
import type {
  DownloadRequest,
  DownloadState,
  ProgressEvent,
  UseDownloadReturn,
} from "@/types";

export function useDownload(): UseDownloadReturn {
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep ref to EventSource so we can close it
  const eventSourceRef = useRef<EventSource | null>(null);

  const startDownloadFn = useCallback(async (req: DownloadRequest) => {
    // Reset state
    setDownloadState("starting");
    setProgress(null);
    setError(null);

    // Close any existing SSE connection
    eventSourceRef.current?.close();

    try {
      // 1. Start the download job
      const { download_id } = await startDownload(req);

      // 2. Subscribe to SSE progress
      const es = subscribeToProgress(
        download_id,
        (event: ProgressEvent) => {
          setProgress(event);

          // Update download state from SSE status
          if (event.status === "downloading") {
            setDownloadState("downloading");
          } else if (event.status === "converting") {
            setDownloadState("converting");
          } else if (event.status === "complete") {
            setDownloadState("complete");
            es.close();
            eventSourceRef.current = null;

            // 3. Trigger browser file download
            if (event.filename) {
              triggerFileDownload(download_id, event.filename);
            }
          } else if (event.status === "error") {
            setDownloadState("error");
            setError(event.error ?? "An unknown download error occurred");
            es.close();
            eventSourceRef.current = null;
          }
        },
        (_err: Event) => {
          // SSE connection error
          setDownloadState("error");
          setError("Lost connection to download stream. Please try again.");
          es.close();
          eventSourceRef.current = null;
        }
      );

      eventSourceRef.current = es;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start download";
      setError(message);
      setDownloadState("error");
    }
  }, []);

  const reset = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setDownloadState("idle");
    setProgress(null);
    setError(null);
  }, []);

  return { downloadState, progress, error, startDownload: startDownloadFn, reset };
}
