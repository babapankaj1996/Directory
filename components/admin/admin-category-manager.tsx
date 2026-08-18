"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, PauseCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { categories as fallbackCategories } from "@/lib/data";
import { adminFetch } from "@/lib/admin-auth";
import { apiUrl, getApiBase } from "@/lib/profiles";

type CategoryRow = {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  status: string;
  seoTitle: string;
  seoDesc: string;
  profiles: number;
  isAdult: boolean;
  adultLevel: string;
  minimumAge: number;
  showOnHomepage: boolean;
  indexable: boolean;
};

const blankCategory = {
  slug: "",
  name: "",
  description: "",
  iconName: "BadgeCheck",
  status: "ACTIVE",
  isAdult: false,
  adultLevel: "NONE",
  minimumAge: 0,
  showOnHomepage: true,
  indexable: true,
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

function normalizeCategory(value: Record<string, unknown>): CategoryRow {
  const counts = value._count as { profiles?: number } | undefined;
  return {
    slug: String(value.slug || ""),
    name: String(value.name || ""),
    description: typeof value.description === "string" ? value.description : "",
    iconName: typeof value.iconName === "string" ? value.iconName : "BadgeCheck",
    status: String(value.status || "DRAFT").toUpperCase(),
    seoTitle: typeof value.seoTitle === "string" ? value.seoTitle : "",
    seoDesc: typeof value.seoDesc === "string" ? value.seoDesc : "",
    profiles: counts?.profiles ?? Number(value.profiles || 0),
    isAdult: Boolean(value.isAdult),
    adultLevel: typeof value.adultLevel === "string" ? value.adultLevel : "NONE",
    minimumAge: Number(value.minimumAge || 0),
    showOnHomepage: value.showOnHomepage !== false,
    indexable: value.indexable !== false
  };
}

function fallbackRows(): CategoryRow[] {
  return fallbackCategories.map((category) => ({
    slug: category.slug,
    name: category.name,
    description: category.description,
    iconName: category.iconName,
    status: "ACTIVE",
    seoTitle: `${category.name} Directory`,
    seoDesc: category.description,
    profiles: category.count,
    isAdult: Boolean(category.isAdult),
    adultLevel: category.adultLevel || "NONE",
    minimumAge: category.minimumAge || 0,
    showOnHomepage: category.showOnHomepage !== false,
    indexable: category.indexable !== false
  }));
}

export function AdminCategoryManager() {
  const [categories, setCategories] = useState<CategoryRow[]>(fallbackRows());
  const [form, setForm] = useState(blankCategory);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const response = await fetch(apiUrl(`/api/categories`), { cache: "no-store" });
      const payload = await response.json() as { data?: Record<string, unknown>[] };
      if (response.ok && Array.isArray(payload.data)) setCategories(payload.data.map(normalizeCategory));
    } catch {
      undefined;
    }
  }

  const visible = useMemo(() => {
    const tokens = searchTokens(search);
    return categories.filter((category) => {
      const statusMatch = statusFilter === "ALL" || category.status === statusFilter;
      const searchMatch = matchesSearch(tokens, [
        category.name,
        category.slug,
        category.status,
        category.description,
        category.iconName,
        category.seoTitle,
        category.seoDesc,
        category.profiles
      ]);
      return statusMatch && searchMatch;
    });
  }, [categories, search, statusFilter]);

  function resetForm() {
    setForm(blankCategory);
    setEditingSlug(null);
  }

  function editCategory(category: CategoryRow) {
    setEditingSlug(category.slug);
    setForm({
      slug: category.slug,
      name: category.name,
      description: category.description,
      iconName: category.iconName,
      status: category.status,
      isAdult: category.isAdult,
      adultLevel: category.adultLevel,
      minimumAge: category.minimumAge,
      showOnHomepage: category.showOnHomepage,
      indexable: category.indexable,
      seoTitle: category.seoTitle,
      seoDesc: category.seoDesc
    });
  }

  async function saveCategory() {
    const payload = {
      slug: form.slug.toLowerCase().trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      iconName: form.iconName.trim() || "BadgeCheck",
      status: form.status.toUpperCase(),
      isAdult: form.isAdult,
      adultLevel: form.isAdult ? form.adultLevel || "AGE_RESTRICTED" : "NONE",
      minimumAge: form.isAdult ? Number(form.minimumAge || 18) : 0,
      showOnHomepage: form.isAdult ? false : form.showOnHomepage,
      indexable: form.indexable,
      seoTitle: form.seoTitle.trim(),
      seoDesc: form.seoDesc.trim()
    };

    if (!payload.name) {
      setNotice("Category name is required.");
      return;
    }

    const method = editingSlug ? "PUT" : "POST";
    const url = editingSlug ? apiUrl(`/api/categories/${editingSlug}`) : apiUrl(`/api/categories`);

    try {
      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json() as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(json.error || "Category save failed.");
      await loadCategories();
      resetForm();
      setNotice("Category saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Category save failed.");
    }
  }

  async function updateStatus(category: CategoryRow, status: "ACTIVE" | "DRAFT") {
    setCategories((current) => current.map((item) => item.slug === category.slug ? { ...item, status } : item));
    try {
      await adminFetch(apiUrl(`/api/categories/${category.slug}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      setNotice(`${category.name} marked ${status.toLowerCase()}.`);
    } catch {
      setNotice("Could not update category status. Check backend connection.");
    }
  }

  async function deleteCategory(category: CategoryRow) {
    if (!window.confirm(`Delete ${category.name}? This will also delete ${category.profiles} linked profile${category.profiles === 1 ? "" : "s"} and remove the category from public pages.`)) return;
    try {
      const response = await adminFetch(apiUrl(`/api/categories/${category.slug}`), { method: "DELETE" });
      const json = await response.json().catch(() => ({})) as { error?: string; deletedProfiles?: number };
      if (!response.ok) throw new Error(json.error || "Category delete failed.");
      setCategories((current) => current.filter((item) => item.slug !== category.slug));
      if (editingSlug === category.slug) resetForm();
      setNotice(`${category.name} deleted with ${json.deletedProfiles || 0} linked profile${json.deletedProfiles === 1 ? "" : "s"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Category delete failed.");
    }
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow="Category manager"
        title="Manage categories"
        description="Create category pages, switch categories between active and draft, edit SEO fields, and delete categories with their linked profiles from one screen."
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-ink">{editingSlug ? "Edit category" : "Add category"}</h3>
            <button onClick={resetForm} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-champagne shadow-sm" aria-label="New category">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 grid gap-5">
            <Field label="Category Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Astrologers" />
            <Field label="Category Slug" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: value }))} placeholder="astrologer" />
            <Field label="Icon Name" value={form.iconName} onChange={(value) => setForm((current) => ({ ...current, iconName: value }))} placeholder="BadgeCheck" />
            <label className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
              <input
                type="checkbox"
                checked={form.isAdult}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  isAdult: event.target.checked,
                  adultLevel: event.target.checked ? "AGE_RESTRICTED" : "NONE",
                  minimumAge: event.target.checked ? 18 : 0,
                  showOnHomepage: event.target.checked ? false : current.showOnHomepage
                }))}
                className="mt-1 h-4 w-4"
              />
              18+ age-restricted category
            </label>
            {form.isAdult ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink">Adult Level</span>
                  <select value={form.adultLevel} onChange={(event) => setForm((current) => ({ ...current, adultLevel: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                    <option value="AGE_RESTRICTED">Age restricted</option>
                    <option value="SENSITIVE">Sensitive</option>
                    <option value="EXPLICIT">Explicit</option>
                  </select>
                </label>
                <Field label="Minimum Age" value={String(form.minimumAge || 18)} onChange={(value) => setForm((current) => ({ ...current, minimumAge: Number(value || 18) }))} placeholder="18" />
              </div>
            ) : null}
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">
              <input type="checkbox" checked={form.indexable} onChange={(event) => setForm((current) => ({ ...current, indexable: event.target.checked }))} className="h-4 w-4" />
              Index this category in sitemap/search engines
            </label>
            <Field label="SEO Title" value={form.seoTitle} onChange={(value) => setForm((current) => ({ ...current, seoTitle: value }))} placeholder="Best Astrologers" />
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">SEO Description</span>
              <textarea value={form.seoDesc} onChange={(event) => setForm((current) => ({ ...current, seoDesc: event.target.value }))} rows={3} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Description</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
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
            <button onClick={saveCategory} className="rounded-2xl bg-gradient-to-r from-[#ead39a] to-[#d8aa5b] px-5 py-3 text-sm font-semibold text-onaccent shadow-glow">Save Category</button>
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
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
              </label>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {visible.map((category) => (
              <div key={category.slug} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-ink">{category.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted">{category.description || category.seoDesc}</p>
                  </div>
                  <StatusPill tone={category.status === "ACTIVE" ? "green" : "gray"}>{category.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill>
                  {category.isAdult ? <StatusPill tone="amber">18+</StatusPill> : null}
                </div>
                <div className="mt-4 grid gap-2">
                  <Info label="Slug" value={`/${category.slug}`} />
                  <Info label="Profiles" value={String(category.profiles)} />
                  <Info label="Icon" value={category.iconName} />
                  <Info label="18+" value={category.isAdult ? `${category.adultLevel} / ${category.minimumAge}+` : "No"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <IconLink href={`/in/delhi/${category.slug}`} label="View"><Eye className="h-4 w-4" /></IconLink>
                  <IconButton label="Edit" onClick={() => editCategory(category)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label="Active" tone="green" onClick={() => updateStatus(category, "ACTIVE")}><CheckCircle2 className="h-4 w-4" /></IconButton>
                  <IconButton label="Draft" tone="gray" onClick={() => updateStatus(category, "DRAFT")}><PauseCircle className="h-4 w-4" /></IconButton>
                  <IconButton label="Delete" tone="red" onClick={() => deleteCategory(category)}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  {["Category", "Slug", "Profiles", "Icon", "18+", "Status", "Actions"].map((column) => <th key={column} className="px-5 py-4 font-bold">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {visible.map((category) => (
                  <tr key={category.slug} className="transition hover:bg-white/45">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{category.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{category.description || category.seoDesc}</p>
                    </td>
                    <td className="px-5 py-4"><code className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">/{category.slug}</code></td>
                    <td className="px-5 py-4 text-muted">{category.profiles}</td>
                    <td className="px-5 py-4 text-muted">{category.iconName}</td>
                    <td className="px-5 py-4">{category.isAdult ? <StatusPill tone="amber">18+ {category.minimumAge}+</StatusPill> : <StatusPill tone="gray">Standard</StatusPill>}</td>
                    <td className="px-5 py-4"><StatusPill tone={category.status === "ACTIVE" ? "green" : "gray"}>{category.status === "ACTIVE" ? "Active" : "Draft"}</StatusPill></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <IconLink href={`/in/delhi/${category.slug}`} label="View"><Eye className="h-4 w-4" /></IconLink>
                        <IconButton label="Edit" onClick={() => editCategory(category)}><Pencil className="h-4 w-4" /></IconButton>
                        <IconButton label="Active" tone="green" onClick={() => updateStatus(category, "ACTIVE")}><CheckCircle2 className="h-4 w-4" /></IconButton>
                        <IconButton label="Draft" tone="gray" onClick={() => updateStatus(category, "DRAFT")}><PauseCircle className="h-4 w-4" /></IconButton>
                        <IconButton label="Delete" tone="red" onClick={() => deleteCategory(category)}><Trash2 className="h-4 w-4" /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 ? (
            <div className="p-6">
              <h3 className="text-xl font-semibold text-ink">No categories found</h3>
              <p className="mt-2 text-sm text-muted">Try another status filter or search term.</p>
            </div>
          ) : null}
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

function IconLink({ children, href, label }: { children: React.ReactNode; href: string; label: string }) {
  return (
    <Link title={label} aria-label={label} href={href} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-sm transition hover:bg-white hover:text-ink">
      {children}
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-cloud px-3 py-2 text-sm">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="break-words text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
