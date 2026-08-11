import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle2, Compass, MapPin, Route, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { CategoryGrid } from "@/components/category-card";
import { AdultCategoryGate } from "@/components/adult-access";
import { AddProfileSignupLink } from "@/components/add-profile-signup-link";
import { ListingCard } from "@/components/listing-card";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { countryNames, isFeaturedActive, isIdVerifiedListing, sortByFeaturedVisibility, type Listing } from "@/lib/data";
import { getPublicCategories, getPublicProfiles, withCategoryCounts } from "@/lib/profiles";
import { faqJsonLd, organizationJsonLd, serializeJsonLd, websiteJsonLd } from "@/lib/seo-schema";

export const metadata: Metadata = {
  title: "Verified Global Service Provider Directory",
  description: "Discover verified service providers worldwide. Compare local experts by category, location, rating, experience, pricing, availability, reviews and profile details before you contact or book.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Verified Global Service Provider Directory",
    description: "Find trusted professionals, compare service details, read reviews, check availability and contact providers by enquiry, call, chat or booking request where available.",
    url: "/",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Verified Global Service Provider Directory",
    description: "Compare verified service providers worldwide by category, city, price, reviews, availability and profile details."
  }
};

const homeFaq = [
  {
    question: "How can I find trusted service providers?",
    answer: "Search by country, city, category, service keyword or provider name. Profile details, verification badges, reviews, galleries, pricing notes and availability help you compare providers before contacting them."
  },
  {
    question: "Can I book a service provider online?",
    answer: "Yes. Depending on the provider profile, you can send a service or booking request, call directly, open WhatsApp, visit the provider website, or use chat and video consultation options when they are enabled."
  },
  {
    question: "Why do verified profiles matter?",
    answer: "Verification badges help users identify profiles that completed the relevant review step. You should still compare services, reviews, prices, availability, gallery media and contact details before hiring."
  },
  {
    question: "How should I compare service providers?",
    answer: "Compare location fit, category expertise, ratings, review count, experience, service descriptions, gallery examples, pricing notes, availability and response options before you request a service."
  }
];

const routeShortcuts = [
  { href: "/in/delhi/astrologer", label: "Astrologers", place: "Delhi", categorySlug: "astrologer" },
  { href: "/us/new-york/doctors", label: "Doctors", place: "New York", categorySlug: "doctors" },
  { href: "/in/delhi/makeup-artists", label: "Makeup Artists", place: "Delhi", categorySlug: "makeup-artists" },
  { href: "/in/delhi/rent-a-girlfriend", label: "Rent a Girlfriend", place: "Delhi", categorySlug: "rent-a-girlfriend" }
];

const trendTones = {
  blue: {
    panel: "bg-cyan-50/80 ring-cyan-100",
    header: "from-cyan-500 to-blue-600",
    rank: "bg-cyan-100 text-cyan-800",
    row: "hover:bg-cyan-50"
  },
  emerald: {
    panel: "bg-emerald-50/80 ring-emerald-100",
    header: "from-emerald-500 to-teal-600",
    rank: "bg-emerald-100 text-emerald-700",
    row: "hover:bg-emerald-50"
  },
  amber: {
    panel: "bg-amber-50/80 ring-amber-100",
    header: "from-amber-400 to-orange-500",
    rank: "bg-amber-100 text-amber-800",
    row: "hover:bg-amber-50"
  },
  rose: {
    panel: "bg-rose-50/80 ring-rose-100",
    header: "from-rose-500 to-pink-600",
    rank: "bg-rose-100 text-rose-700",
    row: "hover:bg-rose-50"
  }
} as const;

type TrendTone = keyof typeof trendTones;

type TrendItem = {
  href: string;
  label: string;
  meta: string;
  score: number;
};

function pushTrend(map: Map<string, TrendItem & { count: number; views: number }>, key: string, item: Omit<TrendItem, "meta" | "score">, listing: Listing) {
  const current = map.get(key) || { ...item, count: 0, views: 0, meta: "", score: 0 };
  current.count += 1;
  current.views += listing.viewCount || 0;
  current.score = current.views + current.count * 100;
  current.meta = `${current.count} listing${current.count === 1 ? "" : "s"} - ${current.views.toLocaleString()} views`;
  map.set(key, current);
}

