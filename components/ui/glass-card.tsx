import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass luxury-border min-w-0 rounded-[2rem] p-5 md:p-7", className)} {...props}>{children}</div>;
}
