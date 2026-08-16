import type { Config } from "tailwindcss";

// RelayOS design tokens — an "operations console" palette, not the
// generic cream+terracotta / near-black+neon defaults. See docs/DESIGN.md.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#12151C",
          900: "#181C25",
          800: "#232834",
          700: "#3A4150",
        },
        paper: {
          50: "#F6F7F9",
          100: "#EEF0F3",
          200: "#DEE2E8",
        },
        signal: {
          // Primary accent — "instant response" amber
          // - 400/500 are designed to sit on dark (ink-950) surfaces for buttons/badges
          // - 600 (and any future 700+) are dark enough for use as *text* on white/paper backgrounds
          //   (passes WCAG AA: 5.31:1 on #FFFFFF)
          400: "#F5BE6B",
          500: "#F2A93B",
          600: "#A05A00",
        },
        relay: {
          // Secondary accent — live / booked / success
          400: "#57D690",
          500: "#2FBF71",
          600: "#22A25E",
        },
        alert: {
          // Escalation / urgent
          400: "#F17E7E",
          500: "#EF5B5B",
          600: "#D93F3F",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(18,21,28,0.06), 0 8px 24px -12px rgba(18,21,28,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
