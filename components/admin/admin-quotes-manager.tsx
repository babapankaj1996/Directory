"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Flame, Mail, MessageCircle, Phone, Search, Send, Timer, TrendingUp, XCircle } from "lucide-react";
import { AdminSectionHeader, AdminStatCard, AdminTable, StatusPill } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase, normalizeProfile } from "@/lib/profiles";
import type { Listing } from "@/lib/data";

type LeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "LOST" | "SPAM";

type QuoteLead = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  whatsapp?: string | null;
  serviceNeeded?: string | null;
  budget?: string | null;
  timeline?: string | null;
  contactPreference?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  message?: string | null;
  sourcePath?: string | null;
  leadScore?: number;
  leadQuality?: "HOT" | "WARM" | "COLD" | string;
  status: LeadStatus | string;
  adminNote?: string | null;
  ownerNote?: string | null;
  responseAt?: string | null;
  convertedAt?: string | null;
  createdAt: string;
  profile?: unknown;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

type LeadQualitySummary = {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  avgScore: number;
  avgResponseMinutes: number | null;
  conversionRate: number;
  contactRate: number;
  viewToLeadRate: number;
};

const emptyQuality: LeadQualitySummary = {
  total: 0,
  hot: 0,
  warm: 0,
  cold: 0,
  avgScore: 0,
  avgResponseMinutes: null,
  conversionRate: 0,
  contactRate: 0,
  viewToLeadRate: 0
};

const statusOptions = ["ALL", "NEW", "CONTACTED", "CONVERTED", "LOST", "SPAM"] as const;
const editableStatuses: LeadStatus[] = ["NEW", "CONTACTED", "CONVERTED", "LOST", "SPAM"];

