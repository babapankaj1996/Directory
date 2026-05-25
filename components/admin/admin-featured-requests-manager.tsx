"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, IndianRupee, RotateCcw, Save, Search, Wallet, XCircle } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase, normalizeProfile } from "@/lib/profiles";
import type { FeaturedPlacementPrice, FeaturedPlacementRequest, Listing } from "@/lib/data";
import { featuredDurations, featuredPageTypeLabel, formatMoney, type FeaturedPageType } from "@/lib/featured-placement";

type AdminFeaturedRequest = FeaturedPlacementRequest & {
  profile?: Listing;
  ownerUser?: {
    id: string;
    name: string;
    email: string;
  };
  campaigns?: Array<{
    id?: string;
    status?: string;
    startsAt?: string;
    endsAt?: string;
    pagePath?: string;
  }>;
};

type CountryOption = { code: string; name: string; status?: string };
type CityOption = { slug: string; name: string; countryCode: string; status?: string };
type CategoryOption = { slug: string; name: string; status?: string };

type PriceForm = {
  pageType: FeaturedPageType;
  countryId: string;
  citySlug: string;
  categoryId: string;
  durationDays: string;
  priceAmount: string;
  currency: string;
};

const initialPriceForm: PriceForm = {
  pageType: "CITY_CATEGORY",
  countryId: "in",
  citySlug: "delhi",
  categoryId: "female-escorts",
  durationDays: "7",
  priceAmount: "599",
  currency: "INR"
};

