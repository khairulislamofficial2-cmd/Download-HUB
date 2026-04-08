"use client";

/**
 * MediaSave – Main Page
 * Orchestrates all components: URL input, video preview, format selector,
 * download buttons, progress bar, and download history.
 * Handles toast notifications and localStorage history.
 */

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { UrlInput } from "@/components/url-input";
import { VideoPreview } from "@/components/video-preview";
import { FormatSelector } from "@/components/format-selector";
import { DownloadButtons } from "@/components/download-button";
import { ProgressBar } from "@/components/progress-bar";
import { DownloadHistory } from "@/components/download-history";

import { useVideoInfo } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { addHistoryEntry } from "@/lib/history";
import { normalizePlatformName } from "@/lib/platforms";
import type { HistoryEntry } from "@/types";

export default function Home() {
  const [currentUrl, setCurrentUrl] = useState("");
  const [selectedFormatId, setSelectedFormatId] = useState("bestvideo+bestaudio");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const { info, state: infoState, error: infoError, fetchInfo, reset: resetInfo } = useVideoInfo();
  const { downloadState, progress, error: downloadError, startDownload, reset: resetDownload } = useDownload();

  // Track which download type was last triggered (for history entry)
  const lastDownloadType = useRef<"video" | "audio">("video");

  // ── URL Submit ─────────────────────────────────────────────────────────────
  const handleUrlSubmit = useCallback(async (url: string) => {
    setCurrentUrl(url);
    resetDownload();

    // Auto-select best format on new fetch
    setSelectedFormatId("bestvideo+bestaudio");

    await fetchInfo(url);
  }, [fetchInfo, resetDownload]);

  // ── Download Initiate ──────────────────────────────────────────────────────
  const handleDownload = useCallback(async (type: "video" | "audio") => {
    if (!info || !currentUrl) return;
    lastDownloadType.current = type;

    const formatId = type === "audio" ? "bestaudio" : selectedFormatId;

    toast.info(`Starting ${type} download…`, {
      description: info.title,
      duration: 2000,
    });

    await startDownload({
      url: currentUrl,
      format_id: formatId,
      type,
    });
  }, [info, currentUrl, selectedFormatId, startDownload]);

  // ── Handle progress completion – add to history ────────────────────────────
  // We watch downloadState changes to fire history write & toast
  const prevDownloadState = useRef(downloadState);
  if (prevDownloadState.current !== downloadState) {
    prevDownloadState.current = downloadState;

    if (downloadState === "complete" && info && currentUrl) {
      // Build history entry
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: info.title,
        url: currentUrl,
        platform: normalizePlatformName(info.platform),
        type: lastDownloadType.current,
        quality: selectedFormatId,
        timestamp: Date.now(),
        thumbnail: info.thumbnail,
      };
      addHistoryEntry(entry);
      setHistoryRefreshKey((k) => k + 1);

      toast.success("Download complete!", {
        description: info.title,
        duration: 4000,
      });
    }

    if (downloadState === "error" && downloadError) {
      toast.error("Download failed", {
        description: downloadError,
        duration: 5000,
      });
    }
  }

  // ── Re-download from history ───────────────────────────────────────────────
  const handleRedownload = useCallback(async (entry: HistoryEntry) => {
    setCurrentUrl(entry.url);
    resetDownload();
    toast.info("Loading video info…");
    await fetchInfo(entry.url);
  }, [fetchInfo, resetDownload]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetryInfo = useCallback(() => {
    if (currentUrl) fetchInfo(currentUrl);
  }, [currentUrl, fetchInfo]);

  const handleRetryDownload = useCallback(() => {
    resetDownload();
  }, [resetDownload]);

  return (
    <div className="bg-radial-accent" style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(9,9,11,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
              }}
            >
              <Download size={18} color="white" />
            </div>
            <div>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #c4b5fd, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                MediaSave
              </span>
            </div>
          </motion.div>

          {/* Nav links */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: "flex", alignItems: "center", gap: "16px" }}
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source code on GitHub"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#71717a",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#a1a1aa"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#71717a"; }}
            >
              <Github size={17} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </motion.div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "40px 20px 60px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Hero headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          style={{ textAlign: "center", marginBottom: "8px" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#a78bfa",
              marginBottom: "16px",
            }}
          >
            <Sparkles size={12} />
            1000+ supported platforms
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: "12px",
            }}
          >
            Download{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 50%, #6d28d9 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Any Video
            </span>
            {" "}or Audio
          </h1>

          <p style={{ color: "#71717a", fontSize: "16px", lineHeight: 1.6, maxWidth: "480px", margin: "0 auto" }}>
            Paste a link from YouTube, TikTok, Instagram, and 1000+ sites.
            Get MP4 or MP3 in seconds.
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="glass-card"
          style={{ padding: "28px" }}
          layout
        >
          {/* URL Input */}
          <UrlInput
            onSubmit={handleUrlSubmit}
            isLoading={infoState === "loading"}
            disabled={downloadState !== "idle" && downloadState !== "complete" && downloadState !== "error"}
          />

          {/* Video Preview (animates in) */}
          <AnimatePresence mode="wait">
            {(infoState !== "idle") && (
              <motion.div
                key="preview-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: "24px" }}
                layout
              >
                <VideoPreview
                  info={info}
                  state={infoState}
                  error={infoError}
                  url={currentUrl}
                  onRetry={handleRetryInfo}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Format selector + Download buttons (show when video loaded) */}
          <AnimatePresence>
            {info && infoState === "success" && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                style={{
                  marginTop: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
                layout
              >
                <FormatSelector
                  info={info}
                  selectedFormatId={selectedFormatId}
                  onFormatChange={setSelectedFormatId}
                  disabled={downloadState !== "idle"}
                />

                <DownloadButtons
                  info={info}
                  selectedFormatId={selectedFormatId}
                  url={currentUrl}
                  downloadState={downloadState}
                  onDownload={handleDownload}
                />

                {/* Progress bar */}
                <ProgressBar
                  downloadState={downloadState}
                  progress={progress}
                  error={downloadError}
                  onRetry={handleRetryDownload}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Supported platforms pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "8px" }}
        >
          {["YouTube", "TikTok", "Instagram", "Facebook", "Twitter/X", "Vimeo", "+1000 more"].map(
            (name) => (
              <span
                key={name}
                style={{
                  fontSize: "12px",
                  color: "#52525b",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "99px",
                  padding: "4px 12px",
                  fontWeight: 500,
                }}
              >
                {name}
              </span>
            )
          )}
        </motion.div>

        {/* Download History */}
        <DownloadHistory
          onRedownload={handleRedownload}
          refreshKey={historyRefreshKey}
        />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <p style={{ fontSize: "12px", color: "#52525b", lineHeight: 1.6 }}>
            ⚠️ <strong style={{ color: "#71717a" }}>Legal Disclaimer:</strong> MediaSave is intended
            for personal use only. Please respect copyright laws and the terms of service of the
            platforms you download from. Do not use this tool to download copyrighted content
            without permission.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
            {["Privacy Policy", "Terms of Use", "GitHub"].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontSize: "12px", color: "#52525b", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#a1a1aa"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#52525b"; }}
              >
                {link}
              </a>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#3f3f46" }}>
            © {new Date().getFullYear()} MediaSave. Powered by yt-dlp.
          </p>
        </div>
      </footer>
    </div>
  );
}
