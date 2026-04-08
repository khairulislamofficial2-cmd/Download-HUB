"use client";

/**
 * Download Buttons – Video (MP4) and Audio (MP3) side-by-side.
 * Handles disabled states, loading spinner, and initiating download.
 */

import { motion } from "framer-motion";
import { Download, Music, Loader2 } from "lucide-react";
import type { DownloadState, VideoInfo } from "@/types";

interface DownloadButtonsProps {
  info: VideoInfo | null;
  selectedFormatId: string;
  url: string;
  downloadState: DownloadState;
  onDownload: (type: "video" | "audio") => void;
}

export function DownloadButtons({
  info,
  selectedFormatId,
  url,
  downloadState,
  onDownload,
}: DownloadButtonsProps) {
  const isDisabled = !info || !url || downloadState !== "idle";
  const isActive = downloadState !== "idle" && downloadState !== "complete";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
      }}
    >
      {/* Video Download */}
      <motion.button
        onClick={() => onDownload("video")}
        disabled={isDisabled}
        aria-label="Download as MP4 video"
        title={!info ? "Enter a URL first" : "Download as MP4 video"}
        whileHover={!isDisabled ? { scale: 1.02, y: -1 } : {}}
        whileTap={!isDisabled ? { scale: 0.99 } : {}}
        style={{
          height: "52px",
          borderRadius: "12px",
          border: "none",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.45 : 1,
          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          color: "white",
          fontWeight: 600,
          fontSize: "14px",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          boxShadow: !isDisabled ? "0 4px 16px rgba(139,92,246,0.3)" : "none",
          transition: "box-shadow 0.2s, opacity 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shimmer effect while active */}
        {isActive && (
          <motion.div
            animate={{ x: ["−100%", "200%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
              pointerEvents: "none",
            }}
          />
        )}

        {isActive ? (
          <Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} />
        ) : (
          <Download size={17} />
        )}
        {isActive ? "Preparing…" : "Download MP4"}
      </motion.button>

      {/* Audio Download */}
      <motion.button
        onClick={() => onDownload("audio")}
        disabled={isDisabled}
        aria-label="Download as MP3 audio"
        title={!info ? "Enter a URL first" : "Download as MP3 audio"}
        whileHover={!isDisabled ? { scale: 1.02, y: -1 } : {}}
        whileTap={!isDisabled ? { scale: 0.99 } : {}}
        style={{
          height: "52px",
          borderRadius: "12px",
          border: "1px solid rgba(139,92,246,0.3)",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.45 : 1,
          background: "rgba(139,92,246,0.1)",
          color: "#a78bfa",
          fontWeight: 600,
          fontSize: "14px",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.18)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.5)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.1)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.3)";
        }}
      >
        {isActive ? (
          <Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} />
        ) : (
          <Music size={17} />
        )}
        {isActive ? "Preparing…" : "Download MP3"}
      </motion.button>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