export function AdminQuotesManager() {
  const [leads, setLeads] = useState<QuoteLead[]>([]);
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [quality, setQuality] = useState<LeadQualitySummary>(emptyQuality);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (status !== "ALL") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());

      Promise.all([
        adminFetch(`${getApiBase()}/api/admin/quotes?${params.toString()}`).then((response) => response.ok ? response.json() : undefined),
        adminFetch(`${getApiBase()}/api/admin/quotes/quality`).then((response) => response.ok ? response.json() : undefined)
      ])
        .then(([payload, qualityPayload]: [{ data?: QuoteLead[] } | undefined, { data?: { summary?: Partial<LeadQualitySummary> } } | undefined]) => {
          if (!mounted) return;
          setLeads(Array.isArray(payload?.data) ? payload.data : []);
          if (qualityPayload?.data?.summary) setQuality({ ...emptyQuality, ...qualityPayload.data.summary });
        })
        .catch(() => {
          if (mounted) setNotice("Could not load quote requests.");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, search.trim() ? 250 : 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [status, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((lead) => lead.status === "NEW").length,
    contacted: leads.filter((lead) => lead.status === "CONTACTED").length,
    converted: leads.filter((lead) => lead.status === "CONVERTED").length,
    lost: leads.filter((lead) => lead.status === "LOST").length
  }), [leads]);

  async function updateStatus(lead: QuoteLead, nextStatus: LeadStatus) {
    setNotice("");
    setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status: nextStatus } : item));
    const response = await adminFetch(`${getApiBase()}/api/admin/quotes/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, adminNote: lead.adminNote })
    }).catch(() => undefined);

    if (!response?.ok) {
      setLeads((current) => current.map((item) => item.id === lead.id ? lead : item));
      setNotice("Status could not be updated.");
      return;
    }

    const payload = await response.json() as { data?: QuoteLead };
    if (payload.data) {
      setLeads((current) => current.map((item) => item.id === lead.id ? payload.data as QuoteLead : item));
      setNotice("Quote status updated.");
    }
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow="Quotes"
        title="Quote request inbox"
        description="See every service request submitted from public profile pages, search by customer or listing, and track status from the admin panel."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Visible rows" value={String(stats.total)} note={status === "ALL" ? "Current filter" : status.toLowerCase()} icon={<Send className="h-5 w-5" />} />
        <AdminStatCard label="New" value={String(stats.new)} note="Needs first response" icon={<Clock3 className="h-5 w-5" />} />
        <AdminStatCard label="Contacted" value={String(stats.contacted)} note="Owner/admin reached out" icon={<Phone className="h-5 w-5" />} />
        <AdminStatCard label="Converted" value={String(stats.converted)} note="Successful requests" icon={<CheckCircle2 className="h-5 w-5" />} />
        <AdminStatCard label="Lost" value={String(stats.lost)} note="Closed without sale" icon={<XCircle className="h-5 w-5" />} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Avg lead score" value={`${quality.avgScore}/100`} note="Last 30 days" icon={<BarChart3 className="h-5 w-5" />} />
        <AdminStatCard label="Hot leads" value={String(quality.hot)} note={`${quality.warm} warm, ${quality.cold} cold`} icon={<Flame className="h-5 w-5" />} />
        <AdminStatCard label="Avg response" value={formatMinutes(quality.avgResponseMinutes)} note="First owner contact" icon={<Timer className="h-5 w-5" />} />
        <AdminStatCard label="Won rate" value={`${quality.conversionRate}%`} note="Converted quotes" icon={<TrendingUp className="h-5 w-5" />} />
        <AdminStatCard label="View to lead" value={`${quality.viewToLeadRate}%`} note="Profile views to quotes" icon={<Send className="h-5 w-5" />} />
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-white/55 p-3 shadow-sm ring-1 ring-white/70 md:p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, phone, email, service, listing, owner, city or category"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-ink outline-none placeholder:text-muted/75 focus:border-champagne focus:ring-4 focus:ring-amber-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                  status === option ? "bg-ink text-white shadow-glass" : "bg-white text-muted ring-1 ring-slate-200 hover:text-ink"
                }`}
              >
                {option === "ALL" ? "All" : option.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notice ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{notice}</p> : null}

      <div className="mt-6">
        <AdminTable
          columns={["Customer", "Listing", "Request", "Quality", "Contact", "Status", "Actions"]}
          rows={leads.map((lead) => {
            const profile = lead.profile ? normalizeProfile(lead.profile) : undefined;
            return [
              <CustomerCell key="customer" lead={lead} />,
              <ListingCell key="listing" profile={profile} />,
              <RequestCell key="request" lead={lead} />,
              <QualityCell key="quality" lead={lead} />,
              <ContactCell key="contact" lead={lead} />,
              <select
                key="status"
                value={lead.status}
                onChange={(event) => updateStatus(lead, event.target.value as LeadStatus)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
              >
                {editableStatuses.map((option) => <option key={option} value={option}>{option.toLowerCase()}</option>)}
              </select>,
              <ActionCell key="actions" lead={lead} profile={profile} />
            ];
          })}
        />

        {!loading && leads.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <StatusPill tone="gray">No quotes</StatusPill>
            <h3 className="mt-3 text-xl font-semibold text-ink">No quote requests found</h3>
            <p className="mt-2 text-sm leading-6 text-muted">Try another status filter or search term. New quote requests from profile pages will appear here.</p>
          </div>
        ) : null}
        {loading ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-muted ring-1 ring-slate-200">Loading quote requests...</p> : null}
      </div>
    </div>
  );
}

