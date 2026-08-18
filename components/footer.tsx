import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Footer navigation.
 *
 * Deliberately excludes /dashboard and /admin — both redirect straight to login
 * for the signed-out visitors who make up almost all footer traffic — and the
 * sitemap/robots files, which are crawler plumbing already declared in
 * robots.txt rather than anything a person clicks.
 */
function buildColumns(t: Dictionary) {
  return [
  {
      title: t.footer.explore,
    links: [
      { href: "/listings", label: "Latest listings" },
      { href: "/categories", label: "All categories" },
      { href: "/in/delhi/astrologer", label: "Astrologers in Delhi" }
    ]
  },
  {
      title: t.footer.company,
    links: [
      { href: "/about", label: t.footer.about },
      { href: "/contact", label: t.footer.contact },
      { href: "/blog", label: "Blog" }
    ]
  },
  {
      title: t.footer.getStarted,
    links: [
      { href: "/signup?role=OWNER", label: "List your business" },
      { href: "/signup", label: "Create an account" },
      { href: "/login", label: "Sign in" }
    ]
  },
  {
      title: t.footer.legal,
    links: [
      { href: "/privacy", label: t.footer.privacy },
      { href: "/terms", label: t.footer.terms },
      { href: "/disclaimer", label: t.footer.disclaimer }
    ]
  }
  ];
}

export function Footer({ t }: { t: Dictionary }) {
  const columns = buildColumns(t);
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-line bg-deep text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-80 w-80 rounded-full bg-copper-500/15 blur-3xl"
      />
      <div className="shell relative py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[0.65rem] bg-ink text-onaccent">
                <span className="font-display text-xl leading-none" style={{ fontVariationSettings: '"opsz" 144' }}>P</span>
              </span>
              <p className="font-display text-2xl tracking-[-0.02em]">Profinr</p>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
              Verified service providers, honest reviews, transparent pricing, real availability and direct booking
              enquiries — in one calm place to compare.
            </p>
            <Link
              href="/signup?role=OWNER"
              className="group mt-7 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-onaccent transition-transform duration-200 ease-entrance hover:-translate-y-0.5"
            >
              List your business
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title} className="grid content-start gap-3">
                <p className="text-2xs font-bold uppercase tracking-[0.18em] text-copper-700">{column.title}</p>
                {column.links.map((link) => (
                  <Link
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    className="-my-0.5 inline-flex w-fit items-center py-1.5 text-sm text-white/65 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Profinr. {t.footer.rights}</p>
          <p>Compare providers by rating, verification, availability and price before you book.</p>
        </div>
      </div>
    </footer>
  );
}
