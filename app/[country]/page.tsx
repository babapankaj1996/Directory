import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, HelpCircle, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import {
  isFeaturedActive,
  sortByFeaturedVisibility,
  type Category
} from "@/lib/data";
import { CategoryGrid } from "@/components/category-card";
import { CategoryListingExplorer } from "@/components/category-listing-explorer";
import { ListingCard } from "@/components/listing-card";
import { PageHeading } from "@/components/page-heading";
import { GlassCard } from "@/components/ui/glass-card";
import { activeCityLinks, getCategorySearchContent, globalCategoryCityLinks } from "@/lib/seo-content";
import { getActiveCitiesForCountry, getActiveCountries, getActiveCountry, type PublicCity, type PublicCountry } from "@/lib/locations";
import { getPublicCategories, getPublicCategory, getPublicProfiles, withCategoryCounts } from "@/lib/profiles";
import { breadcrumbJsonLd, categoryItemListJsonLd, faqJsonLd } from "@/lib/seo-schema";

type CountryRouteProps = {
  params: Promise<{ country: string }>;
  searchParams?: Promise<{ page?: string; country?: string; city?: string }>;
};

const categoryPerPage = 20;

function parsePage(value?: string) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function countryFaq(countryName: string) {
  return [
    {
      question: `How do I find trusted service providers in ${countryName}?`,
      answer: `Start with a city or category in ${countryName}, then compare provider profiles by services, reviews, ratings, pricing notes, availability, gallery media and contact options.`
    },
    {
      question: `Can I book professionals in ${countryName} online?`,
      answer: "Many profiles support enquiry or booking requests, and some may also show call, WhatsApp, chat, video consultation or website options depending on provider settings."
    },
    {
      question: `What should I check before hiring a provider in ${countryName}?`,
      answer: "Review the provider's service description, location coverage, verification badge, reviews, gallery examples, price notes, availability and response methods before you contact or book."
    }
  ];
}

function globalCategoryFaq(category: Category) {
  return [
    {
      question: `How do I compare ${category.name.toLowerCase()} providers?`,
      answer: `Compare ${category.name.toLowerCase()} profiles by location, services offered, experience, reviews, gallery media, pricing notes, availability and verification signals before contacting them.`
    },
    {
      question: `Can I contact ${category.name.toLowerCase()} providers online?`,
      answer: "Yes. Depending on each profile, you may be able to send an enquiry or booking request, call directly, use WhatsApp, visit a website, or use chat and video consultation options when enabled."
    },
    {
      question: `Should I choose a local ${category.name.toLowerCase()} page?`,
      answer: "Use a local city/category page when you want providers serving a specific city. Local pages make it easier to compare nearby professionals and availability."
    }
  ];
}

