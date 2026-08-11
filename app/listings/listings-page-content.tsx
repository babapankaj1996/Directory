import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { ListingsFilterPanel, type ListingsFilters } from "@/components/listings-filter-panel";
import { getPaginatedPublicProfiles, getPublicCategories } from "@/lib/profiles";
import { categoryItemListJsonLd, faqJsonLd, serializeJsonLd } from "@/lib/seo-schema";

const perPage = 20;

export const paginatedRobots: Metadata["robots"] = {
  index: false,
  follow: true,
  noarchive: true
};

export type ListingSearchParams = {
  page?: string;
  search?: string;
  country?: string;
  city?: string;
  category?: string;
  featured?: string;
};

export function parseListingsPage(value?: string) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseFilters(params: ListingSearchParams): ListingsFilters {
  return {
    search: params.search?.trim() || undefined,
    country: params.country?.trim().toLowerCase() || undefined,
    city: params.city?.trim().toLowerCase() || undefined,
    category: params.category?.trim().toLowerCase() || undefined,
    featured: params.featured === "true" ? true : undefined
  };
}

export function listingsHref(page: number, filters: ListingsFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.country) params.set("country", filters.country);
  if (filters.city) params.set("city", filters.city);
  if (filters.category) params.set("category", filters.category);
  if (filters.featured) params.set("featured", "true");
  const query = params.toString();
  const path = page > 1 ? `/listings/page/${page}` : "/listings";
  return query ? `${path}?${query}` : path;
}

const listingsFaq = [
  {
    question: "How do I compare service providers from the listings page?",
    answer: "Start with the provider's category, city, rating, reviews, gallery media, pricing notes and availability. Open the full profile before sending an enquiry, calling or booking."
  },
  {
    question: "Can I contact listed professionals online?",
    answer: "Yes. Depending on each profile, you may see enquiry, booking request, call, WhatsApp, website, chat or video consultation options."
  },
  {
    question: "Why do some providers appear as featured?",
    answer: "Featured providers have an active placement campaign and may appear above regular listings. You should still compare services, reviews, verification status, pricing notes and availability before contacting them."
  }
];

export function listingsMetadata(page: number, filters: ListingsFilters): Metadata {
  const scoped = [filters.search, filters.category, filters.city, filters.country].filter(Boolean).join(" ");
  const titleBase = scoped ? `Service Provider Search Results for ${scoped}` : "Latest Verified Service Provider Listings";
  const title = page > 1 ? `${titleBase} - Page ${page}` : titleBase;
  const hasFilters = Boolean(filters.search || filters.country || filters.city || filters.category || filters.featured);

  return {
    title,
    description: "Browse recently approved service provider profiles. Compare professionals by location, category, rating, reviews, pricing notes, availability, gallery media and contact options.",
    alternates: {
      canonical: "/listings"
    },
    openGraph: {
      title,
      description: "Compare listed professionals by service category, city, ratings, reviews, pricing notes and booking or contact options.",
      url: "/listings",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Compare listed professionals by service category, city, ratings, reviews, pricing notes and booking or contact options."
    },
    robots: hasFilters || page > 1 ? { index: false, follow: true, noarchive: true } : { index: true, follow: true }
  };
}

export async function ListingsPageContent({ page, filters }: { page: number; filters: ListingsFilters }) {
  const [result, activeCategories] = await Promise.all([
    getPaginatedPublicProfiles({ page, perPage, ...filters, placementPath: "/listings" }),
    getPublicCategories({ includeAdult: true })
  ]);

  if (page > result.totalPages) {
    redirect(listingsHref(result.totalPages, filters));
  }

  const previousHref = listingsHref(page - 1, filters);
  const nextHref = listingsHref(page + 1, filters);
  const jsonLd = [
    categoryItemListJsonLd("/listings", result.listings),
    faqJsonLd(listingsFaq)
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-champagne">Recently approved professionals</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">Compare service provider listings</h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted">
            Browse available professionals across countries, cities and categories. Compare ratings, reviews, gallery media, pricing notes, availability and contact options before you open a profile, send an enquiry or request a booking.
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-slate-200">
          {result.total} approved listings
        </div>
      </div>

      <ListingsFilterPanel filters={filters} total={result.total} categories={activeCategories} />

      <section>
        <div className="mb-5 rounded-3xl bg-white/50 p-4 text-sm font-semibold text-muted">
          Showing {result.listings.length} listing{result.listings.length === 1 ? "" : "s"} on page {result.page} of {result.totalPages}
        </div>
        {result.listings.length ? (
          <div className="grid gap-5">
            {result.listings.map((listing, index) => <ListingCard key={`${listing.country}-${listing.city}-${listing.categorySlug}-${listing.slug}`} listing={listing} horizontal featuredContact priority={index < 2} placementPath="/listings" />)}
          </div>
        ) : (
          <div className="glass rounded-[2rem] p-8 text-center">
            <h2 className="text-2xl font-semibold text-ink">No approved listings found</h2>
            <p className="mt-3 text-muted">Try a different search term, country, city or category.</p>
          </div>
        )}
      </section>

      <nav className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row" aria-label="Listings pagination">
        <Link
          href={previousHref}
          aria-disabled={page <= 1}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${page <= 1 ? "pointer-events-none bg-cloud text-muted" : "bg-ink text-white"}`}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Link>
        <p className="text-sm font-semibold text-muted">Page {result.page} of {result.totalPages}</p>
        <Link
          href={nextHref}
          aria-disabled={page >= result.totalPages}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${page >= result.totalPages ? "pointer-events-none bg-cloud text-muted" : "bg-ink text-white"}`}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </nav>

      {page === 1 && !filters.search && !filters.country && !filters.city && !filters.category && !filters.featured ? (
        <ListingsSeoGuide categories={activeCategories} total={result.total} faq={listingsFaq} />
      ) : null}
    </main>
  );
}

function ListingsSeoGuide({ categories, total, faq }: { categories: Awaited<ReturnType<typeof getPublicCategories>>; total: number; faq: typeof listingsFaq }) {
  const visibleCategories = categories.slice(0, 10);
  return (
    <section className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]" aria-label="Listings directory guide">
      <div className="rounded-[1.7rem] bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-champagne/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne">
          <Sparkles className="h-4 w-4" /> Latest listing guide
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Browse the newest approved profiles first.</h2>
        <p className="mt-4 text-sm leading-7 text-muted md:text-base">
          The listings page highlights recently approved professionals from across the directory. Use it to discover new providers, then open a profile or local category page when you want deeper service details, reviews, rates and availability.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "Use filters when you need a specific country, city or category.",
            "Open a city/category URL for the most focused local search intent.",
            "Featured profiles appear first while their campaign is active.",
            "Profile pages hold the canonical provider details, gallery and quote form."
          ].map((point) => (
            <p key={point} className="flex gap-3 rounded-2xl bg-cloud p-4 text-sm leading-6 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {point}
            </p>
          ))}
        </div>
      </div>
      <div className="rounded-[1.7rem] bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <h2 className="text-2xl font-semibold text-ink">Popular category paths</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Category links help visitors and crawlers move from broad discovery into focused service pages.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {visibleCategories.map((category) => (
            <Link key={category.slug} href={`/${category.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm ring-1 ring-slate-200 transition hover:text-ink">
              {category.name}
            </Link>
          ))}
        </div>
        <div className="mt-6 grid gap-3">
          {faq.map((item) => (
            <details key={item.question} className="rounded-2xl bg-cloud px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{item.question}</summary>
              <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
