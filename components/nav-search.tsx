"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Search in the header.
 *
 * A directory's primary action is finding someone, so it belongs in the bar
 * rather than only on the homepage hero. On desktop it is an always-visible
 * field; on small screens it collapses to an icon that expands over the bar, so
 * it stays reachable without opening the menu.
 */
export function NavSearch({ className = "", mode = "inline" }: { className?: string; mode?: "inline" | "compact" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (expanded) mobileInputRef.current?.focus();
  }, [expanded]);

  // Cmd/Ctrl-K focuses search, the convention people already expect.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(min-width: 1024px)").matches) inputRef.current?.focus();
        else setExpanded(true);
      }
      if (event.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    // The listings page reads `search`; `q` would be silently ignored.
    router.push(term ? `/listings?search=${encodeURIComponent(term)}` : "/listings");
    setExpanded(false);
  }

  // The always-visible field for wide layouts.
  if (mode === "inline") {
    return (
      <form onSubmit={submit} role="search" className={`hidden lg:flex ${className}`}>
        <label htmlFor="nav-search" className="sr-only">
          Search providers
        </label>
        <div className="group relative flex w-full items-center">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-muted transition-colors group-focus-within:text-copper-600" />
          <input
            id="nav-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search providers, services, cities…"
            className="h-10 w-full rounded-full border border-line bg-sunken pl-10 pr-14 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-copper-600 focus:bg-surface"
          />
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-3 hidden rounded border border-line px-1.5 py-0.5 font-sans text-[0.625rem] font-bold text-ink-muted xl:block"
          >
            ⌘K
          </kbd>
        </div>
      </form>
    );
  }

  // Compact: an icon that expands over the bar, for narrow layouts.
  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Search providers"
        aria-expanded={expanded}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-sunken lg:hidden"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      {expanded ? (
        <div className="absolute inset-x-0 top-0 z-20 flex h-[4.25rem] items-center gap-2 bg-paper px-4 lg:hidden">
          <form onSubmit={submit} role="search" className="flex flex-1 items-center">
            <label htmlFor="nav-search-mobile" className="sr-only">
              Search providers
            </label>
            <div className="relative flex w-full items-center">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-muted" />
              <input
                id="nav-search-mobile"
                ref={mobileInputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search providers, services, cities…"
                className="h-11 w-full rounded-full border border-line bg-sunken pl-10 pr-4 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-copper-600 focus:bg-surface"
              />
            </div>
          </form>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Close search"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-sunken"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      ) : null}
    </>
  );
}
