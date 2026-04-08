"use client";

/**
 * FormatSelector – Dropdown to choose download format/quality
 * Groups options into "Video + Audio" and "Audio Only" sections.
 * Shows file size estimate and codec badge per option.
 */

import type { FormatItem, VideoInfo } from "@/types";

interface FormatSelectorProps {
  info: VideoInfo | null;
  selectedFormatId: string;
  onFormatChange: (formatId: string) => void;
  disabled?: boolean;
}

// Fallback static formats when no video info is available
const STATIC_FORMATS: FormatItem[] = [
  { format_id: "bestvideo+bestaudio", label: "Best Quality (auto)", ext: "mp4", filesize_approx: null, vcodec: "auto", acodec: "auto", height: null, type: "video" },
  { format_id: "137+140", label: "1080p MP4", ext: "mp4", filesize_approx: null, vcodec: "avc1", acodec: "mp4a", height: 1080, type: "video" },
  { format_id: "136+140", label: "720p MP4", ext: "mp4", filesize_approx: null, vcodec: "avc1", acodec: "mp4a", height: 720, type: "video" },
  { format_id: "135+140", label: "480p MP4", ext: "mp4", filesize_approx: null, vcodec: "avc1", acodec: "mp4a", height: 480, type: "video" },
  { format_id: "134+140", label: "360p MP4", ext: "mp4", filesize_approx: null, vcodec: "avc1", acodec: "mp4a", height: 360, type: "video" },
  { format_id: "bestaudio/mp3-320", label: "Audio MP3 (320kbps)", ext: "mp3", filesize_approx: null, vcodec: "none", acodec: "mp3", height: null, type: "audio" },
  { format_id: "bestaudio/mp3-128", label: "Audio MP3 (128kbps)", ext: "mp3", filesize_approx: null, vcodec: "none", acodec: "mp3", height: null, type: "audio" },
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_000_000_000) return ` · ~${(bytes / 1_000_000_000).toFixed(1)}GB`;
  if (bytes >= 1_000_000) return ` · ~${(bytes / 1_000_000).toFixed(0)}MB`;
  if (bytes >= 1_000) return ` · ~${(bytes / 1_000).toFixed(0)}KB`;
  return "";
}

function CodecBadge({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: "10px",
        padding: "2px 6px",
        borderRadius: "4px",
        background: "rgba(139,92,246,0.12)",
        border: "1px solid rgba(139,92,246,0.2)",
        color: "#a78bfa",
        fontWeight: 500,
        marginLeft: "6px",
      }}
    >
      {text.toUpperCase()}
    </span>
  );
}

export function FormatSelector({
  info,
  selectedFormatId,
  onFormatChange,
  disabled = false,
}: FormatSelectorProps) {
  const formats = info?.formats ?? STATIC_FORMATS;
  const videoFormats = formats.filter((f) => f.type === "video");
  const audioFormats = formats.filter((f) => f.type === "audio");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        htmlFor="format-select"
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#a1a1aa",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Quality & Format
      </label>

      <select
        id="format-select"
        className="custom-select"
        value={selectedFormatId}
        onChange={(e) => onFormatChange(e.target.value)}
        disabled={disabled}
        aria-label="Select download quality and format"
      >
        {videoFormats.length > 0 && (
          <optgroup label="📹 Video + Audio">
            {videoFormats.map((fmt) => (
              <option key={fmt.format_id} value={fmt.format_id}>
                {fmt.label}{formatFileSize(fmt.filesize_approx)}
                {fmt.vcodec !== "none" && fmt.vcodec !== "auto"
                  ? ` [${fmt.ext.toUpperCase()}]`
                  : ""}
              </option>
            ))}
          </optgroup>
        )}

        {audioFormats.length > 0 && (
          <optgroup label="🎵 Audio Only">
            {audioFormats.map((fmt) => (
              <option key={fmt.format_id} value={fmt.format_id}>
                {fmt.label}{formatFileSize(fmt.filesize_approx)}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Selected format info bar */}
      {(() => {
        const selected = formats.find((f) => f.format_id === selectedFormatId);
        if (!selected) return null;
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "2px",
              fontSize: "12px",
              color: "#71717a",
            }}
          >
            <span>
              {selected.type === "video" ? "Video + Audio" : "Audio Only"}
            </span>

            {selected.ext && selected.ext !== "none" && (
              <CodecBadge text={selected.ext} />
            )}

            {selected.vcodec && selected.vcodec !== "none" && selected.vcodec !== "auto" && (
              <CodecBadge text={selected.vcodec.split(".")[0]} />
            )}

            {selected.height && (
              <span style={{ color: "#52525b" }}>· {selected.height}p</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
