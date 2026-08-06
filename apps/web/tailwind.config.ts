import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Cool slate surfaces — not purple-black
        ink: {
          950: "#0b0d10",
          900: "#12151a",
          800: "#1a1f27",
          700: "#242b35",
          600: "#323a47",
        },
        // Teal brand — deliberate, not indigo/violet
        brand: {
          200: "#a8e6d8",
          300: "#7dd3c0",
          400: "#4fbfa8",
          500: "#2a9d8f",
          600: "#1f7a6f",
          700: "#175e56",
        },
        accent: {
          400: "#e8c47a",
          500: "#d4a84b",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -10px rgba(0,0,0,0.55)",
        panel: "0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px -16px rgba(0,0,0,0.65)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1f7a6f 0%, #2a9d8f 55%, #3dba9c 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "draw-line": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "draw-line": "draw-line 0.8s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
