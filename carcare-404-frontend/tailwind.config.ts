import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          border: "var(--bg-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          glow: "var(--accent-glow)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        status: {
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
        },
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      boxShadow: {
        focus: "0 0 0 3px var(--accent-glow)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
        bell: {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "30%": { transform: "scale(1.06) rotate(-7deg)" },
          "60%": { transform: "scale(1.06) rotate(7deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 1.4s ease-in-out infinite",
        bell: "bell 400ms ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
