"use client";

/**
 * URL Input Component
 * - Large h-14 input with Link icon prefix + clipboard paste button
 * - Debounced platform detection on input change (400ms)
 * - Animated glow on focus via Framer Motion
 * - Inline validation with red border + error message
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, ClipboardPaste, Search, X } from "lucide-react";
import { PlatformBadge } from "./platform-badge";
import { detectPlatform, isValidUrl } from "@/lib/platforms";
import type { PlatformInfo } from "@/types";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function UrlInput({ onSubmit, isLoading = false, disabled = false }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced platform detection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!url.trim()) {
      setPlatform(null);
      setValidationError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const detected = detectPlatform(url);
      setPlatform(detected);

      if (url.length > 5 && !isValidUrl(url)) {
        setValidationError("Please enter a valid URL");
      } else {
        setValidationError(null);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        inputRef.current?.focus();
      }
    } catch {
      // Clipboard not available (user denied or browser restriction)
      inputRef.current?.focus();
    }
  }, []);

  // Clear input
  const handleClear = useCallback(() => {
    setUrl("");
    setPlatform(null);
    setValidationError(null);
    inputRef.current?.focus();
  }, []);

  // Form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();

      if (!trimmed) {
        setValidationError("Please enter a URL");
        return;
      }

      if (!isValidUrl(trimmed)) {
        setValidationError("Please enter a valid URL (e.g. https://youtube.com/watch?v=...)");
        return;
      }

      setValidationError(null);
      onSubmit(trimmed);
    },
    [url, onSubmit]
  );

  const hasError = !!validationError;
  const borderColor = hasError
    ? "rgba(239,68,68,0.6)"
    : isFocused
    ? "rgba(139,92,246,0.6)"
    : "rgba(255,255,255,0.08)";

  const glowShadow = isFocused && !hasError
    ? "0 0 0 3px rgba(139,92,246,0.2), 0 0 24px rgba(139,92,246,0.15)"
    : hasError
    ? "0 0 0 3px rgba(239,68,68,0.15)"
    : "none";

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} role="search">
        <motion.div
          animate={{
            boxShadow: glowShadow,
            borderColor,
          }}
          transition={{ duration: 0.2 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${borderColor}`,
            borderRadius: "12px",
            padding: "0 16px",
            height: "56px",
          }}
        >
          {/* Link prefix icon */}
          <Link
            size={18}
            color={isFocused ? "#8b5cf6" : "#52525b"}
            style={{ flexShrink: 0, transition: "color 0.2s" }}
            aria-hidden="true"
          />

          {/* URL Input */}
          <input
            ref={inputRef}
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Paste a YouTube, TikTok, Instagram, or any video URL…"
            aria-label="Video URL"
            aria-describedby={hasError ? "url-error" : undefined}
            aria-invalid={hasError}
            disabled={disabled || isLoading}
            autoComplete="url"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f4f4f5",
              fontSize: "15px",
              fontFamily: "inherit",
              minWidth: 0,
            }}
          />

          {/* Platform badge (animated) */}
          <AnimatePresence>
            {platform && url && (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                style={{ flexShrink: 0 }}
              >
                <PlatformBadge platform={platform} size="sm" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear button */}
          <AnimatePresence>
            {url && (
              <motion.button
                key="clear"
                type="button"
                onClick={handleClear}
                aria-label="Clear URL"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                style={{
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: "6px",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#a1a1aa",
                  transition: "color 0.15s",
                }}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Paste button */}
          <button
            type="button"
            onClick={handlePaste}
            aria-label="Paste URL from clipboard"
            title="Paste from clipboard"
            disabled={disabled || isLoading}
            style={{
              flexShrink: 0,
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "8px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              color: "#a78bfa",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.1)";
            }}
          >
            <ClipboardPaste size={14} />
            <span className="hidden sm:inline">Paste</span>
          </button>
        </motion.div>

        {/* Validation error */}
        <AnimatePresence>
          {validationError && (
            <motion.p
              id="url-error"
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{
                color: "#f87171",
                fontSize: "13px",
                marginTop: "6px",
                marginLeft: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {validationError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={disabled || isLoading || !url.trim()}
          aria-label="Analyze video URL"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          style={{
            width: "100%",
            marginTop: "12px",
            height: "48px",
            borderRadius: "12px",
            border: "none",
            cursor: disabled || isLoading || !url.trim() ? "not-allowed" : "pointer",
            opacity: disabled || isLoading || !url.trim() ? 0.5 : 1,
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            color: "white",
            fontWeight: 600,
            fontSize: "15px",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: !disabled && !isLoading && url.trim()
              ? "0 4px 16px rgba(139,92,246,0.3)"
              : "none",
            transition: "box-shadow 0.2s",
          }}
        >
          {isLoading ? (
            <>
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Analyzing…
            </>
          ) : (
            <>
              <Search size={18} />
              Analyze URL
            </>
          )}
        </motion.button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
