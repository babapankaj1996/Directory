import Link from "next/link";
import type { ReactNode } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

export function AdminSectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-champagne">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{title}</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass transition hover:-translate-y-0.5">
          <Plus className="h-4 w-4" /> {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function AdminStatCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: ReactNode }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-600">{note}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-champagne shadow-sm">{icon}</span>
      </div>
    </GlassCard>
  );
}

export function StatusPill({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "blue" | "red" | "gray" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    red: "bg-rose-50 text-rose-700 ring-rose-100",
    gray: "bg-slate-50 text-slate-600 ring-slate-100"
  };

  return <span className={cn("rounded-full px-3 py-1 text-xs font-bold ring-1", tones[tone])}>{children}</span>;
}

export function AdminTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="grid gap-3 p-4 md:hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="border-b border-slate-100 py-3 last:border-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{columns[cellIndex]}</p>
                <div className="mt-1 break-words text-sm font-semibold text-ink">{cell}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-bold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/70">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition hover:bg-white/45">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-5 py-4 align-middle text-muted">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

export function AdminActions({ viewHref, editHref }: { viewHref?: string; editHref?: string }) {
  return (
    <div className="flex items-center gap-2">
      {viewHref ? (
        <Link href={viewHref} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-sm transition hover:text-ink" aria-label="View">
          <Eye className="h-4 w-4" />
        </Link>
      ) : null}
      {editHref ? (
        <Link href={editHref} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-sm transition hover:text-ink" aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Link>
      ) : null}
      <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm transition hover:bg-rose-50" aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AdminField({ label, placeholder, value, type = "text" }: { label: string; placeholder?: string; value?: string; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

export function AdminTextarea({ label, placeholder, value }: { label: string; placeholder?: string; value?: string }) {
  return (
    <label className="md:col-span-2">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <textarea
        rows={5}
        placeholder={placeholder}
        defaultValue={value}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}
