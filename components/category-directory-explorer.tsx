"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryGrid } from "@/components/category-card";
import { GlassCard } from "@/components/ui/glass-card";
import {
  categories as fallbackCategories,
  type Category,
  type Listing
} from "@/lib/data";
import { useActiveLocationOptions } from "@/lib/use-active-locations";

export function CategoryDirectoryExplorer({ listings, categories = fallbackCategories }: { listings: Listing[]; categories?: Category[] }) {
  const router = useRouter();
  const [country, setCountry] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const selectableCategories = categories;

  const { countries, cities: cityOptions, loadingCountries, loadingCities } = useActiveLocationOptions(country === "ALL" ? undefined : country);
  const scopedListings = useMemo(() => listings.filter((listing) => {
    const countryMatch = country === "ALL" || listing.country === country;
    const cityMatch = city === "ALL" || listing.city === city;
    const categoryMatch = category === "ALL" || listing.categorySlug === category;
    return countryMatch && cityMatch && categoryMatch;
  }), [category, city, country, listings]);

  const countedCategories = useMemo(() => {
    const scope = listings.filter((listing) => {
      const countryMatch = country === "ALL" || listing.country === country;
      const cityMatch = city === "ALL" || listing.city === city;
      return countryMatch && cityMatch;
    });
    const withCounts = selectableCategories.map((item) => ({
      ...item,
      count: scope.filter((listing) => listing.categorySlug === item.slug).length
    }));
    return category === "ALL" ? withCounts : withCounts.filter((item) => item.slug === category);
  }, [category, city, country, listings, selectableCategories]);

  function categoryHref(categorySlug: string) {
    if (country === "ALL") return `/${categorySlug}`;
    if (city === "ALL") return `/${categorySlug}`;
    return `/${country}/${city}/${categorySlug}`;
  }

  useEffect(() => {
    if (loadingCountries) return;
    if (country === "ALL") return;
    if (!countries.length || !countries.some((item) => item.code === country)) {
      setCountry("ALL");
      setCity("ALL");
    }
  }, [countries, country, loadingCountries]);

  useEffect(() => {
    if (country === "ALL" || city === "ALL" || loadingCities) return;
    if (!cityOptions.some((item) => item.slug === city)) {
      setCity("ALL");
    }
  }, [city, cityOptions, country, loadingCities]);

  function openSelectedUrl() {
    if (category !== "ALL") {
      router.push(categoryHref(category));
      return;
    }
    if (country === "ALL") {
      router.push("/categories");
      return;
    }
    if (city === "ALL") {
      router.push(`/${country}`);
      return;
    }
    router.push(`/${country}/${city}`);
  }

  return (
    <div className="mt-10">
      <GlassCard className="mb-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">Country</span>
            <select
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setCity("ALL");
              }}
              disabled={loadingCountries}
              className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="ALL">All countries</option>
              {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">City</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              disabled={country === "ALL"}
              className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="ALL">{country === "ALL" ? "Choose country first" : loadingCities ? "Loading cities..." : "All cities"}</option>
              {cityOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
              <option value="ALL">All categories</option>
              {selectableCategories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
          <button onClick={openSelectedUrl} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass">
            Browse
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold text-muted">
          Showing {scopedListings.length} approved profile{scopedListings.length === 1 ? "" : "s"} in the selected scope.
        </p>
      </GlassCard>

      {/* Category cards render an h3, so an h2 has to sit between them and the
          page h1 to keep the heading outline in order. */}
      <h2 className="sr-only">Service categories</h2>
      <CategoryGrid
        items={countedCategories}
        country={country === "ALL" ? "in" : country}
        city={city === "ALL" ? cityOptions[0]?.slug || "delhi" : city}
        hrefForCategory={(item) => categoryHref(item.slug)}
      />
    </div>
  );
}
