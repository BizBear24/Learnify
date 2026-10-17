import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lime: "#C6FF00",
        cyan: "#00E5FF",
        ink: "#0A0A0A",
        paper: "#F4F4EE",
        wrong: "#FF3B30",
      },
      fontFamily: {
        head: ["var(--font-head)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        hard: "6px 6px 0 #000",
        hardsm: "3px 3px 0 #000",
      },
      borderRadius: { DEFAULT: "0", none: "0" },
    },
  },
  plugins: [],
};
export default config;
