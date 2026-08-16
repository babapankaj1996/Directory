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
import { faqJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo-schema";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Verified Global Service Provider Directory | Profinr",
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
  blue: { accent: "text-jade-700", rank: "text-jade-700/60 group-hover:text-jade-700" },
  emerald: { accent: "text-moss-700", rank: "text-moss-700/60 group-hover:text-moss-700" },
  amber: { accent: "text-gold-700", rank: "text-gold-700/60 group-hover:text-gold-700" },
  rose: { accent: "text-copper-700", rank: "text-copper-700/60 group-hover:text-copper-700" }
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
      <JsonLd data={jsonLd} />
      <section className="relative isolate overflow-hidden bg-deep text-white">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          fetchPriority="high"
          quality={60}
          className="absolute inset-0 -z-30 object-cover opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(105deg,rgba(22,19,15,0.97)_0%,rgba(22,19,15,0.9)_42%,rgba(22,19,15,0.62)_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-70" />
        <div
          aria-hidden="true"
          className="absolute -right-24 top-1/4 -z-10 h-[28rem] w-[28rem] rounded-full bg-copper-500/20 blur-[110px]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-shade to-transparent" />

        <div className="shell py-14 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.68fr)] lg:items-center">
            <div className="stagger">
              <p className="eyebrow text-copper-700">
                <Compass className="h-3.5 w-3.5" /> Global expert directory
              </p>
              <h1 className="mt-6 max-w-3xl text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-white md:text-[4.25rem]">
                Discover <em className="not-italic text-copper-700" style={{ fontVariationSettings: '"opsz" 144' }}>verified</em> service providers worldwide.
              </h1>
              <p className="mt-6 max-w-xl text-[1.0625rem] leading-8 text-white/65">
                Search by service, city or provider. Compare ratings, reviews, availability, verification, pricing notes
                and contact options in one calm directory.
              </p>

              <div className="mt-9">
                <SearchBar compact categoryOptions={activeCategories} />
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href="/listings" variant="gold" size="lg">Explore all listings</Button>
                <AddProfileSignupLink
                  variant="ghost"
                  className="bg-transparent text-white shadow-none ring-1 ring-white/25 hover:bg-ink hover:text-onaccent hover:ring-ink"
                >
                  Add your profile
                </AddProfileSignupLink>
              </div>

              <dl className="mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
                {[
                  [`${approvedListings.length.toLocaleString()}+`, "approved listings", <ShieldCheck key="approved" className="h-3.5 w-3.5" />],
                  [`${cityCount || 1}`, "cities covered", <MapPin key="cities" className="h-3.5 w-3.5" />],
                  [`${idVerifiedCount.toLocaleString()}`, "ID verified", <BadgeCheck key="verified" className="h-3.5 w-3.5" />]
                ].map(([value, label, icon]) => (
                  <div key={String(label)} className="min-w-0">
                    <dt className="sr-only">{String(label)}</dt>
                    <dd>
                      <span className="block font-display text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl">{value}</span>
                      <span className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-4 text-white/50">
                        <span className="mt-px shrink-0 text-copper-600">{icon}</span>
                        <span>{label}</span>
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {spotlight ? (
              <Link href={spotlightHref} className="group relative hidden lg:block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-shade ring-1 ring-white/15">
                  {/* No `priority` here: the card is hidden below lg, so
                      preloading it only burned mobile bandwidth ahead of LCP. */}
                  <Image
                    src={spotlight.coverImage || spotlight.image}
                    alt={spotlight.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-entrance group-hover:scale-[1.05]"
                    sizes="(max-width: 1024px) 0px, 420px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-shade via-shade/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="eyebrow text-copper-700">Spotlight provider</p>
                    <h2 className="mt-3 line-clamp-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white">{spotlight.name}</h2>
                    <p className="mt-1.5 text-sm text-white/60">{spotlight.category} · {spotlight.cityName}</p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4 text-sm">
                      <span className="font-semibold text-white">{spotlight.rating} rating</span>
                      <span className="text-white/55">{spotlight.reviews} reviews</span>
                      <ArrowRight className="h-4 w-4 text-copper-700 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {visibleRouteShortcuts.length ? (
        <section className="border-b border-line bg-paper" aria-label="Popular searches">
          <div className="shell flex flex-wrap items-center gap-x-6 gap-y-3 py-5">
            <span className="text-2xs font-bold uppercase tracking-[0.18em] text-ink-muted">Popular now</span>
            {visibleRouteShortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group inline-flex min-h-[44px] items-center gap-2 py-1 text-sm font-semibold text-ink transition-colors hover:text-copper-700"
              >
                <Route className="h-3.5 w-3.5 text-stone-400 transition-colors group-hover:text-copper-500" />
                {item.label}
                <span className="font-normal text-ink-muted">in {item.place}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {featuredListings.length ? (
        <section className="bg-paper py-16 md:py-20" aria-label="Featured providers on homepage">
          <div className="shell">
            <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="eyebrow text-copper-700">
                  <Sparkles className="h-3.5 w-3.5" /> Featured placement
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink md:text-[2.75rem] md:leading-[1.08]">
                  Featured service providers
                </h2>
                <p className="mt-4 text-[0.9375rem] leading-7 text-ink-muted">
                  These profiles have active homepage campaigns. Compare services, verification, reviews, gallery media,
                  rates and direct contact options before opening a profile.
                </p>
              </div>
              <Link href="/listings" className="group inline-flex min-h-[44px] shrink-0 items-center gap-2 py-1 text-sm font-semibold text-ink transition-colors hover:text-copper-700">
                View featured listings
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid gap-4">
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

      <section className="relative overflow-hidden border-y border-line bg-deep py-16 text-white md:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="shell relative">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow text-copper-700">
                <TrendingUp className="h-3.5 w-3.5" /> Trending now
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-white md:text-[2.75rem] md:leading-[1.08]">
                What people are searching this week
              </h2>
            </div>
            <Link href="/listings" className="group inline-flex min-h-[44px] shrink-0 items-center gap-2 py-1 text-sm font-semibold text-white/70 transition-colors hover:text-white">
              Browse all listings
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TrendingPanel title="Countries" items={trending.countries} tone="blue" />
            <TrendingPanel title="Cities" items={trending.cities} tone="emerald" />
            <TrendingPanel title="Categories" items={trending.categories} tone="amber" />
            <TrendingPanel title="Profiles" items={trending.profiles} tone="rose" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface py-16 md:py-20">
        <div className="shell">
          <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow text-copper-700">Popular categories</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink md:text-[2.75rem] md:leading-[1.08]">
                Browse {categoryCount} active service categories
              </h2>
            </div>
            <Link href="/categories" className="group inline-flex min-h-[44px] shrink-0 items-center gap-2 py-1 text-sm font-semibold text-ink transition-colors hover:text-copper-700">
              View all categories
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          <CategoryGrid items={standardCategories} hrefForCategory={(category) => `/${category.slug}`} />
          <AdultCategoryGate listings={adultListings} categories={categoryItems} />
        </div>
      </section>

      <section className="bg-paper py-16 md:py-20">
        <div className="shell grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_0.95fr] lg:gap-16">
          <div>
            <p className="eyebrow text-copper-700">
              <Sparkles className="h-3.5 w-3.5" /> How the directory helps
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink md:text-[2.75rem] md:leading-[1.08]">
              Find the right provider faster.
            </h2>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-7 text-ink-muted">
              Start with a service need, location or provider name. Then compare real profile details such as services
              offered, rating, reviews, portfolio galleries, pricing notes, availability, verification badges and
              response methods before you contact anyone.
            </p>
            <div className="mt-9 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              {[
                ["Local and global search", "Explore providers by country, city, category or profile keyword."],
                ["Trust signals", "Reviews, verified badges and galleries help build confidence."],
                ["Contact and booking", "Request, call, message or book where the provider allows it."]
              ].map(([title, copy], index) => (
                <div key={title} className="bg-surface p-6">
                  <span className="font-display text-sm text-copper-600">0{index + 1}</span>
                  <h3 className="mt-3 text-[0.9375rem] font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-line bg-deep p-8 text-white md:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-jade-500/15 blur-[80px]"
            />
            <div className="relative">
              <ShieldCheck className="h-8 w-8 text-copper-700" />
              <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-white md:text-3xl">
                What makes a profile worth opening?
              </h2>
              <ul className="mt-7 grid gap-4">
                {[
                  "Clear service details and location fit.",
                  "Verification or ID status where relevant.",
                  "Gallery media, rates or pricing notes, and availability.",
                  "Direct call, WhatsApp, chat, video consultation, website or booking request options."
                ].map((item) => (
                  <li key={item} className="flex gap-3 border-b border-white/10 pb-4 text-sm leading-6 text-white/70 last:border-0 last:pb-0">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-copper-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="shell flex flex-col justify-between gap-8 py-16 md:flex-row md:items-center md:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow text-copper-700">
              <Sparkles className="h-3.5 w-3.5" /> For business owners
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink md:text-[2.5rem] md:leading-[1.1]">
              One profile. Every user searching for your service.
            </h2>
            <p className="mt-5 text-[0.9375rem] leading-7 text-ink-muted">
              Add your services, gallery, prices, availability, contact options and verification details. After review,
              your profile can appear on relevant country, city, category and listing discovery pages.
            </p>
          </div>
          <AddProfileSignupLink variant="gold" className="shrink-0 px-6 py-3.5 text-[0.9375rem]">Add your profile</AddProfileSignupLink>
        </div>
      </section>

      <section className="bg-paper py-16 md:py-20">
        <div className="shell grid gap-10 lg:grid-cols-[0.8fr_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="eyebrow text-copper-700">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink md:text-[2.5rem] md:leading-[1.1]">
              Questions people ask before hiring
            </h2>
          </div>
          <div className="border-t border-line">
            {homeFaq.map((item) => (
              <details key={item.question} className="group border-b border-line py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[0.9375rem] font-semibold text-ink transition-colors hover:text-copper-700">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="relative mt-2 h-3 w-3 shrink-0 before:absolute before:left-0 before:top-1/2 before:h-px before:w-3 before:-translate-y-1/2 before:bg-copper-600 after:absolute after:left-1/2 after:top-0 after:h-3 after:w-px after:-translate-x-1/2 after:bg-copper-600 after:transition-transform after:duration-300 group-open:after:rotate-90 group-open:after:opacity-0"
                  />
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-muted">{item.answer}</p>
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
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.06]">
      <p className={`text-2xs font-bold uppercase tracking-[0.18em] ${toneClasses.accent}`}>{title}</p>
      <div className="mt-4 divide-y divide-white/10">
        {items.length ? items.map((item, index) => (
          <Link
            key={`${title}-${item.href}`}
            href={item.href}
            className="group flex items-baseline gap-3 py-2.5 transition-colors"
          >
            <span className={`w-4 shrink-0 font-display text-sm tabular-nums transition-colors ${toneClasses.rank}`}>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white/90 transition-colors group-hover:text-white">{item.label}</span>
              <span className="mt-0.5 block truncate text-xs text-white/40">{item.meta}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-white/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-white/50" />
          </Link>
        )) : (
          <p className="py-3 text-sm text-white/40">No trending data yet</p>
        )}
      </div>
    </div>
  );
}
