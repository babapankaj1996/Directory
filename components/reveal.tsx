"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Reveals its children as they scroll into view.
 *
 * Uses IntersectionObserver rather than a scroll listener so the work happens
 * off the main thread, and animates only transform and opacity so each reveal
 * stays on the compositor. Elements start visible and are hidden by an effect,
 * which means anyone without JavaScript — and any crawler — sees the content
 * normally rather than a blank page.
 *
 * Honours prefers-reduced-motion by skipping the animation entirely.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  variant = "rise",
  className = ""
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  variant?: "rise" | "tilt" | "scale";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    // Hide only once we know we can animate it back in.
    setShown(false);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setShown(true);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      data-shown={shown ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
