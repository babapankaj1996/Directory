import { publicCities, publicCountries } from "@/lib/data";
import { getApiBase } from "@/lib/profiles";

export type PublicCountry = {
  code: string;
  name: string;
  status?: string;
  updatedAt?: string;
};

export type PublicCity = {
  id?: string;
  slug: string;
  name: string;
  countryCode: string;
  status?: string;
  updatedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function normalizeCountry(value: unknown): PublicCountry | undefined {
  const country = asRecord(value);
  const code = typeof country.code === "string" ? country.code.toLowerCase() : "";
  if (!code) return undefined;
  return {
    code,
    name: typeof country.name === "string" ? country.name : code.toUpperCase(),
    status: typeof country.status === "string" ? country.status.toUpperCase() : undefined,
    updatedAt: typeof country.updatedAt === "string" ? country.updatedAt : undefined
  };
}

function normalizeCity(value: unknown): PublicCity | undefined {
  const city = asRecord(value);
  const slug = typeof city.slug === "string" ? city.slug : "";
  const countryCode = typeof city.countryCode === "string"
    ? city.countryCode.toLowerCase()
    : typeof city.country === "string" ? city.country.toLowerCase() : "";
  if (!slug || !countryCode) return undefined;
  return {
    id: typeof city.id === "string" ? city.id : undefined,
    slug,
    name: typeof city.name === "string" ? city.name : slug,
    countryCode,
    status: typeof city.status === "string" ? city.status.toUpperCase() : undefined,
    updatedAt: typeof city.updatedAt === "string" ? city.updatedAt : undefined
  };
}

async function apiList(path: string): Promise<unknown[] | undefined> {
  try {
    // Country and city lists are public and change rarely; see
    // PUBLIC_READ_REVALIDATE_SECONDS in lib/profiles.ts for the rationale.
    const response = await fetch(`${getApiBase()}${path}`, { next: { revalidate: 300 } });
    if (!response.ok) return undefined;
    const payload = await response.json() as { data?: unknown };
    return Array.isArray(payload.data) ? payload.data : undefined;
  } catch {
    return undefined;
  }
}

function fallbackCountries() {
  return publicCountries.map((country) => ({ ...country, status: "ACTIVE" }));
}

function fallbackCities(countryCode: string) {
  return publicCities
    .filter((city) => city.country === countryCode)
    .map((city) => ({
      slug: city.slug,
      name: city.name,
      countryCode: city.country,
      status: "ACTIVE"
    }));
}

export async function getActiveCountries() {
  const payload = await apiList("/api/countries?status=ACTIVE");
  if (!payload) return fallbackCountries();
  return payload.map(normalizeCountry).filter(Boolean) as PublicCountry[];
}

export async function getActiveCountry(code: string) {
  const normalizedCode = code.toLowerCase();
  const countries = await getActiveCountries();
  return countries.find((country) => country.code === normalizedCode);
}

export async function getActiveCitiesForCountry(countryCode: string) {
  const normalizedCode = countryCode.toLowerCase();
  const payload = await apiList(`/api/cities?countryCode=${encodeURIComponent(normalizedCode)}&status=ACTIVE&limit=500`);
  if (!payload) return fallbackCities(normalizedCode);
  return payload.map(normalizeCity).filter(Boolean) as PublicCity[];
}

export async function getActiveCity(countryCode: string, citySlug: string) {
  const normalizedCode = countryCode.toLowerCase();
  const normalizedSlug = citySlug.toLowerCase();
  const payload = await apiList(`/api/cities?countryCode=${encodeURIComponent(normalizedCode)}&status=ACTIVE&search=${encodeURIComponent(normalizedSlug)}&limit=50`);
  const city = payload
    ?.map(normalizeCity)
    .filter(Boolean)
    .find((item) => item?.countryCode === normalizedCode && item.slug === normalizedSlug);
  if (city) return city;

  if (payload) return undefined;
  return fallbackCities(normalizedCode).find((item) => item.slug === normalizedSlug);
}

export async function getActiveLocation(countryCode: string, citySlug: string) {
  const [country, city] = await Promise.all([
    getActiveCountry(countryCode),
    getActiveCity(countryCode, citySlug)
  ]);
  if (!country || !city) return undefined;
  return { country, city };
}
