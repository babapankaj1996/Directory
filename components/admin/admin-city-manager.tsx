"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  status: string;
  seoTitle?: string;
  seoDesc?: string;
  profiles: number;
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

function searchTokens(value: string) {
  return value.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function matchesSearch(tokens: string[], values: Array<string | number | undefined | null>) {
  if (!tokens.length) return true;
  const text = values.filter((value) => value !== undefined && value !== null).join(" ").toLowerCase();
  return tokens.every((token) => text.includes(token));
}

function sameCity(left: CityRow, right: CityRow) {
  if (left.id && right.id) return left.id === right.id;
  return left.slug === right.slug && left.countryCode === right.countryCode;
}

function normalizeCity(value: Record<string, unknown>): CityRow {
  const counts = value._count as { profiles?: number } | undefined;
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    slug: String(value.slug || ""),
    name: String(value.name || ""),
    countryCode: String(value.countryCode || value.country || "in").toLowerCase(),
    status: String(value.status || "DRAFT").toUpperCase(),
    seoTitle: typeof value.seoTitle === "string" ? value.seoTitle : "",
    seoDesc: typeof value.seoDesc === "string" ? value.seoDesc : "",
    profiles: counts?.profiles ?? Number(value.profiles || 0)
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

export function AdminCityManager() {
  const [cities, setCities] = useState<CityRow[]>(fallbackRows());
  const [form, setForm] = useState(blankCity);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadCities();
  }, []);

  async function loadCities() {
    try {
      const response = await fetch(`${getApiBase()}/api/cities`, { cache: "no-store" });
      const payload = await response.json() as { data?: Record<string, unknown>[] };
      if (response.ok && Array.isArray(payload.data)) setCities(payload.data.map(normalizeCity));
    } catch {
      undefined;
    }
  }

  const countryOptions = useMemo(() => Array.from(new Set(cities.map((city) => city.countryCode))).sort(), [cities]);

  const visible = useMemo(() => {
    const tokens = searchTokens(search);
    return cities.filter((city) => {
      const statusMatch = statusFilter === "ALL" || city.status === statusFilter;
      const countryMatch = countryFilter === "ALL" || city.countryCode === countryFilter;
      const searchMatch = matchesSearch(tokens, [
        city.name,
        city.slug,
        city.countryCode,
        city.status,
        city.seoTitle,
        city.seoDesc,
        city.profiles
      ]);
      return statusMatch && countryMatch && searchMatch;
    });
  }, [cities, countryFilter, search, statusFilter]);

  function resetForm() {
    setForm(blankCity);
    setEditingId(null);
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
      setNotice(`${city.name} marked ${status.toLowerCase()}.`);
    } catch {
      setNotice("Could not update city status. Check backend connection.");
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
        description="Create city pages, switch cities between active and draft, edit SEO fields, or delete unused city records from one screen."
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
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
            <Field label="Country Code" value={form.countryCode} onChange={(value) => setForm((current) => ({ ...current, countryCode: value }))} placeholder="in" />
            <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setForm((current) => ({ ...current, seoTitle: value }))} placeholder="Best Services in Delhi" />
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">SEO Description</span>
              <textarea value={form.seoDesc} onChange={(event) => setForm((current) => ({ ...current, seoDesc: event.target.value }))} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={resetForm} className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-semibold text-ink shadow-sm">Reset</button>
            <button onClick={saveCity} className="rounded-2xl bg-gradient-to-r from-[#ead39a] to-[#d8aa5b] px-5 py-3 text-sm font-semibold text-ink shadow-glow">Save City</button>
          </div>
          {notice ? <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold text-muted">{notice}</p> : null}
        </GlassCard>

        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-white/70 p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {["ALL", "ACTIVE", "DRAFT"].map((status) => (
                  <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full px-4 py-2 text-sm font-semibold ${statusFilter === status ? "bg-ink text-white" : "bg-white/70 text-muted"}`}>
                    {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
                {["ALL", ...countryOptions].map((country) => (
                  <button key={country} onClick={() => setCountryFilter(country)} className={`rounded-full px-4 py-2 text-sm font-semibold ${countryFilter === country ? "bg-champagne text-ink shadow-sm" : "bg-white/70 text-muted"}`}>
                    {country === "ALL" ? "All countries" : country.toUpperCase()}
                  </button>
                ))}
              </div>
              <label className="relative block w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cities" className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
              </label>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {visible.map((city) => (
              <div key={city.id || `${city.countryCode}-${city.slug}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{city.name}</p>
                    <Link href={`/${city.countryCode}/${city.slug}`} className="mt-1 inline-flex rounded-full bg-cloud px-3 py-1 text-xs font-semibold text-ink">/{city.countryCode}/{city.slug}</Link>
                  </div>
                  <StatusPill tone={city.status === "ACTIVE" ? "green" : "gray"}>{city.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill>
                </div>
                <div className="mt-4 grid gap-2">
                  <Info label="Country" value={city.countryCode.toUpperCase()} />
                  <Info label="Profiles" value={String(city.profiles)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <IconButton label="Edit" onClick={() => editCity(city)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label="Active" tone="green" onClick={() => updateStatus(city, "ACTIVE")}><CheckCircle2 className="h-4 w-4" /></IconButton>
                  <IconButton label="Draft" tone="gray" onClick={() => updateStatus(city, "DRAFT")}>D</IconButton>
                  <IconButton label="Delete" tone="red" onClick={() => deleteCity(city)}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  {["City", "URL", "Country", "Profiles", "Status", "Actions"].map((column) => <th key={column} className="px-5 py-4 font-bold">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {visible.map((city) => (
                  <tr key={city.id || `${city.countryCode}-${city.slug}`} className="transition hover:bg-white/45">
                    <td className="px-5 py-4 font-semibold text-ink">{city.name}</td>
                    <td className="px-5 py-4"><Link href={`/${city.countryCode}/${city.slug}`} className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">/{city.countryCode}/{city.slug}</Link></td>
                    <td className="px-5 py-4 text-muted">{city.countryCode.toUpperCase()}</td>
                    <td className="px-5 py-4 text-muted">{city.profiles}</td>
                    <td className="px-5 py-4"><StatusPill tone={city.status === "ACTIVE" ? "green" : "gray"}>{city.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <IconButton label="Edit" onClick={() => editCity(city)}><Pencil className="h-4 w-4" /></IconButton>
                        <IconButton label="Active" tone="green" onClick={() => updateStatus(city, "ACTIVE")}><CheckCircle2 className="h-4 w-4" /></IconButton>
                        <IconButton label="Draft" tone="gray" onClick={() => updateStatus(city, "DRAFT")}>D</IconButton>
                        <IconButton label="Delete" tone="red" onClick={() => deleteCity(city)}><Trash2 className="h-4 w-4" /></IconButton>
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
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100" />
    </label>
  );
}

function IconButton({ children, label, onClick, tone = "default" }: { children: React.ReactNode; label: string; onClick: () => void; tone?: "default" | "green" | "gray" | "red" }) {
  const tones = {
    default: "text-muted hover:text-ink",
    green: "text-emerald-700 hover:bg-emerald-50",
    gray: "text-slate-600 hover:bg-slate-50",
    red: "text-rose-600 hover:bg-rose-50"
  };
  return <button title={label} aria-label={label} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm transition ${tones[tone]}`}>{children}</button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-cloud px-3 py-2 text-sm">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
