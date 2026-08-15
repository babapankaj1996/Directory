"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { adminCities } from "@/lib/data";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase } from "@/lib/profiles";

type CityRow = {
  id?: string;
  slug: string;
  name: string;
  countryCode: string;
  countryName?: string;
  countryStatus?: string;
  status: string;
  seoTitle?: string;
  seoDesc?: string;
  profiles: number;
};

type CountryOption = {
  code: string;
  name: string;
  status: string;
};

type CityMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

const blankCity = {
  id: "",
  slug: "",
  name: "",
  countryCode: "in",
  status: "ACTIVE",
  seoTitle: "",
  seoDesc: ""
};

function normalizeCity(value: Record<string, unknown>): CityRow {
  const counts = value._count as { profiles?: number } | undefined;
  const country = value.country as Record<string, unknown> | undefined;
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    slug: String(value.slug || ""),
    name: String(value.name || ""),
    countryCode: String(value.countryCode || value.country || "in").toLowerCase(),
    countryName: typeof country?.name === "string" ? country.name : undefined,
    countryStatus: typeof country?.status === "string" ? country.status.toUpperCase() : undefined,
    status: String(value.status || "DRAFT").toUpperCase(),
    seoTitle: typeof value.seoTitle === "string" ? value.seoTitle : "",
    seoDesc: typeof value.seoDesc === "string" ? value.seoDesc : "",
    profiles: counts?.profiles ?? Number(value.profiles || 0)
  };
}

function normalizeCountry(value: Record<string, unknown>): CountryOption {
  return {
    code: String(value.code || "").toLowerCase(),
    name: String(value.name || ""),
    status: String(value.status || "DRAFT").toUpperCase()
  };
}

function fallbackRows(): CityRow[] {
  return adminCities.map((city) => ({
    slug: city.slug,
    name: city.name,
    countryCode: city.country,
    status: city.status.toUpperCase(),
    profiles: city.profiles
  }));
}

function sameCity(left: CityRow, right: CityRow) {
  if (left.id && right.id) return left.id === right.id;
  return left.slug === right.slug && left.countryCode === right.countryCode;
}

