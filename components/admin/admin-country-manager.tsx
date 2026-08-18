"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { adminCountries } from "@/lib/data";
import { adminFetch } from "@/lib/admin-auth";
import { apiUrl, getApiBase } from "@/lib/profiles";

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
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const loadCountries = useCallback(async () => {
    try {
      const response = await fetch(apiUrl(`/api/countries`), { cache: "no-store" });
      const payload = await response.json() as { data?: Record<string, unknown>[] };
      if (response.ok && Array.isArray(payload.data)) setCountries(payload.data.map(normalizeCountry));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

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

  const stats = useMemo(() => ({
    active: countries.filter((country) => country.status === "ACTIVE").length,
    draft: countries.filter((country) => country.status === "DRAFT").length
  }), [countries]);

  const selectedVisible = visible.filter((country) => selectedCodes.has(country.code));
  const allVisibleSelected = visible.length > 0 && visible.every((country) => selectedCodes.has(country.code));

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

  function toggleCountry(code: string, checked: boolean) {
    setSelectedCodes((current) => {
      const next = new Set(current);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  function toggleVisible(checked: boolean) {
    setSelectedCodes((current) => {
      const next = new Set(current);
      visible.forEach((country) => {
        if (checked) next.add(country.code);
        else next.delete(country.code);
      });
      return next;
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
    const url = editingCode ? apiUrl(`/api/countries/${editingCode}`) : apiUrl(`/api/countries`);

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
    if (country.status === status) return;
    setCountries((current) => current.map((item) => item.code === country.code ? { ...item, status } : item));
    try {
      await adminFetch(apiUrl(`/api/countries/${country.code}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      setNotice(`${country.name} moved to ${status.toLowerCase()}.`);
      await loadCountries();
    } catch {
      setNotice("Could not update country status. Check backend connection.");
      await loadCountries();
    }
  }

  async function bulkUpdateStatus(status: "ACTIVE" | "DRAFT") {
    const codes = selectedVisible.map((country) => country.code);
    if (!codes.length) {
      setNotice("Select countries first.");
      return;
    }
    setCountries((current) => current.map((country) => codes.includes(country.code) ? { ...country, status } : country));
    try {
      const response = await adminFetch(apiUrl(`/api/countries/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes, status })
      });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Bulk country status update failed.");
      setSelectedCodes((current) => {
        const next = new Set(current);
        codes.forEach((code) => next.delete(code));
        return next;
      });
      setNotice(`${codes.length} countr${codes.length === 1 ? "y" : "ies"} moved to ${status.toLowerCase()}.`);
      await loadCountries();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Bulk country status update failed.");
      await loadCountries();
    }
  }

  async function deleteCountry(country: CountryRow) {
    if (!window.confirm(`Delete ${country.name}? Countries with linked cities/profiles may be blocked by the database.`)) return;
    try {
      const response = await adminFetch(apiUrl(`/api/countries/${country.code}`), { method: "DELETE" });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Country delete failed.");
      setCountries((current) => current.filter((item) => item.code !== country.code));
      toggleCountry(country.code, false);
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
        description="Activate public country pages or move imported countries back to draft. Draft countries stay out of public navigation and sitemap output."
      />

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
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
            <button onClick={saveCountry} className="rounded-2xl bg-gradient-to-r from-[#ead39a] to-[#d8aa5b] px-5 py-3 text-sm font-semibold text-onaccent shadow-glow">Save Country</button>
          </div>
          {notice ? <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold text-muted">{notice}</p> : null}
        </GlassCard>

        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-white/70 p-5">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusFilter label="All" value={countries.length} active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} />
                <StatusFilter label="Active" value={stats.active} active={statusFilter === "ACTIVE"} onClick={() => setStatusFilter("ACTIVE")} tone="green" />
                <StatusFilter label="Draft" value={stats.draft} active={statusFilter === "DRAFT"} onClick={() => setStatusFilter("DRAFT")} tone="gray" />
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search country name or code" className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
                </label>
                <BulkStatusBar selectedCount={selectedVisible.length} onActive={() => bulkUpdateStatus("ACTIVE")} onDraft={() => bulkUpdateStatus("DRAFT")} />
              </div>
              <p className="text-xs font-semibold text-muted">Showing {visible.length.toLocaleString()} countries. Select rows to activate or move them to draft together.</p>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {visible.map((country) => (
              <div key={country.code} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedCodes.has(country.code)} onChange={(event) => toggleCountry(country.code, event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-ink" />
                    <span>
                      <span className="block font-semibold text-ink">{country.name}</span>
                      <Link href={`/${country.code}`} className="mt-1 inline-flex rounded-full bg-cloud px-3 py-1 text-xs font-semibold text-ink">/{country.code}</Link>
                    </span>
                  </label>
                  <StatusPill tone={country.status === "ACTIVE" ? "green" : "gray"}>{country.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill>
                </div>
                <div className="mt-4 grid gap-2">
                  <Info label="Cities" value={String(country.cities)} />
                  <Info label="Profiles" value={String(country.profiles)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => editCountry(country)} className="rounded-xl bg-cloud px-3 py-2 text-xs font-bold text-ink"><Pencil className="mr-1 inline h-3.5 w-3.5" /> Edit</button>
                  <StatusButtons status={country.status} onActive={() => updateStatus(country, "ACTIVE")} onDraft={() => updateStatus(country, "DRAFT")} />
                  <button onClick={() => deleteCountry(country)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  <th className="px-5 py-4">
                    <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleVisible(event.target.checked)} aria-label="Select visible countries" className="h-4 w-4 rounded border-slate-300 text-ink" />
                  </th>
                  {["Country", "Slug", "Cities", "Profiles", "Status", "Actions"].map((column) => <th key={column} className="px-5 py-4 font-bold">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {visible.map((country) => (
                  <tr key={country.code} className="transition hover:bg-white/45">
                    <td className="px-5 py-4">
                      <input type="checkbox" checked={selectedCodes.has(country.code)} onChange={(event) => toggleCountry(country.code, event.target.checked)} aria-label={`Select ${country.name}`} className="h-4 w-4 rounded border-slate-300 text-ink" />
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">{country.name}</td>
                    <td className="px-5 py-4"><Link href={`/${country.code}`} className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">/{country.code}</Link></td>
                    <td className="px-5 py-4 text-muted">{country.cities.toLocaleString()}</td>
                    <td className="px-5 py-4 text-muted">{country.profiles.toLocaleString()}</td>
                    <td className="px-5 py-4"><StatusPill tone={country.status === "ACTIVE" ? "green" : "gray"}>{country.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button title="Edit" aria-label={`Edit ${country.name}`} onClick={() => editCountry(country)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-sm transition hover:text-ink"><Pencil className="h-4 w-4" /></button>
                        <StatusButtons status={country.status} onActive={() => updateStatus(country, "ACTIVE")} onDraft={() => updateStatus(country, "DRAFT")} compact />
                        <button title="Delete" aria-label={`Delete ${country.name}`} onClick={() => deleteCountry(country)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
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
      <input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-70" />
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

function StatusFilter({ label, value, active, onClick, tone = "default" }: { label: string; value: number; active: boolean; onClick: () => void; tone?: "default" | "green" | "gray" }) {
  const activeClass = tone === "green" ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : tone === "gray" ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-ink text-white ring-ink";
  return (
    <button onClick={onClick} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-sm ring-1 transition ${active ? activeClass : "bg-white/70 text-muted ring-white/80 hover:text-ink"}`}>
      <span className="block">{label}</span>
      <span className="mt-1 block text-lg text-current">{value.toLocaleString()}</span>
    </button>
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
