"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { GlassCard } from "@/components/ui/glass-card";
import { countryNames, getCitiesForCountry, isFeaturedActive, isIdVerifiedListing, publicCountries, sortByFeaturedVisibility, type Category, type Listing } from "@/lib/data";

const perPage = 20;

function includesText(listing: Listing, query: string) {
  if (!query.trim()) return true;
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const haystack = [
    listing.name,
    listing.ownerName,
    listing.category,
    listing.cityName,
    listing.location,
    listing.about,
    listing.services.join(" ")
  ].join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function numericDate(value?: string) {
  const time = value ? Date.parse(value) : 0;
  return Number.isFinite(time) ? time : 0;
}

function listingKey(listing: Listing) {
  return listing.id || `${listing.country}-${listing.city}-${listing.categorySlug}-${listing.slug}`;
}

export function CategoryListingExplorer({ category, listings, initialPage = 1 }: { category: Category; listings: Listing[]; initialPage?: number }) {
  const [country, setCountry] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(initialPage);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  const cityOptions = country === "ALL" ? [] : getCitiesForCountry(country);
  const placementPath = country !== "ALL" && city !== "ALL" ? `/${country}/${city}/${category.slug}` : `/${category.slug}`;
  const selectedCityName = cityOptions.find((item) => item.slug === city)?.name;
  const scopeLabel = selectedCityName
    ? `${selectedCityName}, ${countryNames[country] || country.toUpperCase()}`
    : country === "ALL"
      ? "all countries"
      : countryNames[country] || country.toUpperCase();

  const filteredListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      const countryMatch = country === "ALL" || listing.country === country;
      const cityMatch = city === "ALL" || listing.city === city;
      return countryMatch && cityMatch && includesText(listing, search);
    });

    return filtered.sort((first, second) => {
      if (sort === "rating") return second.rating - first.rating || second.reviews - first.reviews;
      if (sort === "views") return second.viewCount - first.viewCount;
      if (sort === "featured") return Number(isFeaturedActive(second, Date.now(), placementPath)) - Number(isFeaturedActive(first, Date.now(), placementPath)) || numericDate(second.createdAt) - numericDate(first.createdAt);
      if (sort === "verified") return Number(isIdVerifiedListing(second)) - Number(isIdVerifiedListing(first)) || numericDate(second.createdAt) - numericDate(first.createdAt);
      return numericDate(second.createdAt) - numericDate(first.createdAt);
    });
  }, [city, country, listings, placementPath, search, sort]);

  const featuredListings = useMemo(() => sortByFeaturedVisibility(filteredListings.filter((listing) => isFeaturedActive(listing, Date.now(), placementPath)), placementPath).slice(0, 3), [filteredListings, placementPath]);
  const featuredListingKeys = useMemo(() => new Set(featuredListings.map(listingKey)), [featuredListings]);
  const totalPages = Math.max(Math.ceil(filteredListings.length / perPage), 1);
  const safePage = Math.min(page, totalPages);
  const visibleListings = filteredListings
    .slice((safePage - 1) * perPage, safePage * perPage)
    .filter((listing) => !featuredListingKeys.has(listingKey(listing)));
  const localSeoHref = country !== "ALL" && city !== "ALL" ? `/${country}/${city}/${category.slug}` : undefined;
  const hasInteractiveFilters = Boolean(search.trim() || country !== "ALL" || city !== "ALL" || sort !== "latest");
  const sortLabel = sort.charAt(0).toUpperCase() + sort.slice(1);
  const filterSummary = [
    search.trim() || undefined,
    scopeLabel,
    sort !== "latest" ? sortLabel : undefined
  ].filter(Boolean).join(" / ") || "Search and filters";

  function pageHref(targetPage: number) {
    return targetPage <= 1 ? `/${category.slug}` : `/${category.slug}/page/${targetPage}`;
  }

  function resetFilters() {
    setCountry("ALL");
    setCity("ALL");
    setSearch("");
    setSort("latest");
    setPage(1);
  }

  return (
    <div>
      <GlassCard className="mb-8">
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
              <span className="block text-xs font-semibold text-muted">{filteredListings.length} matching listing{filteredListings.length === 1 ? "" : "s"}</span>
            </span>
          </span>
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" />
        </button>

        <div className={`${filtersOpen ? "mt-4 flex" : "hidden"} flex-col gap-5 md:mt-0 md:flex`}>
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-champagne ring-1 ring-slate-200">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                Filter by country, city, keyword, featured status, verification, rating or views to compare {category.name.toLowerCase()} profiles faster.
              </p>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200 transition hover:bg-cloud"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_170px]">
            <label className="relative">
              <span className="mb-2 block text-sm font-semibold text-ink">Search in this category</span>
              <Search className="pointer-events-none absolute bottom-3.5 left-4 h-4 w-4 text-muted" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={`Search ${category.name.toLowerCase()}`}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-champagne focus:ring-4 focus:ring-amber-100"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Country</span>
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setCity("ALL");
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-champagne focus:ring-4 focus:ring-amber-100"
              >
                <option value="ALL">All countries</option>
                {publicCountries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">City</span>
              <select
                value={city}
                disabled={country === "ALL"}
                onChange={(event) => {
                  setCity(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="ALL">{country === "ALL" ? "Select country first" : "All cities"}</option>
                {cityOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Sort</span>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-champagne focus:ring-4 focus:ring-amber-100"
              >
                <option value="latest">Latest</option>
                <option value="featured">Featured</option>
                <option value="verified">Verified</option>
                <option value="rating">Rating</option>
                <option value="views">Views</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200 sm:flex-row sm:items-center">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
              <MapPin className="h-4 w-4 text-champagne" />
              Showing <span className="text-ink">{filteredListings.length}</span> listing{filteredListings.length === 1 ? "" : "s"} in {scopeLabel}
            </p>
            {localSeoHref ? (
              <Link href={localSeoHref} className="inline-flex w-fit items-center justify-center rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">
                Open local SEO page
              </Link>
            ) : null}
          </div>
        </div>
      </GlassCard>

      {featuredListings.length ? (
        <section className="mb-8">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-champagne">Featured placement</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Priority {category.name.toLowerCase()} providers</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">Featured listings get priority placement while their campaign is active, then return to normal ranking automatically.</p>
          </div>
          <div className="grid gap-5">
            {featuredListings.map((listing, index) => <ListingCard key={`featured-${listing.country}-${listing.city}-${listing.slug}`} listing={listing} horizontal featuredContact priority={index === 0} placementPath={placementPath} />)}
          </div>
        </section>
      ) : null}

      {visibleListings.length ? (
        <div className="grid gap-5">
          {visibleListings.map((listing, index) => <ListingCard key={listingKey(listing)} listing={listing} horizontal featuredContact priority={!featuredListings.length && index < 2} placementPath={placementPath} />)}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="glass rounded-[2rem] p-8 text-center">
          <h2 className="text-2xl font-semibold text-ink">No matching listings</h2>
          <p className="mt-3 text-muted">Try another country, city, or search term.</p>
        </div>
      ) : null}

      <nav className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row" aria-label={`${category.name} pagination`}>
        {hasInteractiveFilters ? (
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
        {hasInteractiveFilters ? (
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
    </div>
  );
}
