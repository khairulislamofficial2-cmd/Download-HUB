import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // YouTube thumbnails
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      // TikTok / generic CDN thumbnails
      { protocol: "https", hostname: "*.tiktokcdn.com" },
      { protocol: "https", hostname: "p16-sign.tiktokcdn-us.com" },
      // Vimeo thumbnails
      { protocol: "https", hostname: "i.vimeocdn.com" },
      // Instagram / Facebook CDN
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      // Generic fallback
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
