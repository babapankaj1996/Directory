import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Layers3, ShieldCheck } from "lucide-react";
import { CategoryDirectoryExplorer } from "@/components/category-directory-explorer";
import { PageHeading } from "@/components/page-heading";
import { getCategorySearchContent } from "@/lib/seo-content";
import { getPublicCategories, getPublicProfiles, withCategoryCounts } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Service Categories | Compare Verified Professionals",
  description: "Browse service categories for verified professionals worldwide. Compare experts by service type, city, reviews, pricing, availability and contact options.",
  alternates: { canonical: "/categories" },
  openGraph: {
    title: "Service Categories | Compare Verified Professionals",
    description: "Explore categories for local experts, consultants and service providers worldwide.",
    url: "/categories",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Service Categories | Compare Verified Professionals",
    description: "Explore categories for local experts, consultants and service providers worldwide."
  }
};

export default async function CategoriesPage() {
  const [listings, activeCategories] = await Promise.all([
    getPublicProfiles(),
    getPublicCategories({ includeAdult: true })
  ]);
  const categoryItems = withCategoryCounts(activeCategories, listings);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <PageHeading
        eyebrow="Directory categories"
        title="Explore service categories worldwide"
        description="Find professionals by service type, then compare local experts by country, city, reviews, pricing, availability, gallery details and contact options."
      />
      <CategoryDirectoryExplorer listings={listings} categories={categoryItems} />
      <section className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]" aria-label="Category directory guide">
        <div className="rounded-[1.7rem] bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-champagne/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne">
            <Layers3 className="h-4 w-4" /> Category hub
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Start with the service you need.</h2>
          <p className="mt-4 text-sm leading-7 text-muted md:text-base">
            The category hub helps you move from a broad need to a qualified shortlist. Open a category for a global view, or select a country and city to compare nearby professionals serving that location.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              "Standard service categories stay visible for broad public discovery.",
              "18+ categories are separated, age-restricted and labeled clearly.",
              "Every category can lead to a clean /country/city/category URL.",
              "Approved profile counts help users avoid empty or inactive paths."
            ].map((point) => (
              <p key={point} className="flex gap-3 rounded-2xl bg-cloud p-4 text-sm leading-6 text-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {point}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[1.7rem] bg-ink p-6 text-white shadow-glass md:p-8">
          <ShieldCheck className="h-9 w-9 text-champagne" />
          <h2 className="mt-4 text-3xl font-semibold">Search examples by category</h2>
          <div className="mt-5 grid gap-3">
            {categoryItems.slice(0, 6).map((category) => (
              <Link key={category.slug} href={`/${category.slug}`} className="rounded-2xl bg-white/10 p-4 transition hover:bg-white/15">
                <span className="block text-sm font-semibold text-white">{category.name}</span>
                <span className="mt-1 block text-xs leading-5 text-white/70">
                  {getCategorySearchContent(category).longTail.slice(0, 3).join(", ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
