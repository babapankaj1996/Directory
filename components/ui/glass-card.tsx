import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-line bg-surface p-5 shadow-xs transition-shadow duration-200 md:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
