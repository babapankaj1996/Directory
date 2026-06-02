"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCitiesForCountry, publicCountries } from "@/lib/data";
import { getApiBase } from "@/lib/profiles";

export type ActiveCountryOption = {
  code: string;
  name: string;
};

export type ActiveCityOption = {
  country: string;
  slug: string;
  name: string;
};

function fallbackCountries(): ActiveCountryOption[] {
  return publicCountries.map((country) => ({ code: country.code, name: country.name }));
}

function fallbackCities(countryCode: string): ActiveCityOption[] {
  return getCitiesForCountry(countryCode).map((city) => ({
    country: city.country,
    slug: city.slug,
    name: city.name
  }));
}

function normalizeCountry(value: Record<string, unknown>): ActiveCountryOption | undefined {
  const code = String(value.code || "").toLowerCase();
  const name = String(value.name || "");
  if (!code || !name) return undefined;
  return { code, name };
}

function normalizeCity(value: Record<string, unknown>): ActiveCityOption | undefined {
  const slug = String(value.slug || "");
  const country = String(value.countryCode || value.country || "").toLowerCase();
  const name = String(value.name || "");
  if (!slug || !country || !name) return undefined;
  return { country, slug, name };
}

async function fetchActiveCountries() {
  const response = await fetch(`${getApiBase()}/api/countries?status=ACTIVE`, { cache: "no-store" });
  if (!response.ok) return undefined;
  const payload = await response.json() as { data?: Record<string, unknown>[] };
  return Array.isArray(payload.data)
    ? payload.data.map(normalizeCountry).filter(Boolean) as ActiveCountryOption[]
    : undefined;
}

async function fetchActiveCities(countryCode: string) {
  const perPage = 500;
  const first = await fetch(`${getApiBase()}/api/cities?countryCode=${encodeURIComponent(countryCode)}&status=ACTIVE&limit=${perPage}&page=1`, { cache: "no-store" });
  if (!first.ok) return undefined;
  const firstPayload = await first.json() as { data?: Record<string, unknown>[]; meta?: { totalPages?: number } };
  const rows = Array.isArray(firstPayload.data) ? [...firstPayload.data] : [];
  const totalPages = Math.max(Number(firstPayload.meta?.totalPages || 1), 1);

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetch(`${getApiBase()}/api/cities?countryCode=${encodeURIComponent(countryCode)}&status=ACTIVE&limit=${perPage}&page=${page}`, { cache: "no-store" });
    if (!response.ok) break;
    const payload = await response.json() as { data?: Record<string, unknown>[] };
    if (Array.isArray(payload.data)) rows.push(...payload.data);
  }

  return rows.map(normalizeCity).filter(Boolean) as ActiveCityOption[];
}

export function useActiveCountries() {
  const [countries, setCountries] = useState<ActiveCountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchActiveCountries()
      .then((items) => {
        if (mounted) setCountries(items ?? fallbackCountries());
      })
      .catch(() => {
        if (mounted) setCountries(fallbackCountries());
      })
      .finally(() => {
        if (mounted) setLoadingCountries(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { countries, loadingCountries };
}

export function useActiveLocationOptions(countryCode?: string) {
  const { countries, loadingCountries } = useActiveCountries();
  const [cities, setCities] = useState<ActiveCityOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(Boolean(countryCode));
  const requestId = useRef(0);

  const refreshCities = useCallback((code?: string) => {
    const normalized = String(code || "").toLowerCase();
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    if (!normalized) {
      setCities([]);
      setLoadingCities(false);
      return;
    }

    setCities([]);
    setLoadingCities(true);
    fetchActiveCities(normalized)
      .then((items) => {
        if (requestId.current === currentRequest) {
          setCities(items ?? fallbackCities(normalized));
        }
      })
      .catch(() => {
        if (requestId.current === currentRequest) {
          setCities(fallbackCities(normalized));
        }
      })
      .finally(() => {
        if (requestId.current === currentRequest) {
          setLoadingCities(false);
        }
      });
  }, []);

  useEffect(() => {
    refreshCities(countryCode);
  }, [countryCode, refreshCities]);

  return { countries, cities, loadingCountries, loadingCities, refreshCities };
}
