"use client";

/**
 * VideoPreview – Shows video metadata (thumbnail, title, duration, etc.)
 * Animates in from below. Shows skeleton while loading. Shows error card on failure.
 */

import { motion } from "framer-motion";
import { Play, Clock, Eye, RotateCcw } from "lucide-react";
import Image from "next/image";
import { PlatformBadge } from "./platform-badge";
import { detectPlatform, normalizePlatformName } from "@/lib/platforms";
import type { VideoInfo, FetchState } from "@/types";

interface VideoPreviewProps {
  info: VideoInfo | null;
  state: FetchState;
  error: string | null;
  url: string;
  onRetry: () => void;
}

/** Format seconds to mm:ss or hh:mm:ss */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Format large numbers (e.g. 1200000 → 1.2M) */
function formatViewCount(count: number | null): string {
  if (count === null) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

// ── Skeleton Component ─────────────────────────────────────────────────────

function SkeletonPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ overflow: "hidden" }}
    >
      {/* Thumbnail skeleton */}
      <div
        className="skeleton"
        style={{ width: "100%", aspectRatio: "16/9", borderRadius: 0 }}
      />
      <div style={{ padding: "20px" }}>
        {/* Title skeleton */}
        <div className="skeleton" style={{ height: "22px", borderRadius: "6px", marginBottom: "8px" }} />
        <div className="skeleton" style={{ height: "22px", width: "60%", borderRadius: "6px", marginBottom: "16px" }} />
        {/* Meta row */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div className="skeleton" style={{ height: "24px", width: "80px", borderRadius: "6px" }} />
          <div className="skeleton" style={{ height: "24px", width: "80px", borderRadius: "6px" }} />
          <div className="skeleton" style={{ height: "24px", width: "100px", borderRadius: "6px" }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Error Card ─────────────────────────────────────────────────────────────

function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: "32px", textAlign: "center" }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: "24px",
        }}
      >
        ⚠️
      </div>
      <h3 style={{ color: "#f4f4f5", fontWeight: 600, marginBottom: "8px" }}>
        Failed to Load Video
      </h3>
      <p style={{ color: "#a1a1aa", fontSize: "14px", marginBottom: "20px", lineHeight: 1.5 }}>
        {error}
      </p>
      <button
        onClick={onRetry}
        aria-label="Retry fetching video information"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          color: "#f4f4f5",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <RotateCcw size={15} />
        Try Again
      </button>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function VideoPreview({ info, state, error, url, onRetry }: VideoPreviewProps) {
  if (state === "loading") return <SkeletonPreview />;
  if (state === "error" && error) return <ErrorCard error={error} onRetry={onRetry} />;
  if (!info) return null;

  const platformName = normalizePlatformName(info.platform);
  const platformInfo = detectPlatform(url) ?? {
    name: platformName,
    color: "#a1a1aa",
    bgColor: "rgba(161,161,170,0.1)",
    label: platformName,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="glass-card"
      style={{ overflow: "hidden" }}
      layout
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          background: "#18181b",
          overflow: "hidden",
        }}
      >
        {info.thumbnail ? (
          <Image
            src={info.thumbnail}
            alt={`Thumbnail for ${info.title}`}
            fill
            style={{ objectFit: "cover" }}
            placeholder="blur"
            blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%2318181b'/%3E%3C/svg%3E"
            unoptimized
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #27272a, #18181b)",
            }}
          />
        )}

        {/* Play icon overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(139,92,246,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 24px rgba(139,92,246,0.5)",
            }}
          >
            <Play size={22} color="white" fill="white" style={{ marginLeft: "3px" }} />
          </div>
        </div>

        {/* Duration badge */}
        {info.duration > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              background: "rgba(0,0,0,0.8)",
              borderRadius: "6px",
              padding: "3px 8px",
              color: "white",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Clock size={11} />
            {formatDuration(info.duration)}
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: "20px" }}>
        {/* Title */}
        <h2
          style={{
            color: "#f4f4f5",
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: "1.4",
            marginBottom: "8px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          title={info.title}
        >
          {info.title}
        </h2>

        {/* Uploader */}
        <p
          style={{
            color: "#a1a1aa",
            fontSize: "13px",
            marginBottom: "14px",
            fontWeight: 500,
          }}
        >
          {info.uploader}
        </p>

        {/* Meta badges row */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <PlatformBadge platform={platformInfo} />

          {info.view_count !== null && info.view_count > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "#a1a1aa",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "6px",
                padding: "4px 10px",
              }}
            >
              <Eye size={12} />
              {formatViewCount(info.view_count)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