function topTrendingGroups(listings: Listing[]) {
  const countries = new Map<string, TrendItem & { count: number; views: number }>();
  const cities = new Map<string, TrendItem & { count: number; views: number }>();
  const categories = new Map<string, TrendItem & { count: number; views: number }>();

  listings.forEach((listing) => {
    pushTrend(countries, listing.country, {
      href: `/${listing.country}`,
      label: countryNames[listing.country] || listing.country.toUpperCase()
    }, listing);
    pushTrend(cities, `${listing.country}-${listing.city}`, {
      href: `/${listing.country}/${listing.city}`,
      label: listing.cityName || listing.city
    }, listing);
    pushTrend(categories, listing.categorySlug, {
      href: `/${listing.categorySlug}`,
      label: listing.category
    }, listing);
  });

  const sortGroups = (items: Map<string, TrendItem & { count: number; views: number }>) =>
    [...items.values()].sort((first, second) => second.score - first.score || first.label.localeCompare(second.label)).slice(0, 5);

  const profiles = [...listings]
    .sort((first, second) => (second.viewCount || 0) - (first.viewCount || 0) || second.rating - first.rating || second.reviews - first.reviews)
    .slice(0, 5)
    .map((listing) => ({
      href: `/${listing.country}/${listing.city}/${listing.categorySlug}/${listing.slug}`,
      label: listing.name,
      meta: `${listing.cityName} - ${(listing.viewCount || 0).toLocaleString()} views`,
      score: listing.viewCount || 0
    }));

  return {
    countries: sortGroups(countries),
    cities: sortGroups(cities),
    categories: sortGroups(categories),
    profiles
  };
}

