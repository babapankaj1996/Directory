"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { adminCountries } from "@/lib/data";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase } from "@/lib/profiles";

type CountryRow = {
  code: string;
  name: string;
  status: string;
  seoTitle?: string;
  seoDesc?: string;
  cities: number;
  profiles: number;
};

const blankCountry = {
  code: "",
  name: "",
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

function normalizeCountry(value: Record<string, unknown>): CountryRow {
  const counts = value._count as { cities?: number; profiles?: number } | undefined;
  return {
    code: String(value.code || ""),
    name: String(value.name || ""),
    status: String(value.status || "DRAFT").toUpperCase(),
    seoTitle: typeof value.seoTitle === "string" ? value.seoTitle : "",
    seoDesc: typeof value.seoDesc === "string" ? value.seoDesc : "",
    cities: counts?.cities ?? Number(value.cities || 0),
    profiles: counts?.profiles ?? Number(value.profiles || 0)
  };
}

function fallbackRows(): CountryRow[] {
  return adminCountries.map((country) => ({
    code: country.code,
    name: country.name,
    status: country.status.toUpperCase(),
    cities: country.cities,
    profiles: country.profiles
  }));
}

export function AdminCountryManager() {
  const [countries, setCountries] = useState<CountryRow[]>(fallbackRows());
  const [form, setForm] = useState(blankCountry);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadCountries();
  }, []);

  async function loadCountries() {
    try {
      const response = await fetch(`${getApiBase()}/api/countries`, { cache: "no-store" });
      const payload = await response.json() as { data?: Record<string, unknown>[] };
      if (response.ok && Array.isArray(payload.data)) setCountries(payload.data.map(normalizeCountry));
    } catch {
      undefined;
    }
  }

  const visible = useMemo(() => {
    const tokens = searchTokens(search);
    return countries.filter((country) => {
      const statusMatch = statusFilter === "ALL" || country.status === statusFilter;
      const searchMatch = matchesSearch(tokens, [
        country.name,
        country.code,
        country.status,
        country.seoTitle,
        country.seoDesc,
        country.cities,
        country.profiles
      ]);
      return statusMatch && searchMatch;
    });
  }, [countries, search, statusFilter]);

  function resetForm() {
    setForm(blankCountry);
    setEditingCode(null);
  }

  function editCountry(country: CountryRow) {
    setEditingCode(country.code);
    setForm({
      code: country.code,
      name: country.name,
      status: country.status,
      seoTitle: country.seoTitle || "",
      seoDesc: country.seoDesc || ""
    });
  }

  async function saveCountry() {
    const payload = {
      ...form,
      code: form.code.toLowerCase().trim(),
      name: form.name.trim(),
      status: form.status.toUpperCase()
    };
    if (!payload.code || !payload.name) {
      setNotice("Country name and code are required.");
      return;
    }

    const method = editingCode ? "PUT" : "POST";
    const url = editingCode ? `${getApiBase()}/api/countries/${editingCode}` : `${getApiBase()}/api/countries`;

    try {
      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json() as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(json.error || "Country save failed.");
      await loadCountries();
      resetForm();
      setNotice("Country saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Country save failed.");
    }
  }

  async function updateStatus(country: CountryRow, status: "ACTIVE" | "DRAFT") {
    setCountries((current) => current.map((item) => item.code === country.code ? { ...item, status } : item));
    try {
      await adminFetch(`${getApiBase()}/api/countries/${country.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      setNotice(`${country.name} marked ${status.toLowerCase()}.`);
    } catch {
      setNotice("Could not update country status. Check backend connection.");
    }
  }

  async function deleteCountry(country: CountryRow) {
    if (!window.confirm(`Delete ${country.name}? Countries with linked cities/profiles may be blocked by the database.`)) return;
    try {
      const response = await adminFetch(`${getApiBase()}/api/countries/${country.code}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Country delete failed.");
      setCountries((current) => current.filter((item) => item.code !== country.code));
      setNotice(`${country.name} deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Country delete failed.");
    }
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow="Country manager"
        title="Manage countries"
        description="Add countries, switch country pages between active and draft, edit SEO fields, or delete unused countries from one screen."
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-ink">{editingCode ? "Edit country" : "Add country"}</h3>
            <button onClick={resetForm} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-champagne shadow-sm" aria-label="New country">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 grid gap-5">
            <Field label="Country Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="India" />
            <Field label="Country Code / Slug" value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} placeholder="in" disabled={Boolean(editingCode)} />
            <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setForm((current) => ({ ...current, seoTitle: value }))} placeholder="Best Services in India" />
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
            <button onClick={saveCountry} className="rounded-2xl bg-gradient-to-r from-[#ead39a] to-[#d8aa5b] px-5 py-3 text-sm font-semibold text-ink shadow-glow">Save Country</button>
          </div>
          {notice ? <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold text-muted">{notice}</p> : null}
        </GlassCard>

        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-white/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2">
                {["ALL", "ACTIVE", "DRAFT"].map((status) => (
                  <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full px-4 py-2 text-sm font-semibold ${statusFilter === status ? "bg-ink text-white" : "bg-white/70 text-muted"}`}>
                    {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <label className="relative block w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search countries" className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
              </label>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {visible.map((country) => (
              <div key={country.code} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{country.name}</p>
                    <Link href={`/${country.code}`} className="mt-1 inline-flex rounded-full bg-cloud px-3 py-1 text-xs font-semibold text-ink">/{country.code}</Link>
                  </div>
                  <StatusPill tone={country.status === "ACTIVE" ? "green" : "gray"}>{country.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill>
                </div>
                <div className="mt-4 grid gap-2">
                  <Info label="Cities" value={String(country.cities)} />
                  <Info label="Profiles" value={String(country.profiles)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <IconButton label="Edit" onClick={() => editCountry(country)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label="Active" tone="green" onClick={() => updateStatus(country, "ACTIVE")}><CheckCircle2 className="h-4 w-4" /></IconButton>
                  <IconButton label="Draft" tone="gray" onClick={() => updateStatus(country, "DRAFT")}>D</IconButton>
                  <IconButton label="Delete" tone="red" onClick={() => deleteCountry(country)}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  {["Country", "Slug", "Cities", "Profiles", "Status", "Actions"].map((column) => <th key={column} className="px-5 py-4 font-bold">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {visible.map((country) => (
                  <tr key={country.code} className="transition hover:bg-white/45">
                    <td className="px-5 py-4 font-semibold text-ink">{country.name}</td>
                    <td className="px-5 py-4"><Link href={`/${country.code}`} className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">/{country.code}</Link></td>
                    <td className="px-5 py-4 text-muted">{country.cities}</td>
                    <td className="px-5 py-4 text-muted">{country.profiles}</td>
                    <td className="px-5 py-4"><StatusPill tone={country.status === "ACTIVE" ? "green" : "gray"}>{country.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <IconButton label="Edit" onClick={() => editCountry(country)}><Pencil className="h-4 w-4" /></IconButton>
                        <IconButton label="Active" tone="green" onClick={() => updateStatus(country, "ACTIVE")}><CheckCircle2 className="h-4 w-4" /></IconButton>
                        <IconButton label="Draft" tone="gray" onClick={() => updateStatus(country, "DRAFT")}>D</IconButton>
                        <IconButton label="Delete" tone="red" onClick={() => deleteCountry(country)}><Trash2 className="h-4 w-4" /></IconButton>
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

function Field({ label, value, onChange, placeholder, disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-70" />
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
