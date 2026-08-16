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
 */
export const THEME_STORAGE_KEY = "profinr-theme";

type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon }
];

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Start as "system" on both server and client so the first client render
  // matches the server markup; the stored choice is read in an effect.
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Private mode or blocked storage — fall back to following the system.
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
      // Preference simply will not persist; the current page still respects it.
    }
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = ready && choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
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