export default async function HomePage() {
  const [approvedListings, adultListings, activeCategories] = await Promise.all([
    getPublicProfiles({ placementPath: "/" }),
    getPublicProfiles({ adult: true }),
    getPublicCategories({ includeAdult: true })
  ]);
  const categoryItems = withCategoryCounts(activeCategories, approvedListings);
  const standardCategories = categoryItems.filter((category) => !category.isAdult).slice(0, 8);
  const activeCategorySlugs = new Set(activeCategories.map((category) => category.slug));
  const visibleRouteShortcuts = routeShortcuts.filter((item) => activeCategorySlugs.has(item.categorySlug));
  const featuredListings = sortByFeaturedVisibility(
    approvedListings.filter((listing) => isFeaturedActive(listing, Date.now(), "/")),
    "/"
  );
  const spotlight = featuredListings[0] || approvedListings[0];
  const cityCount = new Set(approvedListings.map((listing) => `${listing.country}-${listing.city}`)).size;
  const categoryCount = standardCategories.length;
  const idVerifiedCount = approvedListings.filter((listing) => isIdVerifiedListing(listing)).length;
  const trending = topTrendingGroups(approvedListings);
  const heroImage = spotlight?.coverImage || spotlight?.image || "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=85";
  const spotlightHref = spotlight ? `/${spotlight.country}/${spotlight.city}/${spotlight.categorySlug}/${spotlight.slug}` : "/listings";
  const jsonLd = [websiteJsonLd(), organizationJsonLd(), faqJsonLd(homeFaq)];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <section className="relative isolate overflow-hidden border-b border-cyan-200/70 bg-ink px-4 py-10 text-white md:py-16">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          className="absolute inset-0 -z-30 object-cover opacity-45 saturate-125"
          sizes="100vw"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(116deg,rgba(11,16,32,0.98),rgba(8,47,73,0.88)_38%,rgba(217,119,6,0.54)_68%,rgba(225,29,72,0.36))]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-9 lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.72fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[.12] px-4 py-2 text-sm font-semibold text-cyan-50 ring-1 ring-white/20 backdrop-blur">
                <Compass className="h-4 w-4 text-cyan-300" /> Global expert directory
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.02] text-white md:text-6xl">
                Discover <span className="bg-[linear-gradient(100deg,#67e8f9,#facc15_48%,#fb7185)] bg-clip-text text-transparent">verified</span> service providers worldwide.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/80 md:text-lg">
                Search by service, city or provider. Compare ratings, reviews, availability, verification, pricing notes and contact options in one fast directory.
              </p>

              <div className="mt-8 max-w-6xl">
                <SearchBar compact categoryOptions={activeCategories} />
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href="/listings" variant="gold">Explore All Listings</Button>
                <AddProfileSignupLink variant="ghost" className="bg-white/[.12] text-white ring-white/25 hover:bg-white hover:text-ink" />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  [`${approvedListings.length.toLocaleString()}+`, "approved listings", <ShieldCheck key="approved" className="h-4 w-4 text-emerald-300" />],
                  [`${cityCount || 1}`, "cities with professionals", <MapPin key="cities" className="h-4 w-4 text-amber-300" />],
                  [`${idVerifiedCount.toLocaleString()}`, "ID verified profiles", <BadgeCheck key="verified" className="h-4 w-4 text-cyan-300" />]
                ].map(([value, label, icon]) => (
                  <div key={String(label)} className="rounded-lg bg-white/[.12] px-4 py-3 ring-1 ring-white/20 backdrop-blur">
                    <p className="flex items-center gap-2 text-2xl font-bold text-white">{icon}{value}</p>
                    <p className="mt-1 text-sm font-medium text-white/75">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {spotlight ? (
              <Link href={spotlightHref} className="group relative hidden overflow-hidden rounded-lg border border-white/20 bg-white/10 p-3 shadow-2xl shadow-cyan-950/30 ring-1 ring-white/20 backdrop-blur lg:block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-slate-900">
                  <Image
                    src={spotlight.coverImage || spotlight.image}
                    alt={spotlight.name}
                    fill
                    priority
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    sizes="420px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="inline-flex rounded-full bg-white/[.18] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100 ring-1 ring-white/20 backdrop-blur">
                      Spotlight provider
                    </p>
                    <h2 className="mt-3 line-clamp-2 text-2xl font-bold text-white">{spotlight.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-amber-100">{spotlight.category} - {spotlight.cityName}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white/[.14] px-4 py-3 ring-1 ring-white/20 backdrop-blur">
                      <span className="text-sm font-semibold text-white">{spotlight.rating} rating</span>
                      <span className="text-sm font-semibold text-cyan-100">{spotlight.reviews} reviews</span>
                      <ArrowRight className="h-4 w-4 text-amber-200 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-b border-cyan-100 bg-white px-4 py-4">
        <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-4">
          {visibleRouteShortcuts.map((item) => (
            <Link key={item.href} href={item.href} className="group flex items-center justify-between gap-3 rounded-lg border border-cyan-100 bg-gradient-to-br from-white to-cyan-50/70 px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-950/10">
              <span>
                <span className="block text-xs font-bold uppercase tracking-[0.14em] text-coral">{item.place}</span>
                {item.label}
              </span>
              <Route className="h-4 w-4 text-muted transition group-hover:text-cyan-700" />
            </Link>
          ))}
        </div>
      </section>

      {featuredListings.length ? (
        <section className="border-y border-cyan-100 bg-[linear-gradient(180deg,#effcff_0%,#ffffff_100%)] px-4 py-14" aria-label="Featured providers on homepage">
          <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-cyan-700"><Sparkles className="h-4 w-4 text-coral" /> Featured placement</p>
              <h2 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Featured service providers</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                These profiles have active homepage featured campaigns. Compare services, verification status, reviews, gallery media, rates and direct contact options before opening a profile.
              </p>
            </div>
            <Link href="/listings" className="inline-flex items-center gap-2 text-sm font-semibold text-coral">
              View featured listings <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5">
            {featuredListings.map((listing, index) => (
              <ListingCard
                key={`home-featured-${listing.country}-${listing.city}-${listing.slug}`}
                listing={listing}
                horizontal
                featuredContact
                priority={index < 2}
                placementPath="/"
              />
            ))}
          </div>
          </div>
        </section>
      ) : null}

      <section className="bg-ink px-4 py-14 text-white">
        <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-200"><TrendingUp className="h-4 w-4 text-amber-300" /> Trending now</p>
            <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Top 5 country, city, category and profile pages</h2>
          </div>
          <Link href="/listings" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200">
            Browse all listings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-4">
          <TrendingPanel title="Countries" items={trending.countries} tone="blue" />
          <TrendingPanel title="Cities" items={trending.cities} tone="emerald" />
          <TrendingPanel title="Categories" items={trending.categories} tone="amber" />
          <TrendingPanel title="Profiles" items={trending.profiles} tone="rose" />
        </div>
        </div>
      </section>

      <section className="border-y border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_48%,#fff1f2_100%)] px-4 py-14">
        <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-coral">Popular categories</p>
            <h2 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Browse {categoryCount} active service categories</h2>
          </div>
          <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
            View all categories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <CategoryGrid items={standardCategories} hrefForCategory={(category) => `/${category.slug}`} />
        <AdultCategoryGate listings={adultListings} categories={categoryItems} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]">
          <div className="rounded-lg border border-cyan-100 bg-white p-6 shadow-xl shadow-cyan-950/10 md:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              <Sparkles className="h-4 w-4" /> How the directory helps
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink">Find the right provider faster.</h2>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">
              Start with a service need, location or provider name. Then compare real profile details such as services offered, rating, reviews, portfolio galleries, pricing notes, availability, verification badges and response methods before you contact anyone.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Local and global search", "Explore service providers by country, city, category or profile keyword."],
                ["Trust signals", "Use reviews, verified badges, galleries and profile details to build confidence."],
                ["Contact and booking", "Request a service, call, message, book or start an online consultation where available."]
              ].map(([title, copy]) => (
                <div key={title} className="rounded-lg bg-gradient-to-br from-cyan-50 to-white p-4 ring-1 ring-cyan-100">
                  <CheckCircle2 className="h-5 w-5 text-coral" />
                  <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[linear-gradient(135deg,#0b1020,#0f766e_52%,#d97706)] p-6 text-white shadow-2xl shadow-cyan-950/20 md:p-8">
            <ShieldCheck className="h-9 w-9 text-amber-200" />
            <h2 className="mt-4 text-3xl font-bold">What makes a profile worth opening?</h2>
            <div className="mt-5 grid gap-3">
              {[
                "Clear service details and location fit.",
                "Verification or ID status where relevant.",
                "Gallery media, rates or pricing notes, and availability.",
                "Direct call, WhatsApp, chat, video consultation, website or booking request options when available."
              ].map((item) => (
                <p key={item} className="flex gap-3 text-sm leading-6 text-white/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-cyan-100 bg-[linear-gradient(100deg,#0b1020,#155e75_48%,#f97316)] px-4 py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><Sparkles className="h-4 w-4 text-amber-200" /> For business owners</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Create one profile and reach users looking for your service.</h2>
            <p className="mt-3 max-w-3xl leading-7 text-white/80">
              Add your services, gallery, prices, availability, contact options and verification details. After review, your profile can appear on relevant country, city, category and listing discovery pages.
            </p>
          </div>
          <AddProfileSignupLink variant="gold" className="shadow-2xl shadow-orange-950/20">Add Your Profile</AddProfileSignupLink>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-lg border border-cyan-100 bg-white p-6 shadow-xl shadow-slate-950/10 md:p-8">
          <h2 className="text-3xl font-bold tracking-tight text-ink">Questions people ask before hiring</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {homeFaq.map((item) => (
              <details key={item.question} className="rounded-lg bg-gradient-to-br from-cyan-50 to-white px-4 py-3 ring-1 ring-cyan-100">
                <summary className="cursor-pointer text-sm font-semibold text-ink">{item.question}</summary>
                <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function TrendingPanel({ title, items, tone }: { title: string; items: TrendItem[]; tone: TrendTone }) {
  const toneClasses = trendTones[tone];
  return (
    <div className={`min-w-0 overflow-hidden rounded-lg p-1 shadow-sm ring-1 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneClasses.panel}`}>
      <div className={`rounded-md bg-gradient-to-br px-4 py-4 text-white ${toneClasses.header}`}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Top 5</p>
        <h3 className="mt-1 text-xl font-semibold">{title}</h3>
      </div>
      <div className="space-y-2 p-3">
        {items.length ? items.map((item, index) => (
          <Link key={`${title}-${item.href}`} href={item.href} className={`group flex items-center gap-3 rounded-lg bg-white/80 px-3 py-3 ring-1 ring-white/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm ${toneClasses.row}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${toneClasses.rank}`}>{index + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink group-hover:text-champagne">{item.label}</span>
              <span className="mt-0.5 block truncate text-xs font-medium text-muted">{item.meta}</span>
            </span>
          </Link>
        )) : (
          <p className="rounded-lg bg-white/80 px-3 py-3 text-sm font-semibold text-muted ring-1 ring-white/80">No trending data yet</p>
        )}
      </div>
    </div>
  );
}
