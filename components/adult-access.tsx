"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { CategoryGrid } from "@/components/category-card";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { getCategoriesWithCounts, type Category, type Listing } from "@/lib/data";

const adultAccessKey = "adult-services-age-confirmed";

export function useAdultAccess() {
  const [confirmed, setConfirmed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConfirmed(window.localStorage.getItem(adultAccessKey) === "yes");
    setReady(true);
  }, []);

  function confirmAdult() {
    window.localStorage.setItem(adultAccessKey, "yes");
    setConfirmed(true);
  }

  function resetAdult() {
    window.localStorage.removeItem(adultAccessKey);
    setConfirmed(false);
  }

  return { confirmed, ready, confirmAdult, resetAdult };
}

export function AdultCategoryGate({ listings, categories, country = "in", city = "delhi" }: { listings: Listing[]; categories?: Category[]; country?: string; city?: string }) {
  const { confirmed, confirmAdult, resetAdult } = useAdultAccess();
  const adultCategories = useMemo(() => {
    if (categories) return categories.filter((category) => category.isAdult);
    return getCategoriesWithCounts(listings, { adultOnly: true });
  }, [categories, listings]);

  return (
    <GlassCard className="mt-8 border-dashed border-gold-300 bg-gold-50/40">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="eyebrow text-gold-800">18+ services</p>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink">Age-restricted service categories</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Escorts, adult companions, rent-a-date, massage and similar 18+ categories are kept separate from normal discovery. Confirm age to view these categories.
          </p>
        </div>
        {confirmed ? (
          <button type="button" onClick={resetAdult} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-stone-50">
            <X className="h-4 w-4" /> Hide 18+
          </button>
        ) : (
          <Button variant="gold" onClick={confirmAdult} className="shrink-0"><ShieldCheck className="h-4 w-4" /> I am 18+</Button>
        )}
      </div>
      {confirmed ? (
        <div className="mt-5">
          <CategoryGrid items={adultCategories} country={country} city={city} hrefForCategory={(category) => `/${category.slug}`} />
        </div>
      ) : null}
    </GlassCard>
  );
}

export function AdultPageGate({ enabled }: { enabled?: boolean }) {
  const { confirmed, ready, confirmAdult } = useAdultAccess();
  if (!enabled || !ready || confirmed) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-shade/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-800 ring-1 ring-amber-200">
          <ShieldCheck className="h-4 w-4" /> 18+ age confirmation
        </div>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink">Confirm you are 18 or older</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          This page contains age-restricted service information. Confirming does not hide the SEO page content from search engines, but it protects normal user browsing.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="gold" onClick={confirmAdult}>Yes, continue</Button>
          <Button href="/" variant="ghost">No, go back</Button>
        </div>
      </div>
    </div>
  );
}
