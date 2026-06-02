"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, MapPin, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
import {
  categories,
  getCategory,
  getListingsByCategory,
  isFeaturedActive,
  isIdVerifiedListing,
  type Category,
  type Listing
} from "@/lib/data";
import { buildCategorySeoContent, type CategorySeoContent } from "@/lib/category-seo";
import { ListingCard } from "@/components/listing-card";
import { PageHeading } from "@/components/page-heading";
import { GlassCard } from "@/components/ui/glass-card";
import { formatRouteName } from "@/lib/utils";
import { useActiveLocationOptions } from "@/lib/use-active-locations";

const perPage = 20;

const searchSynonyms: Record<string, string[]> = {
  astrologer: ["astrology", "jyotish", "vastu", "kundli", "palmist"],
  doctors: ["doctor", "clinic", "wellness", "medical", "physician"],
  lawyers: ["lawyer", "advocate", "legal", "court"],
  "home-tutors": ["teacher", "tuition", "classes", "education"],
  "makeup-artists": ["makeup", "bridal", "beauty", "artist"],
  photographers: ["photo", "photography", "shoot", "wedding"],
  "fitness-trainers": ["trainer", "fitness", "gym", "yoga", "coach"],
  "real-estate-agents": ["property", "realtor", "broker", "homes"],
  "financial-advisors": ["finance", "tax", "investment", "insurance"],
  "web-designers": ["website", "design", "ui", "developer"],
  "digital-marketers": ["seo", "ads", "marketing", "leads"],
  electricians: ["electrician", "electric", "wiring", "repair"],
  plumbers: ["plumber", "plumbing", "leak", "repair"],
  "car-mechanics": ["car", "garage", "auto", "mechanic"],
  "female-escorts": ["escort", "companion", "female companion"],
  "male-escorts": ["escort", "companion", "male companion"],
  "trans-escorts": ["escort", "companion", "trans companion"],
  "rent-a-girlfriend": ["girlfriend", "date", "companion", "public outing"],
  "rent-a-boyfriend": ["boyfriend", "date", "companion", "public outing"],
  "massage-services": ["massage", "wellness", "bodywork"],
  "new-york": ["nyc", "manhattan", "new york city"],
  delhi: ["new delhi", "delhi ncr"],
  gurugram: ["gurgaon"]
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function distance(a: string, b: string) {
  if (!a || !b) return Math.max(a.length, b.length);
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function tokenMatches(token: string, text: string) {
  if (text.includes(token)) return true;
  const expanded = Object.entries(searchSynonyms).some(([key, aliases]) => (key === token || aliases.includes(token)) && aliases.some((alias) => text.includes(alias)));
  if (expanded) return true;
  return text.split(/\s+/).some((word) => word.length > 3 && token.length > 3 && distance(token, word) <= 1);
}

export function CategoryListingPage({
  country,
  city,
  categorySlug,
  initialListings,
  initialSearch = "",
  initialRotationMinute,
  initialPage = 1,
  categoryData,
  seoContent,
  categoryOptions
}: {
  country: string;
  city: string;
  categorySlug: string;
  initialListings?: Listing[];
  initialSearch?: string;
  initialRotationMinute: number;
  initialPage?: number;
  categoryData?: Category;
  seoContent?: CategorySeoContent;
  categoryOptions?: Category[];
}) {
  const router = useRouter();
  const category = categoryData || getCategory(categorySlug)!;
  const baseResults = initialListings ?? getListingsByCategory(country, city, categorySlug);
  const placementPath = `/${country}/${city}/${categorySlug}`;
  const selectableCategories = categoryOptions || categories;
  const seo = seoContent || buildCategorySeoContent({ country, city, category, categoryOptions: selectableCategories, listings: baseResults });
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [selectedCity, setSelectedCity] = useState(city);
  const [selectedCategory, setSelectedCategory] = useState(categorySlug);
  const [search, setSearch] = useState(initialSearch);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rotationMinute, setRotationMinute] = useState(initialRotationMinute);
  const [page, setPage] = useState(initialPage);
  const { countries, cities: selectedCityOptions, loadingCountries, loadingCities } = useActiveLocationOptions(selectedCountry);
  const selectedCountryName = countries.find((item) => item.code === selectedCountry)?.name || selectedCountry.toUpperCase();
  const selectedCityName = selectedCityOptions.find((item) => item.slug === selectedCity)?.name || formatRouteName(selectedCity);
  const selectedCategoryName = selectableCategories.find((item) => item.slug === selectedCategory)?.name || formatRouteName(selectedCategory);
  const filterSummary = [
    search.trim() || undefined,
    selectedCountryName,
    selectedCityName,
    selectedCategoryName,
    featuredOnly ? "Featured" : undefined,
    verifiedOnly ? "Verified" : undefined
  ].filter(Boolean).join(" / ");

  useEffect(() => {
    function syncRotationMinute() {
      setRotationMinute(Math.floor(Date.now() / 60000));
    }

    syncRotationMinute();
    const interval = window.setInterval(syncRotationMinute, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (loadingCountries) return;
    if (!countries.length) return;
    if (!countries.some((item) => item.code === selectedCountry)) {
      setSelectedCountry(countries[0].code);
      setSelectedCity("");
    }
  }, [countries, loadingCountries, selectedCountry]);

  useEffect(() => {
    if (!selectedCountry || loadingCities) return;
    if (!selectedCityOptions.length) {
      setSelectedCity("");
      return;
    }
    if (!selectedCityOptions.some((item) => item.slug === selectedCity)) {
      setSelectedCity(selectedCityOptions[0].slug);
    }
  }, [loadingCities, selectedCity, selectedCityOptions, selectedCountry]);

  const results = useMemo(() => {
    const tokens = normalize(search).split(/\s+/).filter(Boolean);
    const filtered = baseResults.filter((listing) => {
      const text = [
        listing.name,
        listing.ownerName,
        listing.category,
        listing.cityName,
        listing.location,
        listing.address,
        listing.email,
        listing.phone,
        listing.website,
        listing.about,
        listing.services.join(" ")
      ].join(" ").toLowerCase();

      const searchMatch = tokens.every((token) => tokenMatches(token, text));
      const featuredMatch = !featuredOnly || isFeaturedActive(listing, Date.now(), placementPath);
      const verifiedMatch = !verifiedOnly || isIdVerifiedListing(listing);
      return searchMatch && featuredMatch && verifiedMatch;
    });

    const featuredListings = rotateListings(
      filtered
        .filter((listing) => isFeaturedActive(listing, Date.now(), placementPath))
        .sort((a, b) => listingTime(b) - listingTime(a)),
      rotationMinute
    );
    const normalListings = filtered
      .filter((listing) => !isFeaturedActive(listing, Date.now(), placementPath))
      .sort((a, b) => listingTime(b) - listingTime(a));

    return [...featuredListings, ...normalListings];
  }, [baseResults, featuredOnly, placementPath, rotationMinute, search, verifiedOnly]);

  const hasFilters = Boolean(search.trim() || featuredOnly || verifiedOnly || selectedCountry !== country || selectedCity !== city || selectedCategory !== categorySlug);
  const featuredCount = results.filter((listing) => isFeaturedActive(listing, Date.now(), placementPath)).length;
  const normalCount = results.length - featuredCount;
  const totalPages = Math.max(Math.ceil(results.length / perPage), 1);
  const safePage = Math.min(page, totalPages);
  const visibleResults = results.slice((safePage - 1) * perPage, safePage * perPage);
  const showSeoContent = safePage === 1 && !hasFilters;

  function clearFilters() {
    setSearch("");
    setSelectedCountry(country);
    setSelectedCity(city);
    setSelectedCategory(categorySlug);
    setFeaturedOnly(false);
    setVerifiedOnly(false);
    setPage(1);
    if (initialSearch) {
      router.push(`/${country}/${city}/${categorySlug}`);
    }
  }

  function openSelectedUrl() {
    if (!selectedCountry || !selectedCity || !selectedCategory) return;
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    router.push(`/${selectedCountry}/${selectedCity}/${selectedCategory}${query}`);
  }

  function pageHref(targetPage: number) {
    return targetPage <= 1 ? `/${country}/${city}/${categorySlug}` : `/${country}/${city}/${categorySlug}/page/${targetPage}`;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <PageHeading
        eyebrow={`${formatRouteName(city)}, ${country.toUpperCase()}`}
        title={seo.primaryKeyword}
        description={seo.heroDescription || category.description}
      />
      <GlassCard className="mt-9">
        <button
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
          aria-expanded={filtersOpen}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-200 md:hidden"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Search className="h-4 w-4 shrink-0 text-champagne" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{filterSummary}</span>
              <span className="block text-xs font-semibold text-muted">{results.length} approved result{results.length === 1 ? "" : "s"}</span>
            </span>
          </span>
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" />
        </button>

        <div className={`${filtersOpen ? "mt-4 grid" : "hidden"} gap-4 md:mt-0 md:grid xl:grid-cols-[minmax(0,1.35fr)_1fr_1fr_1fr_auto] xl:items-end`}>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">Search</span>
            <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-champagne" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openSelectedUrl();
                }}
                className="w-full bg-transparent text-ink outline-none placeholder:text-muted/70"
                placeholder="Service, provider, speciality or area"
              />
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">Country</span>
            <select
              value={selectedCountry}
              onChange={(event) => {
                const nextCountry = event.target.value;
                setSelectedCountry(nextCountry);
                setSelectedCity("");
              }}
              disabled={loadingCountries}
              className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">City</span>
            <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
              {selectedCityOptions.length === 0 ? <option value="">{loadingCities ? "Loading cities..." : "No active cities"}</option> : null}
              {selectedCityOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">Category</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
              {selectableCategories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={openSelectedUrl} disabled={!selectedCountry || !selectedCity || !selectedCategory} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass disabled:cursor-not-allowed disabled:opacity-50">
            Open URL
          </button>
        </div>

        <div className={`${filtersOpen ? "mt-4 flex" : "hidden"} flex-col justify-between gap-3 md:flex md:flex-row md:items-center`}>
          <p className="text-sm font-semibold text-muted">
            Showing {results.length} of {baseResults.length} approved result{baseResults.length === 1 ? "" : "s"} in the selected scope.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted">
            <label className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3">
              <input type="checkbox" checked={featuredOnly} onChange={(event) => {
                setFeaturedOnly(event.target.checked);
                setPage(1);
              }} /> Featured only
            </label>
            <label className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3">
              <input type="checkbox" checked={verifiedOnly} onChange={(event) => {
                setVerifiedOnly(event.target.checked);
                setPage(1);
              }} /> Verified only
            </label>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-ink shadow-sm ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>
      </GlassCard>

      <section className="py-10">
        <div>
          <div className="mb-5 flex flex-col justify-between gap-3 rounded-3xl bg-white/50 p-4 text-sm text-muted md:flex-row md:items-center">
            <span>{visibleResults.length} of {results.length} approved results on page {safePage} of {totalPages}</span>
            <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-muted ring-1 ring-slate-200">
              {featuredCount} featured provider{featuredCount === 1 ? "" : "s"} shown first, {normalCount} recent approval{normalCount === 1 ? "" : "s"} below
            </span>
          </div>
          <h2 className="mb-5 text-2xl font-semibold tracking-tight text-ink">Featured providers and recently approved {category.name.toLowerCase()}</h2>
          <div className="grid gap-5">
            {visibleResults.map((listing, index) => <ListingCard key={listing.slug} listing={listing} horizontal featuredContact priority={index < 2} placementPath={placementPath} />)}
            {results.length === 0 && (
              <GlassCard>
                <h3 className="text-xl font-semibold text-ink">No approved listings found</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Pending, rejected and suspended listings are hidden from public category pages until an admin approves them.</p>
              </GlassCard>
            )}
          </div>
        </div>
        <nav className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row" aria-label={`${category.name} pagination`}>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={safePage <= 1}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${safePage <= 1 ? "cursor-not-allowed bg-cloud text-muted" : "bg-ink text-white"}`}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
          ) : (
            <Link
              href={pageHref(safePage - 1)}
              aria-disabled={safePage <= 1}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${safePage <= 1 ? "pointer-events-none bg-cloud text-muted" : "bg-ink text-white"}`}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Link>
          )}
          <p className="text-sm font-semibold text-muted">Page {safePage} of {totalPages}</p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={safePage >= totalPages}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${safePage >= totalPages ? "cursor-not-allowed bg-cloud text-muted" : "bg-ink text-white"}`}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href={pageHref(safePage + 1)}
              aria-disabled={safePage >= totalPages}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${safePage >= totalPages ? "pointer-events-none bg-cloud text-muted" : "bg-ink text-white"}`}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      </section>

      {showSeoContent ? <CategorySeoSection seo={seo} isAdult={Boolean(category.isAdult)} /> : null}
    </main>
  );
}

function CategorySeoSection({ seo, isAdult }: { seo: CategorySeoContent; isAdult: boolean }) {
  return (
    <section className="pb-12" aria-label={`${seo.primaryKeyword} guide`}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_0.8fr]">
        <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-champagne/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne">
            <Sparkles className="h-4 w-4" /> Local SEO guide
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{seo.introTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-muted md:text-base">{seo.intro}</p>
          <div className="mt-5 rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-ink">{seo.intentTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-muted">{seo.intentCopy}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {seo.profileSignals.map((signal) => (
                <span key={signal} className="rounded-full bg-cloud px-3 py-1.5 text-xs font-bold text-muted">
                  {signal}
                </span>
              ))}
            </div>
          </div>
          {isAdult ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-200">
              This is an 18+ category. Public content should stay legal, age-restricted, moderated and focused on profile comparison, availability, verification and contact details.
            </p>
          ) : null}
        </div>

        <div className="rounded-[1.7rem] bg-ink p-5 text-white shadow-glass md:p-7">
          <ShieldCheck className="h-8 w-8 text-champagne" />
          <h3 className="mt-4 text-2xl font-semibold">{seo.trustTitle}</h3>
          <div className="mt-5 grid gap-3">
            {seo.trustPoints.map((point) => (
              <p key={point} className="flex gap-3 text-sm leading-6 text-white/82">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-champagne" />
                {point}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
          <h3 className="flex items-center gap-2 text-xl font-semibold text-ink"><CheckCircle2 className="h-5 w-5 text-champagne" /> {seo.compareTitle}</h3>
          <div className="mt-4 grid gap-3">
            {seo.comparePoints.map((point) => (
              <p key={point} className="text-sm leading-6 text-muted">{point}</p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
          <h3 className="flex items-center gap-2 text-xl font-semibold text-ink"><MapPin className="h-5 w-5 text-champagne" /> {seo.localTitle}</h3>
          <p className="mt-4 text-sm leading-7 text-muted">{seo.localCopy}</p>
        </div>

        <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
          <h3 className="flex items-center gap-2 text-xl font-semibold text-ink"><HelpCircle className="h-5 w-5 text-champagne" /> How online comparison works</h3>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            <p>Start with {seo.primaryKeyword}, then narrow your shortlist by verification, rating, services, gallery, rates and availability.</p>
            <p>Open profile pages to review contact options, reviews, booking notes and provider details before making a decision.</p>
            <p>Use related city and category links when you want nearby professionals or a different service type.</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
          <h3 className="text-xl font-semibold text-ink">What visitors usually compare</h3>
          <div className="mt-4 grid gap-3">
            {seo.decisionPoints.map((point) => (
              <p key={point} className="flex gap-3 text-sm leading-6 text-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {point}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
          <h3 className="text-xl font-semibold text-ink">Related searches for this page</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {seo.longTailKeywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm ring-1 ring-slate-200">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {seo.relatedCityLinks.length ? (
          <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
            <h3 className="text-xl font-semibold text-ink">Nearby city pages</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {seo.relatedCityLinks.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm ring-1 ring-slate-200 transition hover:text-ink">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {seo.relatedCategoryLinks.length ? (
          <div className="rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
            <h3 className="text-xl font-semibold text-ink">Related category pages in {seo.cityName}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {seo.relatedCategoryLinks.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm ring-1 ring-slate-200 transition hover:text-ink">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-[1.7rem] bg-white/75 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
        <h3 className="text-xl font-semibold text-ink">FAQs about {seo.primaryKeyword}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {seo.faq.map((item) => (
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

function listingTime(listing: Listing) {
  const time = listing.createdAt ? new Date(listing.createdAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function rotateListings(listings: Listing[], minute: number) {
  if (listings.length <= 1) return listings;
  const offset = Math.abs(minute) % listings.length;
  return [...listings.slice(offset), ...listings.slice(0, offset)];
}
