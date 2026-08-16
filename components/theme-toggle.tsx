"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

/**
 * Theme control with three states: follow the system, force light, force dark.
 *
 * "System" is the default and is represented by the absence of data-theme on
 * <html>, so CSS prefers-color-scheme does the work with no JavaScript involved
 * on first paint. Choosing light or dark stamps the attribute and stores the
 * choice; the inline script in the layout replays it before the page renders so
 * there is no flash of the wrong palette.
 *
 * Two presentations: a single cycling button for the header, where a segmented
 * control competed with the primary action, and the full segmented control for
 * the mobile menu where there is room to show all three.
 */
export const THEME_STORAGE_KEY = "profinr-theme";

type ThemeChoice = "system" | "light" | "dark";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const META: Record<ThemeChoice, { label: string; icon: typeof Sun }> = {
  system: { label: "System", icon: Monitor },
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon }
};

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

function useThemeChoice() {
  // Start as "system" on server and first client render so the markup matches;
  // the stored choice is read in an effect.
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Blocked storage — follow the system.
    }
    if (stored === "light" || stored === "dark") setChoice(stored);
    setReady(true);
  }, []);

  const select = useCallback((next: ThemeChoice) => {
    setChoice(next);
    applyTheme(next);
    try {
      if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Preference will not persist; this page still respects it.
    }
  }, []);

  return { choice, ready, select };
}

/** Single button that cycles system → light → dark. Used in the header. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { choice, ready, select } = useThemeChoice();
  const { label, icon: Icon } = META[choice];
  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => select(next)}
      aria-label={`Theme: ${label}. Switch to ${META[next].label.toLowerCase()}.`}
      title={`Theme: ${label}`}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-sunken hover:text-ink ${className}`}
    >
      {ready ? <Icon className="h-[18px] w-[18px]" /> : <span className="h-[18px] w-[18px]" />}
    </button>
  );
}

/** Segmented control showing all three states. Used in the mobile menu. */
export function ThemeSegmented({ className = "" }: { className?: string }) {
  const { choice, ready, select } = useThemeChoice();

  return (
    <div role="radiogroup" aria-label="Colour theme" className={`inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 ${className}`}>
      {ORDER.map((value) => {
        const { label, icon: Icon } = META[value];
        const active = ready && choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            onClick={() => select(value)}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${
              active ? "bg-ink text-onaccent" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
