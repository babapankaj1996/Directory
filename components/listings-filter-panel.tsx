"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { categories as fallbackCategories, type Category } from "@/lib/data";
import { cleanListingsRouteForFilters } from "@/lib/listings-routes";
import { GlassCard } from "@/components/ui/glass-card";
import { useActiveLocationOptions } from "@/lib/use-active-locations";

export type ListingsFilters = {
  search?: string;
  country?: string;
  city?: string;
  category?: string;
  featured?: boolean;
};

export function ListingsFilterPanel({ filters, total, categories = fallbackCategories }: { filters: ListingsFilters; total: number; categories?: Category[] }) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search || "");
  const [country, setCountry] = useState(filters.country || "");
  const [city, setCity] = useState(filters.city || "");
  const [category, setCategory] = useState(filters.category || "");
  const [featured, setFeatured] = useState(Boolean(filters.featured));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { countries, cities: cityOptions, loadingCountries, loadingCities } = useActiveLocationOptions(country);
  const hasFilters = Boolean(search.trim() || country || city || category || featured);
  const selectedCountry = countries.find((item) => item.code === country)?.name;
  const selectedCity = cityOptions.find((item) => item.slug === city)?.name;
  const selectedCategory = categories.find((item) => item.slug === category)?.name;
  const filterSummary = [
    search.trim() || undefined,
    selectedCountry,
    selectedCity,
    selectedCategory,
    featured ? "Featured" : undefined
  ].filter(Boolean).join(" / ") || "Search and filters";

  useEffect(() => {
    if (loadingCountries) return;
    if (!country) return;
    if (!countries.length || !countries.some((item) => item.code === country)) {
      setCountry("");
      setCity("");
    }
  }, [countries, country, loadingCountries]);

  useEffect(() => {
    if (!country || !city || loadingCities) return;
    if (!cityOptions.some((item) => item.slug === city)) {
      setCity("");
    }
  }, [city, cityOptions, country, loadingCities]);

  function applyFilters() {
    const cleanRoute = cleanListingsRouteForFilters({ search, country, city, category, featured });
    if (cleanRoute) {
      router.push(cleanRoute);
      return;
    }
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (country) params.set("country", country);
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    if (featured) params.set("featured", "true");
    const query = params.toString();
    router.push(query ? `/listings?${query}` : "/listings");
  }

  function clearFilters() {
    setSearch("");
    setCountry("");
    setCity("");
    setCategory("");
    setFeatured(false);
    router.push("/listings");
  }

  return (
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
            <span className="block text-xs font-semibold text-muted">{total} approved listing{total === 1 ? "" : "s"}</span>
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
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              className="w-full bg-transparent text-ink outline-none placeholder:text-muted/70"
              placeholder="Service, provider, category or city"
            />
          </span>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Country</span>
          <select
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setCity("");
            }}
            disabled={loadingCountries}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">All countries</option>
            {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">City</span>
          <select
            value={city}
            disabled={!country}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{country ? loadingCities ? "Loading cities..." : "All cities" : "Choose country first"}</option>
            {cityOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
          >
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>

        <button type="button" onClick={applyFilters} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass">
          Apply
        </button>
      </div>

      <div className={`${filtersOpen ? "mt-4 flex" : "hidden"} flex-col justify-between gap-3 md:flex md:flex-row md:items-center`}>
        <p className="text-sm font-semibold text-muted">
          Showing {total} approved listing{total === 1 ? "" : "s"} in the selected scope.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted">
          <label className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3">
            <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Featured only
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
  );
}
