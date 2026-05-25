type CleanListingsFilters = {
  search?: string;
  country?: string;
  city?: string;
  category?: string;
  featured?: boolean;
};

function clean(value?: string) {
  return String(value || "").trim().toLowerCase();
}

export function cleanListingsRouteForFilters(filters: CleanListingsFilters) {
  const search = String(filters.search || "").trim();
  const country = clean(filters.country);
  const city = clean(filters.city);
  const category = clean(filters.category);

  if (search || filters.featured) return null;
  if (country && city && category) return `/${country}/${city}/${category}`;
  if (country && city && !category) return `/${country}/${city}`;
  if (country && !city && !category) return `/${country}`;
  if (!country && !city && category) return `/${category}`;
  return null;
}
