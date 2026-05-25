"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { categories, getCitiesForCountry, publicCountries, resolveLocation, type Category } from "@/lib/data";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

  const cityOptions = useMemo(() => getCitiesForCountry(country), [country]);
  const selectedCountry = publicCountries.find((item) => item.code === country)?.name;
  const selectedCity = cityOptions.find((item) => item.slug === city)?.name;
  const selectedCategory = categoryOptions.find((item) => item.slug === category)?.name;
  const filterSummary = [
    query.trim() || undefined,
    selectedCountry,
    selectedCity,
    selectedCategory || "Auto category"
  ].filter(Boolean).join(" / ");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolved = resolveLocation(query, { country, city });
    const countrySlug = country || resolved.country || "in";
    const citySlug = city || resolved.city || getCitiesForCountry(countrySlug)[0]?.slug || slugify("delhi");
    const categorySlug = category !== "ALL" ? category : findCategory(query, categoryOptions)?.slug;
    const searchParam = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : "";
    const path = categorySlug ? `/${countrySlug}/${citySlug}/${categorySlug}${searchParam}` : `/${countrySlug}/${citySlug}${searchParam}`;
    router.push(path);
  }

  return (
    <form onSubmit={submitSearch} className="glass-strong rounded-[2rem] p-4 shadow-glass md:p-5">
      <button
        type="button"
        onClick={() => setFiltersOpen((current) => !current)}
        aria-expanded={filtersOpen}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-200 md:hidden"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Search className="h-4 w-4 shrink-0 text-champagne" />
          <span className="block min-w-0 truncate text-sm font-semibold text-ink">{filterSummary}</span>
        </span>
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" />
      </button>

      <div className={`${filtersOpen ? "mt-4 grid" : "hidden"} gap-4 md:mt-0 md:grid ${compact ? "xl:grid-cols-[minmax(0,1.35fr)_1fr_1fr_1fr_auto]" : "xl:grid-cols-[minmax(0,1.35fr)_1fr_1fr_1fr_auto]"} xl:items-end`}>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Search</span>
          <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Search className="h-4 w-4 text-champagne" />
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
              setCity(getCitiesForCountry(nextCountry)[0]?.slug || "");
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
          >
            {publicCountries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">City</span>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
          >
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
            <option value="ALL">Auto detect</option>
            {categoryOptions.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>

        <button className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass">
          Search
        </button>
      </div>
    </form>
  );
}
