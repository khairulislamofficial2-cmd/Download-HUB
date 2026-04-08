"use client";

/**
 * DownloadHistory – Shows last 20 downloads from localStorage.
 * Features: thumbnail, title, platform/type badges, relative time, re-download button.
 * Staggered animation on mount. Clear history button.
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Trash2, RefreshCw, History, Download } from "lucide-react";
import { PlatformBadge } from "./platform-badge";
import { loadHistory, clearHistory } from "@/lib/history";
import { detectPlatform } from "@/lib/platforms";
import type { HistoryEntry } from "@/types";

interface DownloadHistoryProps {
  onRedownload: (entry: HistoryEntry) => void;
  refreshKey?: number; // Increment to trigger refresh
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function DownloadHistory({ onRedownload, refreshKey = 0 }: DownloadHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  const reload = useCallback(() => {
    setEntries(loadHistory());
  }, []);

  // Load on mount and whenever refreshKey changes
  useEffect(() => {
    setMounted(true);
    reload();
  }, [reload, refreshKey]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setEntries([]);
  }, []);

  // Avoid SSR mismatch (localStorage is client-only)
  if (!mounted) return null;
  if (entries.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      aria-label="Download history"
      style={{ width: "100%" }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={16} color="#52525b" />
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#a1a1aa" }}>
            Recent Downloads
          </h2>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#52525b",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "99px",
              padding: "2px 8px",
            }}
          >
            {entries.length}
          </span>
        </div>

        <button
          onClick={handleClearHistory}
          aria-label="Clear all download history"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "8px",
            color: "#52525b",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = "#f87171";
            btn.style.borderColor = "rgba(239,68,68,0.2)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = "#52525b";
            btn.style.borderColor = "rgba(255,255,255,0.06)";
          }}
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      {/* History list */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <AnimatePresence initial={false}>
          {entries.map((entry, index) => {
            const platformInfo = detectPlatform(entry.url) ?? {
              name: entry.platform,
              color: "#a1a1aa",
              bgColor: "rgba(161,161,170,0.1)",
              label: entry.platform,
            };

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderBottom:
                    index < entries.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: "44px",
                    height: "30px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    background: "#27272a",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {entry.thumbnail ? (
                    <Image
                      src={entry.thumbnail}
                      alt={entry.title}
                      fill
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                      }}
                    >
                      {entry.type === "audio" ? "🎵" : "🎬"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      color: "#e4e4e7",
                      fontSize: "13px",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: "4px",
                    }}
                    title={entry.title}
                  >
                    {entry.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <PlatformBadge platform={platformInfo} size="sm" />

                    {/* Type badge */}
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: entry.type === "audio"
                          ? "rgba(34,197,94,0.1)"
                          : "rgba(139,92,246,0.1)",
                        border: `1px solid ${entry.type === "audio" ? "rgba(34,197,94,0.2)" : "rgba(139,92,246,0.2)"}`,
                        color: entry.type === "audio" ? "#4ade80" : "#a78bfa",
                        fontWeight: 600,
                      }}
                    >
                      {entry.type === "audio" ? "MP3" : "MP4"}
                    </span>

                    <span style={{ fontSize: "11px", color: "#52525b" }}>
                      {relativeTime(entry.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Re-download button */}
                <button
                  onClick={() => onRedownload(entry)}
                  aria-label={`Re-download ${entry.title}`}
                  title="Re-download"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.15)",
                    cursor: "pointer",
                    color: "#8b5cf6",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = "rgba(139,92,246,0.2)";
                    btn.style.borderColor = "rgba(139,92,246,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = "rgba(139,92,246,0.08)";
                    btn.style.borderColor = "rgba(139,92,246,0.15)";
                  }}
                >
                  <RefreshCw size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
