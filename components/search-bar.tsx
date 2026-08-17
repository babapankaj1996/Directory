"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { categories, type Category } from "@/lib/data";
import { useActiveLocationOptions } from "@/lib/use-active-locations";

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findCategory(query: string, categoryOptions = categories) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return undefined;
  return categoryOptions.find((category) => {
    const slug = normalizeText(category.slug);
    const name = normalizeText(category.name);
    const singularName = name.replace(/s$/, "");
    return normalizedQuery.includes(slug) ||
      normalizedQuery.includes(name) ||
      normalizedQuery.includes(singularName) ||
      name.includes(normalizedQuery);
  });
}

export function SearchBar({ compact = false, categoryOptions = categories }: { compact?: boolean; categoryOptions?: Category[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("in");
  const [city, setCity] = useState("delhi");
  const [category, setCategory] = useState("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { countries, cities: cityOptions, loadingCountries, loadingCities } = useActiveLocationOptions(country);
  const selectedCountry = countries.find((item) => item.code === country)?.name;
  const selectedCity = cityOptions.find((item) => item.slug === city)?.name;
  const selectedCategory = categoryOptions.find((item) => item.slug === category)?.name;
  const filterSummary = [
    query.trim() || undefined,
    selectedCountry,
    selectedCity,
    selectedCategory || "Auto category"
  ].filter(Boolean).join(" / ");

  useEffect(() => {
    if (loadingCountries) return;
    if (!countries.length) {
      if (country || city) {
        setCountry("");
        setCity("");
      }
      return;
    }
    if (!countries.some((item) => item.code === country)) {
      setCountry(countries[0].code);
      setCity("");
    }
  }, [city, countries, country, loadingCountries]);

  useEffect(() => {
    if (!country || loadingCities) return;
    if (!cityOptions.length) {
      setCity("");
      return;
    }
    if (!cityOptions.some((item) => item.slug === city)) {
      setCity(cityOptions[0].slug);
    }
  }, [city, cityOptions, country, loadingCities]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const countrySlug = countries.some((item) => item.code === country) ? country : countries[0]?.code || "";
    const citySlug = cityOptions.some((item) => item.slug === city) ? city : cityOptions[0]?.slug || "";
    if (!countrySlug || !citySlug) return;
    const categorySlug = category !== "ALL" ? category : findCategory(query, categoryOptions)?.slug;
    const searchParam = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : "";
    const path = categorySlug ? `/${countrySlug}/${citySlug}/${categorySlug}${searchParam}` : `/${countrySlug}/${citySlug}${searchParam}`;
    router.push(path);
  }

  const fieldLabel = "mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted";
  const fieldControl =
    "h-12 w-full rounded-lg border border-line bg-stone-50 px-3.5 text-sm font-medium text-ink outline-none transition-colors duration-200 hover:border-line-strong focus:border-copper-500 focus:bg-sunken focus:ring-2 focus:ring-copper-500/30 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <form
      data-ground="surface"
      onSubmit={submitSearch}
      className={`rounded-2xl border border-line bg-surface/95 backdrop-blur-xl ${compact ? "p-2 shadow-xl md:p-2.5" : "p-2.5 shadow-lg md:p-3"}`}
    >
      {/* Mobile: collapsed summary that expands into the full filter set. */}
      <button
        type="button"
        onClick={() => setFiltersOpen((current) => !current)}
        aria-expanded={filtersOpen}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3.5 text-left md:hidden"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Search className="h-4 w-4 shrink-0 text-copper-600" />
          <span className="block min-w-0 truncate text-sm font-semibold text-ink">{filterSummary}</span>
        </span>
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-muted" />
      </button>

      <div
        className={`${filtersOpen ? "mt-2.5 grid" : "hidden"} gap-2.5 md:mt-0 md:grid md:items-end ${
          compact
            ? "grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto]"
            : "md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_1fr_1fr_1fr_auto]"
        }`}
      >
        <label className={`min-w-0 ${compact ? "col-span-2 md:col-span-4" : ""}`}>
          <span className={fieldLabel}>Search</span>
          <span className="flex h-12 items-center gap-2.5 rounded-lg border border-line bg-stone-50 px-3.5 transition-colors duration-200 focus-within:border-copper-500 focus-within:bg-sunken focus-within:ring-2 focus-within:ring-copper-500/30">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-stone-400"
              placeholder="Service, provider or keyword"
            />
          </span>
        </label>

        <label className="min-w-0">
          <span className={fieldLabel}>Country</span>
          <select
            value={country}
            onChange={(event) => {
              const nextCountry = event.target.value;
              setCountry(nextCountry);
              setCity("");
            }}
            disabled={loadingCountries}
            className={fieldControl}
          >
            {countries.length === 0 ? <option value="">{loadingCountries ? "Loading countries..." : "No active countries"}</option> : null}
            {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>

        <label className="min-w-0">
          <span className={fieldLabel}>City</span>
          <select value={city} onChange={(event) => setCity(event.target.value)} className={fieldControl}>
            {cityOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            {cityOptions.length === 0 ? <option value="">{loadingCities ? "Loading cities..." : "No active cities"}</option> : null}
          </select>
        </label>

        <label className="min-w-0">
          <span className={fieldLabel}>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldControl}>
            <option value="ALL">Auto detect</option>
            {categoryOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>

        <button
          disabled={!country || !city || loadingCountries || loadingCities}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-6 text-sm font-semibold text-onaccent transition-all duration-200 ease-entrance hover:bg-stone-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
            compact ? "col-span-2 md:col-span-1" : "md:col-span-2 xl:col-span-1"
          }`}
        >
          <Search className="h-4 w-4 text-copper-400" />
          Search
        </button>
      </div>
    </form>
  );
}
