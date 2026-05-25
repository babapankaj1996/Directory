import type { MetadataRoute } from "next";
import { categories as fallbackCategories, getListingUrl, isFeaturedActive } from "@/lib/data";
import { getApiBase, normalizeProfile } from "@/lib/profiles";
import { siteUrl } from "@/lib/seo-schema";

type Country = { code: string; status?: string; updatedAt?: string };
type City = { slug: string; countryCode: string; status?: string; updatedAt?: string };
type Category = { slug: string; status?: string; updatedAt?: string; indexable?: boolean };

async function apiList<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${getApiBase()}${path}`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json() as { data?: unknown };
    return Array.isArray(payload.data) ? payload.data as T[] : [];
  } catch {
    return [];
  }
}

function route(url: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly", lastModified?: string | Date) {
  return {
    url: `${siteUrl()}${url}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    changeFrequency,
    priority
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [countries, cities, categories, profiles, adultProfiles] = await Promise.all([
    apiList<Country>("/api/countries?status=ACTIVE"),
    apiList<City>("/api/cities?status=ACTIVE"),
    apiList<Category>("/api/categories"),
    apiList<unknown>("/api/profiles"),
    apiList<unknown>("/api/profiles?adult=true")
  ]);

  const fallbackSitemapCategories: Category[] = fallbackCategories.map((category) => ({
    slug: category.slug,
    indexable: category.indexable
  }));
  const categorySource = categories.length ? categories : fallbackSitemapCategories;
  const activeCategories = categorySource.filter((category) => (category.status || "ACTIVE") === "ACTIVE" && category.indexable !== false);
  const listings = [...profiles, ...adultProfiles]
    .map(normalizeProfile)
    .filter((listing, index, all) => listing.status === "approved" && all.findIndex((item) => item.slug === listing.slug && item.country === listing.country && item.city === listing.city) === index);

  return [
    route("", 1, "weekly"),
    route("/listings", 0.8, "daily"),
    route("/categories", 0.75, "weekly"),
    route("/blog", 0.7, "weekly"),
    ...activeCategories.map((category) => route(`/${category.slug}`, 0.82, "daily", category.updatedAt)),
    ...countries.map((country) => route(`/${country.code}`, 0.75, "weekly", country.updatedAt)),
    ...cities.map((city) => route(`/${city.countryCode}/${city.slug}`, 0.78, "weekly", city.updatedAt)),
    ...cities.flatMap((city) => activeCategories.map((category) => route(`/${city.countryCode}/${city.slug}/${category.slug}`, 0.8, "daily", category.updatedAt))),
    ...listings.map((listing) => route(getListingUrl(listing), isFeaturedActive(listing) ? 0.95 : 0.9, "weekly", listing.updatedAt))
  ];
}
