"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Diamond, LayoutDashboard, LogOut, Menu, Plus, UserRound, X } from "lucide-react";
import { rememberAddProfileSignupIntent } from "@/components/add-profile-signup-link";
import { clearAdminSession, getCurrentUser } from "@/lib/admin-auth";

const nav = [
  { href: "/listings", label: "Listings" },
  { href: "/categories", label: "Categories" },
  { href: "/blog", label: "Blog" }
];

const addProfileSignupHref = "/signup";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((sessionUser) => {
        if (!mounted) return;
        setUser(sessionUser && typeof sessionUser === "object" ? sessionUser as { name?: string; role?: string } : null);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setSessionLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  function closeMenu() {
    setOpen(false);
  }

  function logout() {
    clearAdminSession();
    setUser(null);
    closeMenu();
    router.push("/login");
    router.refresh();
  }

  function rememberOwnerSignupIntent() {
    if (sessionLoaded && !user) rememberAddProfileSignupIntent();
  }

  function handleMobileCtaClick() {
    rememberOwnerSignupIntent();
    closeMenu();
  }

  const accountLabel = user?.role === "ADMIN" ? "Admin" : user?.role === "OWNER" ? "Owner" : user ? "User" : "";
  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const dashboardLabel = user?.role === "ADMIN" ? "Admin Panel" : "Dashboard";
  const ctaHref = user?.role === "ADMIN" ? "/admin/listings" : user?.role === "OWNER" ? "/dashboard" : user?.role === "USER" ? "/listings" : addProfileSignupHref;
  const ctaLabel = user?.role === "ADMIN" ? "Listings" : user?.role === "OWNER" ? "My Profile" : user?.role === "USER" ? "Explore" : "Add Profile";

  return (
    <header className="sticky top-0 z-50 px-3 py-3 md:px-4 md:py-4">
      <div className="glass-strong luxury-border mx-auto max-w-7xl rounded-[1.6rem] px-3 py-3 shadow-sm md:rounded-full md:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" onClick={closeMenu} className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-champagne shadow-glow">
              <Diamond className="h-5 w-5" />
            </span>
            <span className="truncate text-lg font-semibold tracking-tight text-ink">Directory</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted lg:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={`transition hover:text-ink ${pathname === item.href ? "text-ink" : ""}`}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {sessionLoaded && user ? (
              <Link href={dashboardHref} className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/70">
                {dashboardLabel}
              </Link>
            ) : null}
            {!sessionLoaded ? (
              <span className="h-10 w-20 rounded-full bg-white/55" aria-hidden="true" />
            ) : user ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/70"
              >
                <UserRound className="h-4 w-4 text-champagne" /> {accountLabel}
                <LogOut className="h-4 w-4 text-rose-500" />
              </button>
            ) : (
              <Link href="/login" className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/70">
                Login
              </Link>
            )}
            <Link href={ctaHref} onClick={rememberOwnerSignupIntent} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-glass transition hover:-translate-y-0.5">
              {user?.role === "ADMIN" ? <LayoutDashboard className="h-4 w-4" /> : user?.role === "OWNER" ? <UserRound className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {ctaLabel}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/75 text-ink shadow-sm md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="mt-3 grid gap-2 border-t border-white/70 pt-3 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${pathname === item.href ? "bg-ink text-white" : "bg-white/65 text-muted hover:bg-white hover:text-ink"}`}
              >
                {item.label}
              </Link>
            ))}
            <div className={`grid gap-2 pt-1 ${sessionLoaded && user ? "grid-cols-3" : "grid-cols-2"}`}>
              {sessionLoaded && user ? (
                <Link href={dashboardHref} onClick={closeMenu} className="rounded-2xl bg-white/70 px-3 py-3 text-center text-sm font-semibold text-ink">
                  {dashboardLabel}
                </Link>
              ) : null}
              {!sessionLoaded ? (
                <span className="rounded-2xl bg-white/50 px-4 py-3" aria-hidden="true" />
              ) : user ? (
                <button type="button" onClick={logout} className="rounded-2xl bg-white/70 px-4 py-3 text-center text-sm font-semibold text-rose-600">
                  Logout
                </button>
              ) : (
                <Link href="/login" onClick={closeMenu} className="rounded-2xl bg-white/70 px-4 py-3 text-center text-sm font-semibold text-ink">
                  Login
                </Link>
              )}
              <Link href={ctaHref} onClick={handleMobileCtaClick} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
                {user?.role === "ADMIN" ? <LayoutDashboard className="h-4 w-4" /> : user?.role === "OWNER" ? <UserRound className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {user?.role === "ADMIN" ? "Listings" : user?.role === "OWNER" ? "Profile" : user?.role === "USER" ? "Explore" : "Add"}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
