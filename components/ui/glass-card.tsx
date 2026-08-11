import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6", className)} {...props}>{children}</div>;
}
