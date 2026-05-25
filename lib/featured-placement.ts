import type { Listing } from "@/lib/data";

export const featuredDurations = [3, 7, 10, 15, 30] as const;

export type FeaturedPageType = "CITY_CATEGORY" | "CITY" | "CATEGORY" | "COUNTRY" | "HOME";

export type FeaturedPlacementDuration = {
  days: number;
  priceAmount: number;
  currency: string;
  custom?: boolean;
};

export type FeaturedPlacementOption = {
  pageType: FeaturedPageType;
  scopeKey: string;
  pagePath: string;
  label: string;
  description?: string;
  countryId?: string;
  citySlug?: string;
  categoryId?: string;
  durations: FeaturedPlacementDuration[];
};

export function formatMoney(amount?: number, currency = "INR") {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "-";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

export function featuredPageTypeLabel(value?: string) {
  if (value === "HOME") return "Home page";
  if (value === "COUNTRY") return "Country page";
  if (value === "CITY") return "City page";
  if (value === "CATEGORY") return "Category page";
  if (value === "CITY_CATEGORY") return "City/category page";
  if (value === "LISTINGS") return "All listings";
  return "City/category page";
}

export function fallbackPlacementOptions(listing: Listing): FeaturedPlacementOption[] {
  const country = listing.country;
  const city = listing.city;
  const category = listing.categorySlug;
  const cityName = listing.cityName || city;
  const categoryName = listing.category || category;
  const defaults: Record<FeaturedPageType, Record<number, number>> = {
    CITY_CATEGORY: { 3: 299, 7: 599, 10: 799, 15: 1099, 30: 1999 },
    CITY: { 3: 399, 7: 799, 10: 1099, 15: 1599, 30: 2799 },
    CATEGORY: { 3: 499, 7: 999, 10: 1399, 15: 1999, 30: 3499 },
    COUNTRY: { 3: 799, 7: 1499, 10: 1999, 15: 2999, 30: 5499 },
    HOME: { 3: 1499, 7: 2999, 10: 3999, 15: 5499, 30: 9999 }
  };
  const seed = [
    { pageType: "CITY_CATEGORY" as const, scopeKey: `CITY_CATEGORY:${country}/${city}/${category}`, pagePath: `/${country}/${city}/${category}`, label: `${categoryName} in ${cityName}`, description: "Exact city and category page." },
    { pageType: "CITY" as const, scopeKey: `CITY:${country}/${city}`, pagePath: `/${country}/${city}`, label: `${cityName} city page`, description: "All categories in this city." },
    { pageType: "CATEGORY" as const, scopeKey: `CATEGORY:${category}`, pagePath: `/${category}`, label: `All ${categoryName} category page`, description: "Category-wide page across cities." },
    { pageType: "COUNTRY" as const, scopeKey: `COUNTRY:${country}`, pagePath: `/${country}`, label: `${country.toUpperCase()} country page`, description: "Country directory page." },
    { pageType: "HOME" as const, scopeKey: "HOME", pagePath: "/", label: "Home page", description: "Highest visibility placement." }
  ];

  return seed.map((option) => ({
    ...option,
    countryId: country,
    citySlug: city,
    categoryId: category,
    durations: featuredDurations.map((days) => ({
      days,
      priceAmount: defaults[option.pageType][days],
      currency: "INR"
    }))
  }));
}
