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
        pearl: "#f7f8ff",
        champagne: "#9f6b1f",
        ink: "#172033",
        muted: "#465166",
        cloud: "#edf2ff"
      },
      boxShadow: {
        glass: "0 24px 70px rgba(72, 87, 128, 0.16)",
        glow: "0 16px 60px rgba(216, 170, 91, 0.20)"
      },
      borderRadius: {
        glass: "28px"
      }
    }
  },
  plugins: []
};

export default config;