function CustomerCell({ lead }: { lead: QuoteLead }) {
  const date = new Date(lead.createdAt);
  const created = Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
  return (
    <div className="min-w-[13rem]">
      <p className="font-semibold text-ink">{lead.name}</p>
      {lead.user ? <p className="mt-1 text-xs text-muted">Logged in: {lead.user.name || lead.user.email}</p> : <p className="mt-1 text-xs text-muted">Guest request</p>}
      {created ? <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-cloud px-3 py-1 text-xs font-bold text-muted"><CalendarDays className="h-3.5 w-3.5" /> {created}</p> : null}
    </div>
  );
}

function ListingCell({ profile }: { profile?: Listing }) {
  if (!profile) return <span>-</span>;
  return (
    <div className="min-w-[13rem]">
      <Link href={`/admin/listings/${profile.slug}`} className="font-semibold text-ink hover:text-champagne">{profile.name}</Link>
      <p className="mt-1 text-xs text-muted">{profile.category} in {profile.cityName}</p>
      <p className="mt-1 text-xs text-muted">Owner: {profile.ownerName}</p>
    </div>
  );
}

function RequestCell({ lead }: { lead: QuoteLead }) {
  const preferred = [lead.preferredDate?.slice(0, 10), lead.preferredTime].filter(Boolean).join(" ");
  return (
    <div className="min-w-[14rem]">
      <StatusPill tone={leadTone(lead.status)}>{lead.status.toLowerCase()}</StatusPill>
      <p className="mt-2 font-semibold text-ink">{lead.serviceNeeded || "Service request"}</p>
      {preferred ? <p className="mt-1 text-xs text-muted">Preferred: {preferred}</p> : null}
      {lead.budget ? <p className="mt-1 text-xs text-muted">Budget: {lead.budget}</p> : null}
      {lead.timeline ? <p className="mt-1 text-xs text-muted">Timeline: {lead.timeline}</p> : null}
      {lead.message ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{lead.message}</p> : null}
      {lead.adminNote ? <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800 ring-1 ring-amber-100">Admin note: {lead.adminNote}</p> : null}
    </div>
  );
}

function QualityCell({ lead }: { lead: QuoteLead }) {
  return (
    <div className="min-w-[11rem]">
      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${leadQualityTone(lead.leadQuality)}`}>
        {lead.leadQuality || "warm"} {lead.leadScore ?? 0}/100
      </span>
      {lead.contactPreference ? <p className="mt-2 text-xs font-semibold text-muted">Prefers {lead.contactPreference}</p> : null}
      {lead.sourcePath ? <p className="mt-1 max-w-[14rem] truncate text-xs text-muted">Source: {lead.sourcePath}</p> : null}
      {lead.responseAt ? <p className="mt-1 text-xs font-semibold text-emerald-700">Responded in {formatResponseFromLead(lead)}</p> : null}
    </div>
  );
}

function ContactCell({ lead }: { lead: QuoteLead }) {
  return (
    <div className="min-w-[12rem] space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Phone className="h-4 w-4 text-champagne" /> {lead.phone}</p>
      {lead.email ? <p className="flex items-center gap-2 text-xs text-muted"><Mail className="h-4 w-4 text-champagne" /> {lead.email}</p> : null}
      {lead.whatsapp ? <p className="flex items-center gap-2 text-xs text-muted"><MessageCircle className="h-4 w-4 text-champagne" /> {lead.whatsapp}</p> : null}
    </div>
  );
}

function ActionCell({ lead, profile }: { lead: QuoteLead; profile?: Listing }) {
  const whatsapp = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
  return (
    <div className="flex min-w-[11rem] flex-wrap gap-2">
      {whatsapp ? <Button href={`https://wa.me/${whatsapp}`} variant="gold" className="py-2.5"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</Button> : null}
      {lead.phone ? <Button href={`tel:${lead.phone.replace(/\s+/g, "")}`} variant="ghost" className="py-2.5"><Phone className="mr-2 h-4 w-4" /> Call</Button> : null}
      {profile ? <Button href={`/${profile.country}/${profile.city}/${profile.categorySlug}/${profile.slug}`} variant="ghost" className="py-2.5">Public</Button> : null}
    </div>
  );
}

function leadTone(status: string): "green" | "amber" | "blue" | "red" | "gray" {
  if (status === "CONVERTED") return "green";
  if (status === "CONTACTED") return "amber";
  if (status === "NEW") return "blue";
  if (status === "SPAM") return "red";
  return "gray";
}

function leadQualityTone(quality?: string | null) {
  const normalized = String(quality || "WARM").toUpperCase();
  if (normalized === "HOT") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (normalized === "COLD") return "bg-slate-50 text-slate-700 ring-slate-100";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

function formatMinutes(value?: number | null) {
  if (!value && value !== 0) return "-";
  if (value < 60) return `${value}m`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatResponseFromLead(lead: QuoteLead) {
  if (!lead.responseAt) return "-";
  const created = new Date(lead.createdAt).getTime();
  const responded = new Date(lead.responseAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(responded) || responded < created) return "-";
  return formatMinutes(Math.round((responded - created) / 60000));
}
