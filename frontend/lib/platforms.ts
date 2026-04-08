/**
 * Platform detection logic.
 * Maps URL hostnames to platform metadata.
 */

import type { Platform, PlatformInfo } from "@/types";

const PLATFORM_MAP: Array<{
  patterns: string[];
  info: PlatformInfo;
}> = [
  {
    patterns: ["youtube.com", "youtu.be", "www.youtube.com", "m.youtube.com"],
    info: {
      name: "YouTube",
      color: "#ff0000",
      bgColor: "rgba(255,0,0,0.12)",
      label: "YouTube",
    },
  },
  {
    patterns: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
    info: {
      name: "TikTok",
      color: "#ffffff",
      bgColor: "rgba(0,0,0,0.6)",
      label: "TikTok",
    },
  },
  {
    patterns: ["instagram.com", "www.instagram.com"],
    info: {
      name: "Instagram",
      color: "#e1306c",
      bgColor: "rgba(225,48,108,0.12)",
      label: "Instagram",
    },
  },
  {
    patterns: [
      "facebook.com",
      "www.facebook.com",
      "fb.com",
      "m.facebook.com",
      "web.facebook.com",
    ],
    info: {
      name: "Facebook",
      color: "#1877f2",
      bgColor: "rgba(24,119,242,0.12)",
      label: "Facebook",
    },
  },
  {
    patterns: ["x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
    info: {
      name: "Twitter",
      color: "#000000",
      bgColor: "rgba(255,255,255,0.08)",
      label: "X (Twitter)",
    },
  },
  {
    patterns: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
    info: {
      name: "Vimeo",
      color: "#1ab7ea",
      bgColor: "rgba(26,183,234,0.12)",
      label: "Vimeo",
    },
  },
];

const GENERIC_PLATFORM: PlatformInfo = {
  name: "Generic",
  color: "#a1a1aa",
  bgColor: "rgba(161,161,170,0.1)",
  label: "1000+ sites supported",
};

/**
 * Detect platform from a URL string.
 * Returns null if the URL is invalid.
 */
export function detectPlatform(url: string): PlatformInfo | null {
  let parsed: URL;
  try {
    // Add protocol if missing
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

  for (const entry of PLATFORM_MAP) {
    for (const pattern of entry.patterns) {
      const normalizedPattern = pattern.replace(/^www\./, "");
      if (hostname === normalizedPattern || hostname.endsWith(`.${normalizedPattern}`)) {
        return entry.info;
      }
    }
  }

  return GENERIC_PLATFORM;
}

/**
 * Returns true if the URL looks like a valid http/https URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get the display name for a platform returned by the API (yt-dlp extractor key).
 */
export function normalizePlatformName(apiPlatform: string): Platform {
  const lower = apiPlatform.toLowerCase();
  if (lower.includes("youtube")) return "YouTube";
  if (lower.includes("tiktok")) return "TikTok";
  if (lower.includes("instagram")) return "Instagram";
  if (lower.includes("facebook") || lower === "fb") return "Facebook";
  if (lower.includes("twitter") || lower === "x") return "Twitter";
  if (lower.includes("vimeo")) return "Vimeo";
  return "Generic";
}
