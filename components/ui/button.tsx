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
    "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-200/70",
    variant === "primary" && "bg-[linear-gradient(135deg,#0b1020,#164e63)] text-white shadow-sm hover:shadow-lg hover:shadow-cyan-950/20",
    variant === "gold" && "bg-[linear-gradient(135deg,#f59e0b,#f97316_55%,#e11d48)] text-white shadow-sm hover:shadow-lg hover:shadow-orange-500/25",
    variant === "ghost" && "bg-white text-ink shadow-sm ring-1 ring-cyan-100 hover:bg-cyan-50/70 hover:text-cyan-800",
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
