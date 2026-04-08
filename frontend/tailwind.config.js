/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system tokens
        background: "#09090b",   // zinc-950
        surface: "#18181b",      // zinc-900
        "surface-2": "#27272a",  // zinc-800
        accent: "#8b5cf6",       // violet-500
        "accent-hover": "#7c3aed",
        "text-primary": "#f4f4f5",   // zinc-100
        "text-secondary": "#a1a1aa", // zinc-400
        "text-muted": "#52525b",     // zinc-600
        "border-default": "rgba(255,255,255,0.08)",
        "border-hover": "rgba(255,255,255,0.15)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        input: "12px",
        badge: "6px",
      },
      backdropBlur: {
        glass: "20px",
      },
      boxShadow: {
        glass: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.4)",
        "glass-hover": "0 0 0 1px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.5)",
        accent: "0 0 0 3px rgba(139,92,246,0.3)",
        "accent-glow": "0 0 20px rgba(139,92,246,0.4)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s infinite",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