export async function generateMetadata({ params }: CountryRouteProps): Promise<Metadata> {
  const { country: segment } = await params;
  const countryData = await getActiveCountry(segment);
  if (countryData) {
    const countryName = countryData.name;
    const title = `${countryName} Service Directory | Verified Local Profiles`;
    const description = `Find trusted service providers in ${countryName}. Explore verified professionals, local experts, consultants and businesses across major cities. Compare ratings, services, pricing, availability and profile details before you connect or book.`;
    return {
      title,
      description,
      keywords: [`services in ${countryName}`, `${countryName} directory`, `verified providers ${countryName}`, `local service profiles ${countryName}`],
      alternates: { canonical: `/${segment}` },
      openGraph: { title, description, url: `/${segment}`, type: "website" },
      twitter: { card: "summary_large_image", title, description }
    };
  }

  const category = await getPublicCategory(segment);
  if (!category) notFound();

  const title = `${category.name} Directory | Verified ${category.isAdult ? "18+ Profiles" : "Service Profiles"}`;
  const description = getCategorySearchContent(category).summary
    .replaceAll("{category}", category.name)
    .replaceAll("{city}", "available cities")
    .replaceAll("{country}", "supported countries");

  return {
    title,
    description,
    keywords: getCategorySearchContent(category).longTail.map((term) => `${category.name} ${term}`),
    alternates: { canonical: `/${segment}` },
    openGraph: { title, description, url: `/${segment}`, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    robots: category.indexable === false ? { index: false, follow: true } : undefined,
    other: category.isAdult ? { rating: "adult" } : undefined
  };
}

export default async function CountryPage({ params, searchParams }: CountryRouteProps) {
  const { country: segment } = await params;
  const countryData = await getActiveCountry(segment);
  if (countryData) return <CountryDirectoryPage countryData={countryData} />;

  const category = await getPublicCategory(segment);
  if (!category) notFound();
  const query = searchParams ? await searchParams : {};
  if (query.page) {
    const page = parsePage(query.page);
    redirect(page > 1 ? `/${category.slug}/page/${page}` : `/${category.slug}`);
  }
  if (query.country || query.city) redirect(`/${category.slug}`);
  return <GlobalCategoryPage category={category} initialPage={1} />;
}

async function CountryDirectoryPage({ countryData }: { countryData: PublicCountry }) {
  const country = countryData.code;
  const countryName = countryData.name;
  const cities = await getActiveCitiesForCountry(country);
  const path = `/${country}`;
  const [countryListings, activeCategories] = await Promise.all([
    getPublicProfiles({ country, placementPath: path }),
    getPublicCategories({ includeAdult: true })
  ]);
  const now = Date.now();
  const featuredListings = sortByFeaturedVisibility(
    countryListings.filter((listing) => isFeaturedActive(listing, now, path)),
    path
  ).slice(0, 6);
  const faq = countryFaq(countryName);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: countryName, path: `/${country}` }
    ]),
    faqJsonLd(faq)
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeading
        eyebrow="Country directory"
        title={`Find trusted service providers in ${countryName}`}
        description={`Explore verified professionals, local experts, consultants and businesses across ${countryName}. Compare services, reviews, prices, availability, galleries and contact options before you connect or book.`}
      />
      {featuredListings.length ? (
        <section className="mt-12" aria-label={`Featured providers in ${countryName}`}>
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">Featured placement</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Featured providers across {countryName}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              These profiles have active country-level featured campaigns for {countryName}. Compare services, verification signals, reviews, galleries and direct contact options before connecting.
            </p>
          </div>
          <div className="grid gap-5">
            {featuredListings.map((listing, index) => (
              <ListingCard
                key={`country-featured-${listing.country}-${listing.city}-${listing.slug}`}
                listing={listing}
                horizontal
                featuredContact
                priority={index < 2}
                placementPath={path}
              />
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cities.map((city) => (
          <Link key={city.slug} href={`/${country}/${city.slug}`}>
            <GlassCard className="transition hover:-translate-y-1 hover:shadow-glow">
              <MapPin className="h-8 w-8 text-champagne" />
              <h2 className="mt-5 text-2xl font-semibold text-ink">{city.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {countryListings.filter((listing) => listing.city === city.slug).length} approved profile{countryListings.filter((listing) => listing.city === city.slug).length === 1 ? "" : "s"}.
              </p>
            </GlassCard>
          </Link>
        ))}
      </section>
      <section className="mt-14">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">Country categories</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Approved profiles by category</h2>
        </div>
        {cities.length ? (
          <CategoryGrid items={withCategoryCounts(activeCategories, countryListings)} country={country} city={cities[0].slug} />
        ) : (
          <GlassCard>
            <h3 className="text-xl font-semibold text-ink">No active city pages yet</h3>
            <p className="mt-2 text-sm text-muted">Activate at least one city for this country before linking country category cards to local pages.</p>
          </GlassCard>
        )}
      </section>
      <CountrySeoSection country={country} countryName={countryName} listings={countryListings} cities={cities} categories={activeCategories} faq={faq} />
    </main>
  );
}

async function GlobalCategoryPage({
  category,
  initialPage = 1
}: {
  category: Category;
  initialPage?: number;
}) {
  const [listings, activeCityPaths] = await Promise.all([
    getPublicProfiles({ category: category.slug, placementPath: `/${category.slug}` }),
    getActiveCityPaths()
  ]);
  const totalPages = Math.max(Math.ceil(listings.length / categoryPerPage), 1);

  if (initialPage > totalPages) {
    redirect(totalPages > 1 ? `/${category.slug}/page/${totalPages}` : `/${category.slug}`);
  }
  const faq = globalCategoryFaq(category);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: category.name, path: `/${category.slug}` }
    ]),
    categoryItemListJsonLd(`/${category.slug}`, listings.slice(0, categoryPerPage)),
    faqJsonLd(faq)
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-champagne">Category directory</p>
            {category.isAdult ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">18+</span> : null}
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">{category.name} listings</h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted">
            Browse available {category.name.toLowerCase()} profiles across countries and cities. Compare experience, ratings, profile details, prices, availability and contact options before you connect.
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-slate-200">
          {listings.length} approved listing{listings.length === 1 ? "" : "s"}
        </div>
      </div>
      <CategoryListingExplorer category={category} listings={listings} initialPage={initialPage} />
      <GlobalCategorySeoSection category={category} listings={listings} activeCityPaths={activeCityPaths} faq={faq} />
    </main>
  );
}

