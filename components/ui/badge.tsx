import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "copper" | "jade" | "gold" | "clay" | "moss" | "ink" | "onDark";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-stone-100 text-ink-soft ring-1 ring-line",
  copper: "bg-copper-50 text-copper-700 ring-1 ring-copper-200/70",
  jade: "bg-jade-50 text-jade-700 ring-1 ring-jade-200/70",
  gold: "bg-gold-50 text-gold-800 ring-1 ring-gold-200/70",
  clay: "bg-clay-50 text-clay-700 ring-1 ring-clay-200/70",
  moss: "bg-moss-50 text-moss-700 ring-1 ring-moss-200/70",
  ink: "bg-ink text-white",
  onDark: "bg-white/10 text-white ring-1 ring-white/20 backdrop-blur"
};

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Small uppercase label that sits above a section heading. */
export function Eyebrow({
  children,
  className,
  tone = "copper"
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "copper" | "jade" | "onDark";
}) {
  const color =
    tone === "onDark" ? "text-white/70" : tone === "jade" ? "text-jade-700" : "text-copper-700";
  return (
    <p className={cn("eyebrow", color, className)}>
      <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
      {children}
    </p>
  );
}
