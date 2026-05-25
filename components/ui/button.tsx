import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
  variant?: "primary" | "gold" | "ghost";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({ children, href, className, variant = "primary", type = "button", onClick, disabled = false }: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200/70",
    variant === "primary" && "bg-ink text-white shadow-glass hover:-translate-y-0.5",
    variant === "gold" && "bg-gradient-to-r from-[#ead39a] to-[#d8aa5b] text-ink shadow-glow hover:-translate-y-0.5",
    variant === "ghost" && "bg-white text-ink shadow-sm ring-1 ring-slate-200 hover:bg-cloud",
    disabled && "cursor-not-allowed opacity-60 hover:translate-y-0",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