export function AdminCityManager() {
  const [cities, setCities] = useState<CityRow[]>(fallbackRows());
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [form, setForm] = useState(blankCity);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [meta, setMeta] = useState<CityMeta | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadCountries = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/countries`, { cache: "no-store" });
      const payload = await response.json() as { data?: Record<string, unknown>[] };
      if (response.ok && Array.isArray(payload.data)) setCountries(payload.data.map(normalizeCountry).filter((country) => country.code));
    } catch {
      return;
    }
  }, []);

  const loadCities = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "250", page: String(page) });
      if (countryFilter !== "ALL") params.set("countryCode", countryFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`${getApiBase()}/api/cities?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { data?: Record<string, unknown>[]; meta?: CityMeta };
      if (response.ok && Array.isArray(payload.data)) {
        setCities(payload.data.map(normalizeCity));
        setMeta(payload.meta || null);
      }
    } catch {
      return;
    }
  }, [countryFilter, page, search, statusFilter]);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  const visible = cities;
  const visibleWithIds = visible.filter((city) => city.id);
  const selectedVisible = visibleWithIds.filter((city) => city.id && selectedIds.has(city.id));
  const allVisibleSelected = visibleWithIds.length > 0 && visibleWithIds.every((city) => city.id && selectedIds.has(city.id));

  const countryOptions = useMemo(() => {
    const fromRows = visible.map((city) => ({
      code: city.countryCode,
      name: city.countryName || city.countryCode.toUpperCase(),
      status: city.countryStatus || "DRAFT"
    }));
    const merged = new Map<string, CountryOption>();
    [...countries, ...fromRows].forEach((country) => {
      if (country.code) merged.set(country.code, country);
    });
    return Array.from(merged.values()).sort((first, second) => first.name.localeCompare(second.name));
  }, [countries, visible]);

  function resetForm() {
    setForm(blankCity);
    setEditingId(null);
  }

  function changeStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  }

  function changeCountryFilter(value: string) {
    setCountryFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
    setSelectedIds(new Set());
  }

  function editCity(city: CityRow) {
    setEditingId(city.id || `${city.countryCode}:${city.slug}`);
    setForm({
      id: city.id || "",
      slug: city.slug,
      name: city.name,
      countryCode: city.countryCode,
      status: city.status,
      seoTitle: city.seoTitle || "",
      seoDesc: city.seoDesc || ""
    });
  }

  function toggleCity(id: string | undefined, checked: boolean) {
    if (!id) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleVisible(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleWithIds.forEach((city) => {
        if (!city.id) return;
        if (checked) next.add(city.id);
        else next.delete(city.id);
      });
      return next;
    });
  }

  async function saveCity() {
    const payload = {
      name: form.name.trim(),
      slug: form.slug.toLowerCase().trim(),
      countryCode: form.countryCode.toLowerCase().trim(),
      status: form.status.toUpperCase(),
      seoTitle: form.seoTitle,
      seoDesc: form.seoDesc
    };
    if (!payload.name || !payload.countryCode) {
      setNotice("City name and country code are required.");
      return;
    }
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `${getApiBase()}/api/cities/${form.id}` : `${getApiBase()}/api/cities`;

    try {
      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json() as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(json.error || "City save failed.");
      await loadCities();
      resetForm();
      setNotice("City saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "City save failed.");
    }
  }

  async function updateStatus(city: CityRow, status: "ACTIVE" | "DRAFT") {
    if (city.status === status) return;
    setCities((current) => current.map((item) => sameCity(item, city) ? { ...item, status } : item));
    if (!city.id) {
      setNotice("Status changed locally. Save a database-backed city first to persist this.");
      return;
    }
    try {
      await adminFetch(`${getApiBase()}/api/cities/${city.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      setNotice(`${city.name} moved to ${status.toLowerCase()}.`);
      await loadCities();
    } catch {
      setNotice("Could not update city status. Check backend connection.");
      await loadCities();
    }
  }

  async function bulkUpdateStatus(status: "ACTIVE" | "DRAFT") {
    const ids = selectedVisible.map((city) => city.id).filter(Boolean) as string[];
    if (!ids.length) {
      setNotice("Select cities first.");
      return;
    }
    setCities((current) => current.map((city) => city.id && ids.includes(city.id) ? { ...city, status } : city));
    try {
      const response = await adminFetch(`${getApiBase()}/api/cities/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status })
      });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Bulk city status update failed.");
      setSelectedIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setNotice(`${ids.length} cit${ids.length === 1 ? "y" : "ies"} moved to ${status.toLowerCase()}.`);
      await loadCities();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Bulk city status update failed.");
      await loadCities();
    }
  }

  async function deleteCity(city: CityRow) {
    if (!window.confirm(`Delete ${city.name}? Cities with linked profiles may be blocked by the database.`)) return;
    if (!city.id) {
      setCities((current) => current.filter((item) => !sameCity(item, city)));
      setNotice(`${city.name} removed locally.`);
      return;
    }
    try {
      const response = await adminFetch(`${getApiBase()}/api/cities/${city.id}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || "City delete failed.");
      setCities((current) => current.filter((item) => item.id !== city.id));
      toggleCity(city.id, false);
      setNotice(`${city.name} deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "City delete failed.");
    }
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow="City manager"
        title="Manage cities"
        description="Search imported cities, filter by country, then activate public city pages or move cities back to draft in bulk."
      />

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-ink">{editingId ? "Edit city" : "Add city"}</h3>
            <button onClick={resetForm} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-champagne shadow-sm" aria-label="New city">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 grid gap-5">
            <Field label="City Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Delhi" />
            <Field label="City Slug" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: value }))} placeholder="delhi" />
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Country</span>
              <select value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code.toUpperCase()})</option>)}
              </select>
            </label>
            <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setForm((current) => ({ ...current, seoTitle: value }))} placeholder="Best Services in Delhi" />
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">SEO Description</span>
              <textarea value={form.seoDesc} onChange={(event) => setForm((current) => ({ ...current, seoDesc: event.target.value }))} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={resetForm} className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-semibold text-ink shadow-sm">Reset</button>
            <button onClick={saveCity} className="rounded-2xl bg-gradient-to-r from-[#ead39a] to-[#d8aa5b] px-5 py-3 text-sm font-semibold text-onaccent shadow-glow">Save City</button>
          </div>
          {notice ? <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold text-muted">{notice}</p> : null}
        </GlassCard>

        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-white/70 p-5">
            <div className="grid gap-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Search city, slug, country code or country name" className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
                </label>
                <select value={countryFilter} onChange={(event) => changeCountryFilter(event.target.value)} className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                  <option value="ALL">All countries</option>
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(event) => changeStatusFilter(event.target.value)} className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active only</option>
                  <option value="DRAFT">Draft only</option>
                </select>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs font-semibold text-muted">
                  Showing {visible.length.toLocaleString()} of {(meta?.total || visible.length).toLocaleString()} matching cities{meta ? `, page ${meta.page.toLocaleString()} of ${meta.totalPages.toLocaleString()}` : ""}.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <BulkStatusBar selectedCount={selectedVisible.length} onActive={() => bulkUpdateStatus("ACTIVE")} onDraft={() => bulkUpdateStatus("DRAFT")} />
                  <Pagination page={page} totalPages={meta?.totalPages || 1} onPage={(nextPage) => {
                    setPage(nextPage);
                    setSelectedIds(new Set());
                  }} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {visible.map((city) => (
              <div key={city.id || `${city.countryCode}-${city.slug}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" checked={Boolean(city.id && selectedIds.has(city.id))} onChange={(event) => toggleCity(city.id, event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-ink" />
                    <span>
                      <span className="block font-semibold text-ink">{city.name}</span>
                      <Link href={`/${city.countryCode}/${city.slug}`} className="mt-1 inline-flex rounded-full bg-cloud px-3 py-1 text-xs font-semibold text-ink">/{city.countryCode}/{city.slug}</Link>
                    </span>
                  </label>
                  <StatusPill tone={city.status === "ACTIVE" ? "green" : "gray"}>{city.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill>
                </div>
                <div className="mt-4 grid gap-2">
                  <Info label="Country" value={`${city.countryName || city.countryCode.toUpperCase()} (${city.countryCode.toUpperCase()})`} />
                  <Info label="Country status" value={city.countryStatus || "Draft"} />
                  <Info label="Profiles" value={String(city.profiles)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => editCity(city)} className="rounded-xl bg-cloud px-3 py-2 text-xs font-bold text-ink"><Pencil className="mr-1 inline h-3.5 w-3.5" /> Edit</button>
                  <StatusButtons status={city.status} onActive={() => updateStatus(city, "ACTIVE")} onDraft={() => updateStatus(city, "DRAFT")} />
                  <button onClick={() => deleteCity(city)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  <th className="px-5 py-4">
                    <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleVisible(event.target.checked)} aria-label="Select visible cities" className="h-4 w-4 rounded border-slate-300 text-ink" />
                  </th>
                  {["City", "URL", "Country", "Profiles", "Status", "Actions"].map((column) => <th key={column} className="px-5 py-4 font-bold">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {visible.map((city) => (
                  <tr key={city.id || `${city.countryCode}-${city.slug}`} className="transition hover:bg-white/45">
                    <td className="px-5 py-4">
                      <input type="checkbox" checked={Boolean(city.id && selectedIds.has(city.id))} onChange={(event) => toggleCity(city.id, event.target.checked)} aria-label={`Select ${city.name}`} className="h-4 w-4 rounded border-slate-300 text-ink" />
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">{city.name}</td>
                    <td className="px-5 py-4"><Link href={`/${city.countryCode}/${city.slug}`} className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">/{city.countryCode}/{city.slug}</Link></td>
                    <td className="px-5 py-4 text-muted">
                      <span className="block font-semibold text-ink">{city.countryName || city.countryCode.toUpperCase()}</span>
                      <span className="mt-1 inline-block rounded-full bg-cloud px-2 py-0.5 text-[11px] font-bold uppercase text-muted">{city.countryCode} - {city.countryStatus || "DRAFT"}</span>
                    </td>
                    <td className="px-5 py-4 text-muted">{city.profiles.toLocaleString()}</td>
                    <td className="px-5 py-4"><StatusPill tone={city.status === "ACTIVE" ? "green" : "gray"}>{city.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button title="Edit" aria-label={`Edit ${city.name}`} onClick={() => editCity(city)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-sm transition hover:text-ink"><Pencil className="h-4 w-4" /></button>
                        <StatusButtons status={city.status} onActive={() => updateStatus(city, "ACTIVE")} onDraft={() => updateStatus(city, "DRAFT")} compact />
                        <button title="Delete" aria-label={`Delete ${city.name}`} onClick={() => deleteCity(city)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100" />
    </label>
  );
}

function BulkStatusBar({ selectedCount, onActive, onDraft }: { selectedCount: number; onActive: () => void; onDraft: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-muted shadow-sm">{selectedCount} selected</span>
      <button onClick={onActive} disabled={!selectedCount} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
        <CheckCircle2 className="h-3.5 w-3.5" /> Activate
      </button>
      <button onClick={onDraft} disabled={!selectedCount} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
        <Archive className="h-3.5 w-3.5" /> Draft
      </button>
    </div>
  );
}

function StatusButtons({ status, onActive, onDraft, compact = false }: { status: string; onActive: () => void; onDraft: () => void; compact?: boolean }) {
  return (
    <div className="inline-flex overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <button onClick={onActive} disabled={status === "ACTIVE"} className={`${compact ? "px-2.5" : "px-3"} inline-flex items-center gap-1.5 py-2 text-xs font-bold text-emerald-800 disabled:bg-emerald-50 disabled:text-emerald-700 disabled:opacity-100`}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Active
      </button>
      <button onClick={onDraft} disabled={status === "DRAFT"} className={`${compact ? "px-2.5" : "px-3"} inline-flex items-center gap-1.5 border-l border-slate-200 py-2 text-xs font-bold text-slate-700 disabled:bg-slate-100 disabled:opacity-100`}>
        <Archive className="h-3.5 w-3.5" /> Draft
      </button>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <button aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(Math.max(page - 1, 1))} className="px-3 py-2 text-muted disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="border-x border-slate-200 px-3 py-2 text-xs font-bold text-ink">{page.toLocaleString()} / {totalPages.toLocaleString()}</span>
      <button aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(Math.min(page + 1, totalPages))} className="px-3 py-2 text-muted disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-cloud px-3 py-2 text-sm">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
