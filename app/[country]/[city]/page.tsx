import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, HelpCircle, MapPin, ShieldCheck } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { CategoryGrid } from "@/components/category-card";
import { PageHeading } from "@/components/page-heading";
import { SearchBar } from "@/components/search-bar";
import { GlassCard } from "@/components/ui/glass-card";
import { isFeaturedActive, sortByFeaturedVisibility } from "@/lib/data";
import { buildCitySeoContent, type CitySeoContent } from "@/lib/city-seo";
import { getActiveLocation } from "@/lib/locations";
import { getPublicCategories, getPublicProfiles, withCategoryCounts } from "@/lib/profiles";
import { breadcrumbJsonLd, cityCollectionJsonLd, faqJsonLd } from "@/lib/seo-schema";
import { formatRouteName } from "@/lib/utils";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ country: string; city: string }>;
  searchParams?: Promise<{ search?: string }>;
}): Promise<Metadata> {
  const { country, city } = await params;
  const query: { search?: string } = searchParams ? await searchParams : {};
  const path = `/${country}/${city}`;
  const [listings, categories] = await Promise.all([
    getPublicProfiles({ country, city, placementPath: path }),
    getPublicCategories({ includeAdult: true })
  ]);
  const seo = buildCitySeoContent({ country, city, listings, categories });
  return {
    title: seo.title,
    description: seo.description,
    keywords: [
      `services in ${seo.cityName}`,
      `verified providers ${seo.cityName}`,
      `${seo.cityName} directory`,
      `local services ${seo.cityName}`
    ],
    alternates: { canonical: path },
    openGraph: { title: seo.title, description: seo.description, url: path, type: "website" },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
    // Every city in the world is browsable, so a city page can legitimately be
    // reached with nothing on it yet. Those must not be indexed: a mass of
    // empty pages is read as thin content and drags the whole site down. Links
    // are still followed so the crawler can reach anything that appears later.
    robots:
      query.search?.trim() || listings.length === 0
        ? { index: false, follow: true, noarchive: true }
        : { index: true, follow: true }
  };
}

export default async function CityPage({
  params,
  searchParams
}: {
  params: Promise<{ country: string; city: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { country, city } = await params;
  const location = await getActiveLocation(country, city);
  if (!location) notFound();
  const { search } = await searchParams;
  const path = `/${country}/${city}`;
  const [allCityListings, results, activeCategories] = await Promise.all([
    getPublicProfiles({ country, city, placementPath: path }),
    getPublicProfiles({ country, city, search, placementPath: path }),
    getPublicCategories({ includeAdult: true })
  ]);
  const featuredListings = sortByFeaturedVisibility(allCityListings.filter((listing) => isFeaturedActive(listing, Date.now(), path)), path).slice(0, 3);
  const featuredListingKeys = new Set(featuredListings.map(listingKey));
  const normalResults = results.filter((listing) => !featuredListingKeys.has(listingKey(listing)));
  const seo = buildCitySeoContent({ country, city, listings: allCityListings, categories: activeCategories });
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: country.toUpperCase(), path: `/${country}` },
      { name: seo.cityName, path }
    ]),
    cityCollectionJsonLd(path, seo, allCityListings),
    faqJsonLd(seo.faq)
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd data={jsonLd} />
      <PageHeading eyebrow="City directory" title={seo.heading} description={seo.description} />
      <div className="mx-auto mt-9 max-w-5xl"><SearchBar categoryOptions={activeCategories} /></div>
      <CitySeoIntro seo={seo} />
      <section className="mt-14">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">City categories</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Compare professionals by service category</h2>
        </div>
        <CategoryGrid items={withCategoryCounts(activeCategories, allCityListings)} country={country} city={city} />
      </section>
      {featuredListings.length ? (
        <section className="mt-14">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">Featured placement</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Featured and highlighted providers in {formatRouteName(city)}</h2>
          </div>
          <div className="grid gap-5">
            {featuredListings.map((listing, index) => <ListingCard key={`featured-${listing.slug}`} listing={listing} horizontal featuredContact priority={index === 0} placementPath={path} />)}
          </div>
        </section>
      ) : null}
      {normalResults.length || results.length === 0 ? (
        <section className="mt-14">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">Latest profiles</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{search ? `Search results for "${search}"` : `Recently approved professionals in ${formatRouteName(city)}`}</h2>
          </div>
          <div className="grid gap-5">
            {normalResults.map((listing, index) => <ListingCard key={listingKey(listing)} listing={listing} horizontal featuredContact priority={!featuredListings.length && index < 2} placementPath={path} />)}
          </div>
          {results.length === 0 ? (
            <GlassCard className="mt-5">
              <h3 className="text-xl font-semibold text-ink">No approved listings found</h3>
              <p className="mt-2 text-sm text-muted">Try another search term or choose a specific category.</p>
            </GlassCard>
          ) : null}
        </section>
      ) : null}
      <CitySeoSection seo={seo} />
    </main>
  );
}

function listingKey(listing: { id?: string; country: string; city: string; categorySlug: string; slug: string }) {
  return listing.id || `${listing.country}-${listing.city}-${listing.categorySlug}-${listing.slug}`;
}

function CitySeoIntro({ seo }: { seo: CitySeoContent }) {
  return (
    <section className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_0.8fr]">
      <GlassCard>
        <h2 className="text-2xl font-semibold text-ink">Find local providers in {seo.cityName}</h2>
        <p className="mt-3 text-sm leading-7 text-muted md:text-base">{seo.intro}</p>
      </GlassCard>
      <div className="rounded-[1.7rem] bg-ink p-5 text-white shadow-glass md:p-6">
        <ShieldCheck className="h-8 w-8 text-champagne" />
        <h3 className="mt-4 text-xl font-semibold">City page trust signals</h3>
        <div className="mt-4 grid gap-3">
          {seo.trustPoints.slice(0, 3).map((point) => (
            <p key={point} className="flex gap-3 text-sm leading-6 text-white/82">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-champagne" />
              {point}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function CitySeoSection({ seo }: { seo: CitySeoContent }) {
  return (
    <section className="mt-14 grid gap-5 lg:grid-cols-2" aria-label={`${seo.cityName} SEO guide`}>
      <GlassCard>
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-ink"><MapPin className="h-6 w-6 text-champagne" /> Popular category pages in {seo.cityName}</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {seo.categoryLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm ring-1 ring-slate-200 transition hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-cloud p-4">
          <h3 className="text-lg font-semibold text-ink">{seo.searchTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-muted">{seo.searchCopy}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {seo.localSearches.map((keyword) => (
              <span key={keyword} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-slate-200">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </GlassCard>
      <GlassCard>
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-ink"><HelpCircle className="h-6 w-6 text-champagne" /> FAQs about services in {seo.cityName}</h2>
        <div className="mt-5 grid gap-3 rounded-2xl bg-cloud p-4">
          {seo.qualityChecks.map((item) => (
            <p key={item} className="flex gap-3 text-sm leading-6 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {item}
            </p>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {seo.faq.map((item) => (
            <details key={item.question} className="rounded-2xl bg-cloud px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{item.question}</summary>
              <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}
