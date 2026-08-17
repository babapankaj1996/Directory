import { useEffect, useState } from "react";
import { getApiBase } from "@/lib/profiles";

export type CityOption = { slug: string; name: string; country: string };

/**
 * Search cities for a country, across every status.
 *
 * The directory holds every city in the world, so an owner registering a
 * business needs to find theirs by typing rather than by scrolling a list, and
 * the list cannot be loaded up front — one large country alone runs to tens of
 * thousands of rows. Public filters keep using the ACTIVE-only hook, because
 * there it should only be possible to filter by places that have listings.
 */
export function useCitySearch(countryCode: string | undefined, query: string) {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    // Debounced: typing a city name should not fire a request per keystroke.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ countryCode, status: "ALL", limit: "60" });
        if (query.trim()) params.set("search", query.trim());
        const response = await fetch(`${getApiBase()}/api/cities?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("city lookup failed");
        const payload = (await response.json()) as { data?: { slug?: string; name?: string; countryCode?: string }[] };
        if (cancelled) return;
        setCities(
          (payload.data || [])
            .map((row) => ({ slug: String(row.slug || ""), name: String(row.name || ""), country: String(row.countryCode || "") }))
            .filter((row) => row.slug && row.name)
        );
      } catch {
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query.trim() ? 220 : 0);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [countryCode, query]);

  return { cities, loading };
}

export type CountryOption = { code: string; name: string };

/**
 * Every country, regardless of status.
 *
 * Same reasoning as the city search: an owner registering a business must be
 * able to pick a country that has no listings yet. There are only ~250, so
 * unlike cities this list can be loaded in one request.
 */
export function useAllCountries() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiBase()}/api/countries?status=ALL`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("country lookup failed"))))
      .then((payload: { data?: { code?: string; name?: string }[] }) => {
        if (cancelled) return;
        setCountries(
          (payload.data || [])
            .map((row) => ({ code: String(row.code || ""), name: String(row.name || "") }))
            .filter((row) => row.code && row.name)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      })
      .catch(() => !cancelled && setCountries([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { countries, loading };
}