function asRequest(value: unknown): AdminFeaturedRequest {
  const request = value as AdminFeaturedRequest & { profile?: unknown };
  return {
    ...request,
    profile: request.profile ? normalizeProfile(request.profile) : undefined,
    campaigns: Array.isArray(request.campaigns) ? request.campaigns : []
  };
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function requestTone(status?: string): "green" | "amber" | "blue" | "red" | "gray" {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") return "green";
  if (normalized === "REJECTED") return "red";
  return "amber";
}

function paymentTone(status?: string): "green" | "amber" | "blue" | "red" | "gray" {
  const normalized = String(status || "").toUpperCase();
  if (normalized.includes("PAID") || normalized.includes("CAPTURED") || normalized.includes("HOLD")) return "green";
  if (normalized.includes("REFUND")) return "blue";
  if (normalized.includes("FAILED") || normalized.includes("REJECT")) return "red";
  if (normalized.includes("ORDER") || normalized.includes("UNPAID")) return "amber";
  return "gray";
}

function paymentLabel(request: AdminFeaturedRequest) {
  const provider = request.paymentProvider || request.payment?.provider || "MANUAL";
  const status = request.paymentStatus || request.payment?.status || "UNPAID";
  return `${provider.replace(/_/g, " ")} - ${status.replace(/_/g, " ")}`;
}

function normalizeCurrency(value: string) {
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "INR";
}

function scopeKey(form: PriceForm) {
  if (form.pageType === "HOME") return "HOME";
  if (form.pageType === "COUNTRY") return `COUNTRY:${form.countryId}`;
  if (form.pageType === "CITY") return `CITY:${form.countryId}/${form.citySlug}`;
  if (form.pageType === "CATEGORY") return `CATEGORY:${form.categoryId}`;
  return `CITY_CATEGORY:${form.countryId}/${form.citySlug}/${form.categoryId}`;
}

function scopePath(form: PriceForm) {
  if (form.pageType === "HOME") return "/";
  if (form.pageType === "COUNTRY") return `/${form.countryId}`;
  if (form.pageType === "CITY") return `/${form.countryId}/${form.citySlug}`;
  if (form.pageType === "CATEGORY") return `/${form.categoryId}`;
  return `/${form.countryId}/${form.citySlug}/${form.categoryId}`;
}

export function AdminFeaturedRequestsManager() {
  const [requests, setRequests] = useState<AdminFeaturedRequest[]>([]);
  const [prices, setPrices] = useState<FeaturedPlacementPrice[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [priceForm, setPriceForm] = useState<PriceForm>(initialPriceForm);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const [requestPayload, pricePayload, countryPayload, cityPayload, categoryPayload] = await Promise.all([
      adminFetch(`${getApiBase()}/api/admin/listings/featured-requests`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      adminFetch(`${getApiBase()}/api/admin/listings/featured-prices`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      fetch(`${getApiBase()}/api/countries`, { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      fetch(`${getApiBase()}/api/cities`, { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      fetch(`${getApiBase()}/api/categories`, { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined).catch(() => undefined)
    ]);
    if (Array.isArray(requestPayload?.data)) setRequests(requestPayload.data.map(asRequest));
    if (Array.isArray(pricePayload?.data)) setPrices(pricePayload.data as FeaturedPlacementPrice[]);
    if (Array.isArray(countryPayload?.data)) setCountries(countryPayload.data as CountryOption[]);
    if (Array.isArray(cityPayload?.data)) setCities(cityPayload.data as CityOption[]);
    if (Array.isArray(categoryPayload?.data)) setCategories(categoryPayload.data as CategoryOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const activeCities = useMemo(() => cities.filter((city) => city.countryCode === priceForm.countryId), [cities, priceForm.countryId]);
  const filteredRequests = useMemo(() => {
    const token = search.toLowerCase().trim();
    return requests.filter((request) => {
      const statusMatch = statusFilter === "ALL" || request.status?.toUpperCase() === statusFilter;
      const text = [
        request.profile?.name,
        request.profile?.ownerName,
        request.profile?.ownerEmail,
        request.requestedPagePath,
        request.placementLabel,
        request.ownerUser?.email
      ].filter(Boolean).join(" ").toLowerCase();
      return statusMatch && (!token || text.includes(token));
    });
  }, [requests, search, statusFilter]);

  async function updateRequestStatus(request: AdminFeaturedRequest, status: "APPROVED" | "REJECTED") {
    const override = priceOverrides[request.id || ""];
    const response = await adminFetch(`${getApiBase()}/api/admin/listings/featured-requests/${request.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        priceAmount: override ? Number(override) : request.priceAmount,
        currency: request.currency || "INR"
      })
    });
    const payload = await response.json() as { data?: unknown; error?: string };
    if (!response.ok) {
      setNotice(payload.error || "Featured request update failed.");
      return;
    }
    setNotice(status === "APPROVED" ? "Featured campaign approved." : "Featured request rejected.");
    await load();
  }

  async function savePriceRule() {
    const response = await adminFetch(`${getApiBase()}/api/admin/listings/featured-prices`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...priceForm,
        durationDays: Number(priceForm.durationDays),
        priceAmount: Number(priceForm.priceAmount),
        currency: normalizeCurrency(priceForm.currency)
      })
    });
    const payload = await response.json() as { data?: FeaturedPlacementPrice; error?: string };
    if (!response.ok) {
      setNotice(payload.error || "Price rule could not be saved.");
      return;
    }
    setNotice(`Price rule saved for ${scopePath(priceForm)}.`);
    await load();
  }

  function updatePriceForm(patch: Partial<PriceForm>) {
    setPriceForm((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="grid gap-6">
      <AdminSectionHeader
        eyebrow="Featured revenue"
        title="Special featured requests"
        description="Approve page-scoped featured campaigns and manage pricing by city, category, country or homepage without changing public profile URLs."
      />

      {notice ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{notice}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Request queue</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Owner placement requests</h2>
            </div>
            <button onClick={() => void load()} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">
              <RotateCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search profile, owner, page or email"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All</option>
            </select>
          </div>

          <div className="mt-5 grid gap-4">
            {loading ? <Skeleton /> : null}
            {!loading && filteredRequests.length === 0 ? (
              <div className="rounded-2xl bg-cloud p-5 text-sm font-semibold text-muted">No featured placement requests found.</div>
            ) : null}
            {filteredRequests.map((request) => (
              <article key={request.id} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={requestTone(request.status)}>{request.status}</StatusPill>
                      <StatusPill tone={paymentTone(request.paymentStatus)}>
                        {(request.paymentProvider || request.payment?.provider) === "RAZORPAY" ? <CreditCard className="mr-1 inline h-3.5 w-3.5" /> : <Wallet className="mr-1 inline h-3.5 w-3.5" />}
                        {paymentLabel(request)}
                      </StatusPill>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-muted">{request.requestedDays} days</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{formatMoney(request.priceAmount, request.currency || "INR")}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-ink">
                      {request.profile ? <Link href={`/admin/listings/${request.profile.slug}`} className="hover:text-champagne">{request.profile.name}</Link> : "Profile unavailable"}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-muted">{request.placementLabel || featuredPageTypeLabel(request.requestedPage)} · {request.requestedPagePath}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">Owner: {request.ownerUser?.email || request.profile?.ownerEmail || "-"}</p>
                    <p className="mt-1 text-xs text-muted">Created {formatDate(request.createdAt)} · Reviewed {formatDate(request.reviewedAt)}</p>
                  </div>
                  <div className="grid min-w-[220px] gap-2">
                    <label>
                      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Approval price</span>
                      <input
                        value={priceOverrides[request.id || ""] ?? String(request.priceAmount ?? "")}
                        onChange={(event) => setPriceOverrides((current) => ({ ...current, [request.id || ""]: event.target.value }))}
                        disabled={["WALLET_HOLD", "RAZORPAY_PAID"].includes(String(request.paymentStatus || "").toUpperCase())}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none disabled:bg-slate-50 disabled:text-muted"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="gold" disabled={request.status === "APPROVED" || ((request.paymentProvider || request.payment?.provider) === "RAZORPAY" && request.paymentStatus !== "RAZORPAY_PAID")} onClick={() => updateRequestStatus(request, "APPROVED")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button variant="ghost" disabled={request.status === "REJECTED"} onClick={() => updateRequestStatus(request, "REJECTED")}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Pricing rules</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Set price by page scope</h2>
          <p className="mt-2 text-sm leading-6 text-muted">One rule is allowed per scope, duration and currency. Saving the same scope updates the existing price.</p>

          <div className="mt-5 grid gap-3">
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Placement type</span>
              <select value={priceForm.pageType} onChange={(event) => updatePriceForm({ pageType: event.target.value as FeaturedPageType })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none">
                <option value="CITY_CATEGORY">City/category page</option>
                <option value="CITY">City page</option>
                <option value="CATEGORY">Category page</option>
                <option value="COUNTRY">Country page</option>
                <option value="HOME">Home page</option>
              </select>
            </label>

            {priceForm.pageType !== "HOME" && priceForm.pageType !== "CATEGORY" ? (
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Country</span>
                <select value={priceForm.countryId} onChange={(event) => updatePriceForm({ countryId: event.target.value, citySlug: cities.find((city) => city.countryCode === event.target.value)?.slug || "" })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none">
                  {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                </select>
              </label>
            ) : null}

            {priceForm.pageType === "CITY" || priceForm.pageType === "CITY_CATEGORY" ? (
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">City</span>
                <select value={priceForm.citySlug} onChange={(event) => updatePriceForm({ citySlug: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none">
                  {activeCities.map((city) => <option key={`${city.countryCode}-${city.slug}`} value={city.slug}>{city.name}</option>)}
                </select>
              </label>
            ) : null}

            {priceForm.pageType === "CATEGORY" || priceForm.pageType === "CITY_CATEGORY" ? (
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Category</span>
                <select value={priceForm.categoryId} onChange={(event) => updatePriceForm({ categoryId: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none">
                  {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                </select>
              </label>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Duration</span>
                <select value={priceForm.durationDays} onChange={(event) => updatePriceForm({ durationDays: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none">
                  {featuredDurations.map((days) => <option key={days} value={days}>{days} days</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Price</span>
                <input value={priceForm.priceAmount} onChange={(event) => updatePriceForm({ priceAmount: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Currency</span>
                <input value={priceForm.currency} onChange={(event) => updatePriceForm({ currency: event.target.value.toUpperCase() })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none" />
              </label>
            </div>

            <div className="rounded-2xl bg-cloud p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Rule key</p>
              <p className="mt-1 break-all text-sm font-semibold text-ink">{scopeKey(priceForm)}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{scopePath(priceForm)}</p>
            </div>

            <Button variant="gold" onClick={savePriceRule}>
              <Save className="mr-2 h-4 w-4" /> Save price rule
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Saved rules</p>
            <div className="mt-3 grid gap-2">
              {prices.slice(0, 10).map((price) => (
                <button
                  key={price.id || `${price.scopeKey}-${price.durationDays}`}
                  type="button"
                  onClick={() => setPriceForm({
                    pageType: price.pageType as FeaturedPageType,
                    countryId: price.countryId || "in",
                    citySlug: price.citySlug || "delhi",
                    categoryId: price.categoryId || "female-escorts",
                    durationDays: String(price.durationDays),
                    priceAmount: String(price.priceAmount),
                    currency: price.currency || "INR"
                  })}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm ring-1 ring-slate-200"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{price.scopeKey}</span>
                    <span className="text-xs font-semibold text-muted">{price.durationDays} days · {featuredPageTypeLabel(price.pageType)}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-bold text-ink"><IndianRupee className="h-3.5 w-3.5" /> {price.priceAmount}</span>
                </button>
              ))}
              {!prices.length ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-muted ring-1 ring-slate-200">No custom price rules yet. Defaults are used until you save one.</p> : null}
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

function Skeleton() {
  return <div className="h-32 animate-pulse rounded-[1.5rem] bg-white/70 ring-1 ring-slate-200" />;
}
