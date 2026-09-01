import type { Config } from "tailwindcss";

// RelayOS design tokens — an "operations console" palette: cool ink neutrals,
// warm paper surfaces, and three semantic accents (signal amber = attention,
// relay green = healthy/live, alert red = escalation/error).
//
// Neutral ink steps are used for text hierarchy on light surfaces:
//   900  primary text        700  secondary text
//   500  muted text          400  faint metadata
//   300  placeholder / borders at low opacity
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
          950: "#11141B",
          900: "#171B23",
          800: "#22262F",
          700: "#3A4150",
          600: "#4E5765",
          500: "#6A7280",
          400: "#8A92A0",
          300: "#A9AFB9",
        },
        paper: {
          50: "#F7F8FA",
          100: "#EEF1F4",
          200: "#E3E6EB",
          300: "#D3D7DE",
        },
        signal: {
          // Primary accent — "instant response" amber
          // - 400/500 sit on dark (ink-950) surfaces for buttons/badges
          // - 600 (and 700) are dark enough for text on white/paper (WCAG AA)
          300: "#F9CE88",
          400: "#F5BE6B",
          500: "#F2A93B",
          600: "#A05A00",
          700: "#7A4400",
        },
        relay: {
          // Secondary accent — live / booked / success
          400: "#57D690",
          500: "#2FBF71",
          600: "#22A25E",
          700: "#1B7D48",
        },
        alert: {
          // Escalation / urgent / destructive
          400: "#F17E7E",
          500: "#EF5B5B",
          600: "#D93F3F",
          700: "#B02E2E",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(17,20,27,0.05), 0 8px 24px -12px rgba(17,20,27,0.12)",
        "panel-hover": "0 1px 2px rgba(17,20,27,0.06), 0 12px 32px -12px rgba(17,20,27,0.18)",
        pop: "0 2px 4px rgba(17,20,27,0.06), 0 12px 28px -8px rgba(17,20,27,0.18)",
        float: "0 4px 12px rgba(17,20,27,0.08), 0 24px 64px -16px rgba(17,20,27,0.28)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
