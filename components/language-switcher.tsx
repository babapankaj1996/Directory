"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

/**
 * Language picker.
 *
 * The choice is written to a cookie and the page re-rendered on the server, so
 * translated copy arrives as real HTML rather than being swapped in on the
 * client. The URL never changes — every page keeps one canonical address.
 */
export function LanguageSwitcher({ current, compact = false }: { current: Locale; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Locale | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(code: Locale) {
    setPending(code);
    // One year, site-wide, readable by the server on the next render.
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setOpen(false);
    router.refresh();
    // The refresh is asynchronous; clear the pending mark once it lands.
    setTimeout(() => setPending(null), 1200);
  }

  const active = LOCALES.find((locale) => locale.code === current) || LOCALES[0];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${active.label}`}
        className={`flex min-h-[40px] items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-sunken hover:text-ink ${compact ? "w-full justify-between" : ""}`}
      >
        <span className="flex items-center gap-2">
          <Globe className="h-[18px] w-[18px]" />
          <span className={compact ? "" : "hidden xl:inline"}>{active.label}</span>
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Choose a language"
          className={`absolute z-50 mt-2 max-h-[60vh] w-52 overflow-auto rounded-xl border border-line bg-surface p-1.5 shadow-lift ${compact ? "left-0" : "right-0"}`}
        >
          {LOCALES.map((locale) => {
            const selected = locale.code === current;
            return (
              <button
                key={locale.code}
                type="button"
                role="option"
                aria-selected={selected}
                lang={locale.tag}
                onClick={() => choose(locale.code)}
                className={`flex min-h-[40px] w-full items-center justify-between gap-3 rounded-lg px-3 text-sm transition-colors ${
                  selected ? "bg-sunken font-semibold text-ink" : "text-ink-muted hover:bg-sunken hover:text-ink"
                }`}
              >
                <span>{locale.label}</span>
                {selected ? <Check className="h-4 w-4 text-copper-600" /> : null}
                {pending === locale.code && !selected ? <span className="text-xs text-ink-muted">…</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
