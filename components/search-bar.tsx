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

  return (
    <form onSubmit={submitSearch} className="rounded-lg bg-[linear-gradient(135deg,#22d3ee,#f59e0b_48%,#fb7185)] p-[1px] shadow-2xl shadow-cyan-950/20">
      <div className="rounded-lg bg-white/95 p-3 backdrop-blur md:p-4">
      <button
        type="button"
        onClick={() => setFiltersOpen((current) => !current)}
        aria-expanded={filtersOpen}
        className="flex w-full items-center justify-between gap-3 rounded-lg bg-cyan-50/70 px-4 py-3 text-left ring-1 ring-cyan-100 md:hidden"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Search className="h-4 w-4 shrink-0 text-aqua" />
          <span className="block min-w-0 truncate text-sm font-semibold text-ink">{filterSummary}</span>
        </span>
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-coral" />
      </button>

      <div className={`${filtersOpen ? "mt-4 grid" : "hidden"} gap-3 md:mt-0 md:grid ${compact ? "xl:grid-cols-[minmax(0,1.35fr)_1fr_1fr_1fr_auto]" : "xl:grid-cols-[minmax(0,1.35fr)_1fr_1fr_1fr_auto]"} xl:items-end`}>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Search</span>
          <span className="flex items-center gap-3 rounded-lg border border-cyan-100 bg-slate-50/80 px-4 py-3 transition focus-within:border-aqua focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-100">
            <Search className="h-4 w-4 text-aqua" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
              const nextCountry = event.target.value;
              setCountry(nextCountry);
              setCity("");
            }}
            disabled={loadingCountries}
            className="w-full rounded-lg border border-cyan-100 bg-slate-50/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-aqua focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {countries.length === 0 ? <option value="">{loadingCountries ? "Loading countries..." : "No active countries"}</option> : null}
            {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">City</span>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-lg border border-cyan-100 bg-slate-50/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-aqua focus:bg-white focus:ring-4 focus:ring-cyan-100"
          >
            {cityOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            {cityOptions.length === 0 ? <option value="">{loadingCities ? "Loading cities..." : "No active cities"}</option> : null}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg border border-cyan-100 bg-slate-50/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-aqua focus:bg-white focus:ring-4 focus:ring-cyan-100"
          >
            <option value="ALL">Auto detect</option>
            {categoryOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>

        <button disabled={!country || !city || loadingCountries || loadingCities} className="rounded-lg bg-[linear-gradient(135deg,#0b1020,#0ea5e9_55%,#f97316)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
          Search
        </button>
      </div>
      </div>
    </form>
  );
}
