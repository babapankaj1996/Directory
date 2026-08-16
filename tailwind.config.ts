import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

/**
 * Design system: "warm editorial premium", dark.
 *
 * Two accents (copper for action, jade for trust) on a warm near-black ground.
 *
 * IMPORTANT: every ramp below is *inverted* relative to a normal Tailwind
 * palette — index 50 is the darkest, 900 the lightest. That is deliberate. The
 * app has ~15k lines of markup written for a light theme (`bg-slate-50`,
 * `bg-amber-100 text-amber-800`, `text-slate-900` …); inverting the ramps in
 * one place flips all of it to a coherent dark theme without touching the
 * markup. When writing new code, keep the same convention: low index = surface,
 * high index = text.
 */

const stone = {
  50: "#1b1815",
  100: "#211d1a",
  200: "#2b2723",
  300: "#3a352f",
  400: "#6d655c",
  500: "#8b8277",
  600: "#9c938a",
  700: "#c3baae",
  800: "#ded5ca",
  900: "#f0ebe4",
  950: "#faf7f3"
};

const copper = {
  50: "#2a1a10",
  100: "#38220f",
  200: "#4b2d15",
  300: "#633c1c",
  400: "#8a5b2d",
  500: "#b8763c",
  600: "#d68f52",
  700: "#e8ad78",
  800: "#f2cba4",
  900: "#f9e5d0",
  950: "#fdf6ee"
};

const jade = {
  50: "#0f2320",
  100: "#133029",
  200: "#1a4239",
  300: "#23594e",
  400: "#35796c",
  500: "#499b8c",
  600: "#6cb8a9",
  700: "#90d0c1",
  800: "#b9e3d9",
  900: "#dcf1ec",
  950: "#f0faf7"
};

const gold = {
  50: "#2a2010",
  100: "#382a11",
  200: "#4b3916",
  300: "#644c1c",
  400: "#8d6c26",
  500: "#b78c30",
  600: "#d6ab4a",
  700: "#e8c877",
  800: "#f2dfa8",
  900: "#f9eed2",
  950: "#fdf9ef"
};

const clay = {
  50: "#2c1512",
  100: "#3a1b16",
  200: "#4e241d",
  300: "#683027",
  400: "#8f473a",
  500: "#b85f4c",
  600: "#d47f6b",
  700: "#e8a493",
  800: "#f2c8bd",
  900: "#f9e3dc",
  950: "#fdf4f1"
};

const moss = {
  50: "#12261a",
  100: "#163220",
  200: "#1d452c",
  300: "#275c3a",
  400: "#3a7d53",
  500: "#4f9f6d",
  600: "#6fbb89",
  700: "#96d2a9",
  800: "#bfe4cb",
  900: "#e0f2e6",
  950: "#f2faf4"
};

const denim = {
  50: "#12202b",
  100: "#162b3a",
  200: "#1d3a4e",
  300: "#274f68",
  400: "#3a6d8f",
  500: "#4f8cb5",
  600: "#6fa8cd",
  700: "#96c4de",
  800: "#bfdaeb",
  900: "#e0eef6",
  950: "#f2f8fc"
};

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (preferred for new work).
        // These resolve through CSS variables so the light/dark themes in
        // globals.css can swap them; the -rgb pairs exist so Tailwind's opacity
        // modifiers (bg-paper/80) still work.
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        sunken: "var(--sunken)",
        // Always dark, whatever the theme: scrims, modal backdrops, media wells.
        shade: "#0a0806",
        // Deepest section ground (hero, footer, feature panels). Stays dark in
        // both themes — a dark hero band and footer against a light page is the
        // intended look, and the white text inside them stays correct.
        deep: "#0a0907",
        // Text colour that sits on a light/accent fill.
        onaccent: "var(--onaccent)",
        line: {
          DEFAULT: "rgb(var(--line-rgb) / <alpha-value>)",
          strong: "var(--line-strong)"
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          muted: "var(--ink-muted)"
        },
        muted: "rgb(var(--ink-muted-rgb) / <alpha-value>)",

        // Named accents
        copper,
        jade,
        gold,
        clay,
        moss,

        // Legacy aliases kept so existing markup inherits the new palette
        pearl: "#0f0d0b",
        cloud: "#211d1a",
        aqua: jade[600],
        coral: copper[600],
        champagne: copper[700],
        mint: moss[600],
        berry: clay[600],

        // Re-tuned stock ramps
        slate: stone,
        gray: stone,
        zinc: stone,
        neutral: stone,
        stone,
        cyan: jade,
        teal: jade,
        sky: jade,
        emerald: moss,
        green: moss,
        amber: gold,
        yellow: gold,
        orange: copper,
        rose: clay,
        red: clay,
        pink: clay,
        blue: denim,
        indigo: denim,
        violet: denim,
        purple: denim
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-display)", "Georgia", ...defaultTheme.fontFamily.serif]
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }]
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        glass: "1.75rem"
      },
      // On a dark ground a drop shadow reads as nothing; depth comes from a
      // 1px top highlight plus a deep, wide black shadow.
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.4)",
        sm: "inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 3px rgba(0, 0, 0, 0.45)",
        DEFAULT: "inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 2px 8px rgba(0, 0, 0, 0.5)",
        md: "inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 6px 18px rgba(0, 0, 0, 0.5)",
        lg: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.55)",
        xl: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 28px 60px rgba(0, 0, 0, 0.6)",
        "2xl": "inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 44px 90px rgba(0, 0, 0, 0.65)",
        glass: "inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 16px 44px rgba(0, 0, 0, 0.5)",
        glow: "0 12px 34px rgba(214, 143, 82, 0.28)",
        lift: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 14px 32px rgba(0, 0, 0, 0.6)"
      },
      transitionTimingFunction: {
        entrance: "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translate3d(0, -8px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        "sheet-in": "sheet-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both"
      }
    }
  },
  plugins: []
};

export default config;
