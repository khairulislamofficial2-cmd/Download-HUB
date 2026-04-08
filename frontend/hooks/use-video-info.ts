"use client";

/**
 * useVideoInfo hook
 * Manages fetching and caching video metadata from the backend.
 */

import { useCallback, useState } from "react";
import { fetchVideoInfo } from "@/lib/api";
import type { FetchState, UseVideoInfoReturn, VideoInfo } from "@/types";

export function useVideoInfo(): UseVideoInfoReturn {
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async (url: string) => {
    if (!url.trim()) return;

    setState("loading");
    setError(null);
    setInfo(null);

    try {
      const data = await fetchVideoInfo(url);
      setInfo(data);
      setState("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch video info";
      setError(message);
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setInfo(null);
    setState("idle");
    setError(null);
  }, []);

  return { info, state, error, fetchInfo, reset };
}
