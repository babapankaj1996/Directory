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
  50: "var(--stone-50)",
  100: "var(--stone-100)",
  200: "var(--stone-200)",
  300: "var(--stone-300)",
  400: "var(--stone-400)",
  500: "var(--stone-500)",
  600: "var(--stone-600)",
  700: "var(--stone-700)",
  800: "var(--stone-800)",
  900: "var(--stone-900)",
  950: "var(--stone-950)"
};

const copper = {
  50: "var(--copper-50)",
  100: "var(--copper-100)",
  200: "var(--copper-200)",
  300: "var(--copper-300)",
  400: "var(--copper-400)",
  500: "var(--copper-500)",
  600: "var(--copper-600)",
  700: "var(--copper-700)",
  800: "var(--copper-800)",
  900: "var(--copper-900)",
  950: "var(--copper-950)"
};

const jade = {
  50: "var(--jade-50)",
  100: "var(--jade-100)",
  200: "var(--jade-200)",
  300: "var(--jade-300)",
  400: "var(--jade-400)",
  500: "var(--jade-500)",
  600: "var(--jade-600)",
  700: "var(--jade-700)",
  800: "var(--jade-800)",
  900: "var(--jade-900)",
  950: "var(--jade-950)"
};

const gold = {
  50: "var(--gold-50)",
  100: "var(--gold-100)",
  200: "var(--gold-200)",
  300: "var(--gold-300)",
  400: "var(--gold-400)",
  500: "var(--gold-500)",
  600: "var(--gold-600)",
  700: "var(--gold-700)",
  800: "var(--gold-800)",
  900: "var(--gold-900)",
  950: "var(--gold-950)"
};

const clay = {
  50: "var(--clay-50)",
  100: "var(--clay-100)",
  200: "var(--clay-200)",
  300: "var(--clay-300)",
  400: "var(--clay-400)",
  500: "var(--clay-500)",
  600: "var(--clay-600)",
  700: "var(--clay-700)",
  800: "var(--clay-800)",
  900: "var(--clay-900)",
  950: "var(--clay-950)"
};

const moss = {
  50: "var(--moss-50)",
  100: "var(--moss-100)",
  200: "var(--moss-200)",
  300: "var(--moss-300)",
  400: "var(--moss-400)",
  500: "var(--moss-500)",
  600: "var(--moss-600)",
  700: "var(--moss-700)",
  800: "var(--moss-800)",
  900: "var(--moss-900)",
  950: "var(--moss-950)"
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

        // Legacy aliases kept so existing markup inherits the new palette.
        // These were frozen at the dark palette's hex, so any surface using them
        // stayed dark in the light theme and put dark text on a dark ground.
        pearl: "rgb(var(--paper-rgb) / <alpha-value>)",
        cloud: "var(--sunken)",
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
