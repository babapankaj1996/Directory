import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "gold" | "ghost" | "outline" | "subtle" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
};

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold tracking-[-0.01em] transition-all duration-200 ease-entrance focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px";

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-[0.8125rem]",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-[0.9375rem]"
};

const variants: Record<ButtonVariant, string> = {
  // Inverted cream: the workhorse. Highest contrast available on a dark ground.
  primary: "bg-ink text-onaccent shadow-sm hover:bg-stone-950 hover:shadow-md",
  // Copper: reserved for the single most important action on a surface.
  gold: "bg-copper-600 text-onaccent shadow-sm hover:bg-copper-700 hover:shadow-glow",
  ghost: "bg-transparent text-ink ring-1 ring-line-strong hover:bg-stone-100 hover:ring-stone-400",
  outline: "bg-transparent text-ink ring-1 ring-line-strong hover:bg-stone-100",
  subtle: "bg-stone-100 text-ink hover:bg-stone-200",
  quiet: "bg-transparent text-ink-soft hover:bg-stone-100 hover:text-ink"
};

export function Button({
  children,
  href,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  disabled = false,
  ...rest
}: ButtonProps) {
  const classes = cn(
    base,
    sizes[size],
    variants[variant],
    disabled && "pointer-events-none cursor-not-allowed opacity-50 shadow-none",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick} aria-disabled={disabled || undefined} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
