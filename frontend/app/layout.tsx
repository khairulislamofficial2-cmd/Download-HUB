import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: "MediaSave – Free Video & Audio Downloader",
  description:
    "Download videos and audio from YouTube, TikTok, Instagram, Facebook, Twitter/X, Vimeo, and 1000+ sites. Free, fast, and easy to use.",
  keywords: ["video downloader", "audio downloader", "youtube downloader", "mp4 download", "mp3 download"],
  authors: [{ name: "MediaSave" }],
  openGraph: {
    title: "MediaSave – Free Video & Audio Downloader",
    description: "Download from YouTube, TikTok, Instagram, and 1000+ sites for free.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        {children}
        {/* Toast notifications – positioned at bottom-right */}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181b",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f4f4f5",
            },
          }}
        />
      </body>
    </html>
  );
}
