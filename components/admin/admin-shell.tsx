import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { adminNav } from "@/components/admin/admin-nav";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-[1500px] px-3 py-6 md:px-4 md:py-10">
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-[1.7rem] bg-white/45 p-4 md:mb-8 md:flex-row md:items-end md:bg-transparent md:p-0">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne shadow-sm md:tracking-[0.25em]">
            <ShieldCheck className="h-4 w-4" /> Admin Control Panel
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink md:text-5xl">Directory administration</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
            Listings, locations, categories, enquiries and site settings.
          </p>
        </div>
        <Link href="/" className="inline-flex w-fit items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass transition hover:-translate-y-0.5">
          View Website
        </Link>
      </div>

      <AdminMobileNav />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass luxury-border sticky top-24 hidden h-fit rounded-[2rem] p-4 lg:block">
          <div className="mb-4 rounded-[1.5rem] bg-white/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Admin role</p>
            <p className="mt-1 font-semibold text-ink">Super Admin</p>
            <p className="mt-1 text-xs text-muted">Full access to manage directory data.</p>
          </div>
          <nav className="grid gap-2">
            {adminNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted transition hover:bg-white/80 hover:text-ink"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-champagne shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <AdminLogoutButton />
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
