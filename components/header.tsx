"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, Plus, UserRound, X } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);
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

  // Border and shadow only appear once the page scrolls under the bar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile sheet: lock the page behind it and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
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
  const CtaIcon = user?.role === "ADMIN" ? LayoutDashboard : user?.role === "OWNER" ? UserRound : Plus;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ease-entrance ${
        scrolled
          ? "border-b border-line bg-paper/80 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          : "border-b border-transparent bg-paper/40 backdrop-blur-sm"
      }`}
    >
      <div className="shell">
        <div className="flex h-[4.25rem] items-center justify-between gap-4">
          <Link href="/" onClick={closeMenu} className="group flex min-w-0 items-center gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.6rem] bg-ink text-onaccent transition-transform duration-300 ease-entrance group-hover:-rotate-6">
              <span className="font-display text-lg leading-none" style={{ fontVariationSettings: '"opsz" 144' }}>P</span>
              <span aria-hidden="true" className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-copper-500 ring-2 ring-paper" />
            </span>
            <span className="min-w-0 leading-none">
              <span className="block truncate font-display text-[1.35rem] font-semibold tracking-[-0.02em] text-ink">Profinr</span>
              <span className="mt-0.5 hidden text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-ink-muted sm:block">Verified providers</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-md px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
                    active ? "text-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3.5 -bottom-0.5 h-px origin-left bg-copper-500 transition-transform duration-300 ease-entrance ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            {sessionLoaded && user ? (
              <Link href={dashboardHref} className="rounded-md px-3.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
                {dashboardLabel}
              </Link>
            ) : null}
            {!sessionLoaded ? (
              <span className="skeleton h-9 w-24 rounded-md" aria-hidden="true" />
            ) : user ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                <UserRound className="h-4 w-4" />
                {accountLabel}
                <LogOut className="h-3.5 w-3.5 text-clay-500" />
              </button>
            ) : (
              <Link href="/login" className="rounded-md px-3.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
                Login
              </Link>
            )}
            <Link
              href={ctaHref}
              onClick={rememberOwnerSignupIntent}
              className="ml-2 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-onaccent shadow-sm transition-all duration-200 ease-entrance hover:bg-stone-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <CtaIcon className="h-4 w-4 text-copper-400" /> {ctaLabel}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink ring-1 ring-line transition-colors hover:bg-stone-100 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="md:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={closeMenu}
            className="fixed inset-0 top-[4.25rem] z-40 animate-fade-in cursor-default bg-shade/25 backdrop-blur-[2px]"
          />
          <div
            id="mobile-nav"
            className="relative z-50 animate-sheet-in border-t border-line bg-paper px-4 pb-6 pt-4 shadow-lg"
          >
            <nav className="grid gap-1" aria-label="Mobile">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 text-[0.9375rem] font-semibold transition-colors ${
                      active ? "bg-ink text-onaccent" : "text-ink hover:bg-stone-100"
                    }`}
                  >
                    {item.label}
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-copper-400" : "bg-transparent"}`} aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 grid gap-2 border-t border-line pt-4">
              {sessionLoaded && user ? (
                <Link href={dashboardHref} onClick={closeMenu} className="rounded-lg bg-stone-100 px-4 py-3 text-center text-sm font-semibold text-ink">
                  {dashboardLabel}
                </Link>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {!sessionLoaded ? (
                  <span className="skeleton h-12 rounded-lg" aria-hidden="true" />
                ) : user ? (
                  <button type="button" onClick={logout} className="rounded-lg px-4 py-3 text-center text-sm font-semibold text-clay-600 ring-1 ring-line">
                    Logout
                  </button>
                ) : (
                  <Link href="/login" onClick={closeMenu} className="rounded-lg px-4 py-3 text-center text-sm font-semibold text-ink ring-1 ring-line">
                    Login
                  </Link>
                )}
                <Link
                  href={ctaHref}
                  onClick={handleMobileCtaClick}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-onaccent"
                >
                  <CtaIcon className="h-4 w-4 text-copper-400" /> {ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
