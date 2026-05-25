import Link from "next/link";
import { Compass } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-20">
      <GlassCard className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/80 text-champagne shadow-glow">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Page not found</h1>
        <p className="mt-3 text-muted">This city, category, or profile is not available in the demo data.</p>
        <Link href="/" className="mt-8 inline-flex rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white shadow-glass">
          Go to homepage
        </Link>
      </GlassCard>
    </main>
  );
}