async function getActiveCityPaths() {
  const countries = await getActiveCountries();
  const cityGroups = await Promise.all(countries.map(async (country) => {
    const cities = await getActiveCitiesForCountry(country.code);
    return cities.map((city) => ({
      country: country.code,
      city: city.slug,
      cityName: city.name
    }));
  }));
  return cityGroups.flat();
}

function CountrySeoSection({
  country,
  countryName,
  listings,
  cities,
  categories,
  faq
}: {
  country: string;
  countryName: string;
  listings: Awaited<ReturnType<typeof getPublicProfiles>>;
  cities: PublicCity[];
  categories: Awaited<ReturnType<typeof getPublicCategories>>;
  faq: ReturnType<typeof countryFaq>;
}) {
  const cityLinks = activeCityLinks(country, listings, cities);
  const standardCategories = categories.filter((category) => !category.isAdult).slice(0, 8);
  const adultCount = categories.filter((category) => category.isAdult).length;

  return (
    <section className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]" aria-label={`${countryName} directory guide`}>
      <div className="rounded-[1.7rem] bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-champagne/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne">
          <Sparkles className="h-4 w-4" /> Country service guide
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Find service providers across {countryName}</h2>
        <p className="mt-4 text-sm leading-7 text-muted md:text-base">
          Start with {countryName}, then narrow your search by city, category, rating, reviews, service details, prices, availability and contact methods. This helps you compare local experts before you call, message, request a booking or hire.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "Compare providers across major cities before choosing the best local match.",
            "Open city pages when you want nearby professionals serving a specific location.",
            "Use category pages to compare providers with the same service focus.",
            `${adultCount} adult categor${adultCount === 1 ? "y is" : "ies are"} age-restricted and separated from standard services.`
          ].map((point) => (
            <p key={point} className="flex gap-3 rounded-2xl bg-cloud p-4 text-sm leading-6 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {point}
            </p>
          ))}
        </div>
      </div>
      <div className="rounded-[1.7rem] bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-ink"><MapPin className="h-6 w-6 text-champagne" /> Active city and service paths</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {cityLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm ring-1 ring-slate-200 transition hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {standardCategories.map((category) => (
            <Link key={category.slug} href={`/${category.slug}`} className="rounded-full bg-cloud px-4 py-2 text-sm font-semibold text-muted transition hover:text-ink">
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

function GlobalCategorySeoSection({
  category,
  listings,
  activeCityPaths,
  faq
}: {
  category: Category;
  listings: Awaited<ReturnType<typeof getPublicProfiles>>;
  activeCityPaths: Awaited<ReturnType<typeof getActiveCityPaths>>;
  faq: ReturnType<typeof globalCategoryFaq>;
}) {
  const content = getCategorySearchContent(category);
  const cityLinks = globalCategoryCityLinks(category, listings, activeCityPaths);

  return (
    <section className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]" aria-label={`${category.name} category guide`}>
      <div className="rounded-[1.7rem] bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-champagne/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne">
          <ShieldCheck className="h-4 w-4" /> Category hiring guide
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">About {category.name} listings</h2>
        <p className="mt-4 text-sm leading-7 text-muted md:text-base">
          {content.summary.replaceAll("{category}", category.name).replaceAll("{city}", "local city pages").replaceAll("{country}", "supported countries")}
        </p>
        {category.isAdult ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-200">
            This is an 18+ category. Content is age-restricted, moderated and intended only for adults and legal services.
          </p>
        ) : null}
        <div className="mt-5 grid gap-3">
          {content.compare.map((point) => (
            <p key={point} className="flex gap-3 rounded-2xl bg-cloud p-4 text-sm leading-6 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {point.replaceAll("{category}", category.name)}
            </p>
          ))}
        </div>
      </div>
      <div className="rounded-[1.7rem] bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-ink"><HelpCircle className="h-6 w-6 text-champagne" /> Local {category.name} pages</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Open a city page when you want the strongest local intent instead of a broad global category list.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {cityLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm ring-1 ring-slate-200 transition hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-cloud p-4">
          <p className="text-sm font-semibold text-ink">Searches this category supports</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {content.longTail.map((term) => (
              <span key={term} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-slate-200">
                {category.name} {term}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-cloud p-4">
          <p className="text-sm font-semibold text-ink">Questions before contacting providers</p>
          <div className="mt-3 grid gap-3">
            {faq.map((item) => (
              <details key={item.question} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <summary className="cursor-pointer text-sm font-semibold text-ink">{item.question}</summary>
                <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
