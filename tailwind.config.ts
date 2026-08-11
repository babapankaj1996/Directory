import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        pearl: "#f6f8fb",
        champagne: "#d97706",
        ink: "#0b1020",
        muted: "#526074",
        cloud: "#eef6ff",
        aqua: "#06b6d4",
        coral: "#f97316",
        mint: "#10b981",
        berry: "#e11d48"
      },
      boxShadow: {
        glass: "0 24px 70px rgba(15, 23, 42, 0.14)",
        glow: "0 18px 70px rgba(6, 182, 212, 0.24)"
      },
      borderRadius: {
        glass: "28px"
      }
    }
  },
  plugins: []
};

export default config;
