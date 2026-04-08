"use client";

/**
 * Progress Bar component
 * Shows animated download/conversion progress with speed, ETA, and stage label.
 * Flashes green on completion, red on error.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, RotateCcw, Zap, Clock } from "lucide-react";
import type { DownloadState, ProgressEvent } from "@/types";

interface ProgressBarProps {
  downloadState: DownloadState;
  progress: ProgressEvent | null;
  error: string | null;
  onRetry: () => void;
}

function getStageLabel(state: DownloadState): string {
  switch (state) {
    case "starting": return "Initializing…";
    case "downloading": return "Downloading…";
    case "converting": return "Converting…";
    case "complete": return "Download complete!";
    case "error": return "Download failed";
    default: return "";
  }
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `~${h}h ${m}m remaining`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `~${m}m ${s}s remaining`;
  }
  return `~${seconds}s remaining`;
}

export function ProgressBar({ downloadState, progress, error, onRetry }: ProgressBarProps) {
  const [showComplete, setShowComplete] = useState(false);

  // Show "complete" for 3 seconds then fade out
  useEffect(() => {
    if (downloadState === "complete") {
      setShowComplete(true);
      const t = setTimeout(() => setShowComplete(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShowComplete(false);
    }
  }, [downloadState]);

  const isVisible =
    downloadState !== "idle" &&
    (downloadState !== "complete" || showComplete);

  if (!isVisible) return null;

  const percent = progress?.percent ?? 0;
  const isComplete = downloadState === "complete";
  const isError = downloadState === "error";
  const isConverting = downloadState === "converting";

  const barColor = isComplete
    ? "#22c55e"
    : isError
    ? "#ef4444"
    : isConverting
    ? "#f59e0b"
    : "#8b5cf6";

  return (
    <AnimatePresence>
      <motion.div
        key="progress-bar"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        style={{ overflow: "hidden" }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${isComplete ? "rgba(34,197,94,0.2)" : isError ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "12px",
            padding: "16px",
          }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            {/* Stage with icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isComplete && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <CheckCircle2 size={18} color="#22c55e" />
                </motion.div>
              )}
              {isError && <AlertCircle size={18} color="#ef4444" />}
              {!isComplete && !isError && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <Zap size={16} color={barColor} />
                </motion.div>
              )}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: isComplete ? "#22c55e" : isError ? "#ef4444" : "#f4f4f5",
                }}
              >
                {getStageLabel(downloadState)}
              </span>
            </div>

            {/* Percentage */}
            {!isError && (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: barColor,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {isComplete ? "100%" : `${Math.round(percent)}%`}
              </span>
            )}
          </div>

          {/* Progress track */}
          {!isError && (
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "99px",
                overflow: "hidden",
                marginBottom: "10px",
              }}
              role="progressbar"
              aria-valuenow={isComplete ? 100 : Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                animate={{ width: `${isComplete ? 100 : isConverting ? 98 : percent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  height: "100%",
                  borderRadius: "99px",
                  background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                  boxShadow: `0 0 8px ${barColor}60`,
                }}
              />
            </div>
          )}

          {/* Meta row: speed + ETA */}
          {!isError && !isComplete && progress && (
            <div
              style={{
                display: "flex",
                gap: "16px",
                fontSize: "12px",
                color: "#71717a",
              }}
            >
              {progress.speed && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Zap size={11} />
                  {progress.speed}
                </span>
              )}
              {progress.eta > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={11} />
                  {formatEta(progress.eta)}
                </span>
              )}
            </div>
          )}

          {/* Error message + retry */}
          {isError && error && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "13px", color: "#f87171", flex: 1 }}>{error}</p>
              <button
                onClick={onRetry}
                aria-label="Retry download"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "8px",
                  color: "#f87171",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginLeft: "12px",
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={13} />
                Retry
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
