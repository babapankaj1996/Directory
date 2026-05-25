"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Eye, FileText, Globe2, MessageCircle, Phone, Send, Star, Users, XCircle } from "lucide-react";
import { AdminSectionHeader, AdminStatCard, AdminTable, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { isFeaturedActive, isFeaturedExpired, listings as fallbackListings, type Listing, type ListingStatus } from "@/lib/data";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase, normalizeProfile, toApiStatus } from "@/lib/profiles";

type ProfileLead = {
  id: string;
  name: string;
  phone: string;
  serviceNeeded?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
  profile?: unknown;
};

export function AdminDashboard() {
  const [items, setItems] = useState<Listing[]>(fallbackListings);
  const [insights, setInsights] = useState({
    PROFILE_VIEW: 0,
    WHATSAPP_CLICK: 0,
    PHONE_CLICK: 0,
    WEBSITE_CLICK: 0,
    TOTAL_VIEW_COUNT: 0,
    LEAD_SUBMITTED: 0
  });
  const [leads, setLeads] = useState<ProfileLead[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      adminFetch(`${getApiBase()}/api/admin/listings`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      adminFetch(`${getApiBase()}/api/admin/insights`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      adminFetch(`${getApiBase()}/api/admin/quotes?limit=8`).then((response) => response.ok ? response.json() : undefined).catch(() => undefined)
    ])
      .then(([listingPayload, insightPayload, leadPayload]: [{ data?: unknown[] } | undefined, { data?: { summary?: Partial<typeof insights> } } | undefined, { data?: ProfileLead[] } | undefined]) => {
        if (!mounted) return;
        if (Array.isArray(listingPayload?.data)) setItems(listingPayload.data.map(normalizeProfile));
        if (insightPayload?.data?.summary) setInsights((current) => ({ ...current, ...insightPayload.data?.summary }));
        if (Array.isArray(leadPayload?.data)) setLeads(leadPayload.data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: items.length,
      pending: items.filter((listing) => listing.status === "pending").length,
      approved: items.filter((listing) => listing.status === "approved").length,
      rejected: items.filter((listing) => listing.status === "rejected").length,
      featured: items.filter((listing) => isFeaturedActive(listing)).length,
      expiredFeatured: items.filter((listing) => isFeaturedExpired(listing)).length,
      newThisWeek: items.filter((listing) => listing.createdAt && new Date(listing.createdAt).getTime() >= weekAgo).length
    };
  }, [items]);

  async function updateStatus(listing: Listing, status: ListingStatus, reason?: string) {
    setItems((current) => current.map((item) => item.slug === listing.slug ? { ...item, status, verified: status === "approved", rejectionReason: reason } : item));
    try {
      await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toApiStatus(status), rejectionReason: reason, adminNotes: reason })
      });
    } catch {
      undefined;
    }
  }

  const pendingListings = items.filter((listing) => listing.status === "pending").slice(0, 5);

  return (
    <div>
      <AdminSectionHeader
        eyebrow="Dashboard"
        title="Website control overview"
        description="Review listing approvals, featured inventory and directory health from one glass dashboard."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label="Total listings" value={String(counts.total)} note="All statuses" icon={<Users className="h-5 w-5" />} />
        <AdminStatCard label="Pending approvals" value={String(counts.pending)} note="Needs review" icon={<Clock3 className="h-5 w-5" />} />
        <AdminStatCard label="Approved listings" value={String(counts.approved)} note="Publicly visible" icon={<CheckCircle2 className="h-5 w-5" />} />
        <AdminStatCard label="Rejected listings" value={String(counts.rejected)} note="Hidden from public" icon={<XCircle className="h-5 w-5" />} />
        <AdminStatCard label="Active featured" value={String(counts.featured)} note={counts.expiredFeatured ? `${counts.expiredFeatured} expired` : "Premium placement"} icon={<Star className="h-5 w-5" />} />
        <AdminStatCard label="New listings this week" value={String(counts.newThisWeek)} note="Recent submissions" icon={<FileText className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Total views" value={String(insights.TOTAL_VIEW_COUNT || items.reduce((sum, listing) => sum + listing.viewCount, 0))} note="Synced profile counter" icon={<Eye className="h-5 w-5" />} />
        <AdminStatCard label="30d profile views" value={String(insights.PROFILE_VIEW)} note="Tracked page opens" icon={<Eye className="h-5 w-5" />} />
        <AdminStatCard label="30d WhatsApp clicks" value={String(insights.WHATSAPP_CLICK)} note="Direct owner leads" icon={<MessageCircle className="h-5 w-5" />} />
        <AdminStatCard label="30d call / web clicks" value={String(insights.PHONE_CLICK + insights.WEBSITE_CLICK)} note="Phone and website actions" icon={insights.PHONE_CLICK >= insights.WEBSITE_CLICK ? <Phone className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />} />
        <AdminStatCard label="30d quote requests" value={String(insights.LEAD_SUBMITTED)} note="Profile lead forms" icon={<Send className="h-5 w-5" />} />
      </div>

      <div className="mt-6">
        <AdminSectionHeader
          eyebrow="Leads"
          title="Latest quote requests"
          description="Recent public service requests from profile pages. Owners can manage the full lead inbox from their dashboard."
          actionHref="/admin/quotes"
          actionLabel="Open quotes"
        />
        <AdminTable
          columns={["Customer", "Profile", "Service", "Phone", "Status"]}
          rows={leads.map((lead) => {
            const profile = lead.profile ? normalizeProfile(lead.profile) : undefined;
            return [
              <span key="name" className="font-semibold text-ink">{lead.name}</span>,
              profile ? profile.name : "-",
              lead.serviceNeeded || "Service request",
              lead.phone,
              <StatusPill key="status" tone={lead.status === "CONVERTED" ? "green" : lead.status === "CONTACTED" ? "amber" : lead.status === "NEW" ? "blue" : "gray"}>{lead.status.toLowerCase()}</StatusPill>
            ];
          })}
        />
        {leads.length === 0 ? (
          <GlassCard className="mt-4">
            <StatusPill tone="gray">No leads</StatusPill>
            <p className="mt-3 text-sm text-muted">New quote requests will appear here after visitors submit profile forms.</p>
          </GlassCard>
        ) : null}
      </div>

      <div className="mt-6">
        <AdminSectionHeader
          eyebrow="Pending approval"
          title="Latest listings to review"
          description="Approve clean listings quickly or reject submissions that need corrected verification."
          actionHref="/admin/listings?status=PENDING"
          actionLabel="Open listings"
        />
        <AdminTable
          columns={["Business", "Category", "City", "Owner", "Actions"]}
          rows={pendingListings.map((listing) => [
            <span key="business" className="font-semibold text-ink">{listing.name}</span>,
            listing.category,
            listing.cityName,
            listing.ownerName,
            <div key="actions" className="flex flex-wrap gap-2">
              <button className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100" onClick={() => updateStatus(listing, "approved")}>Approve</button>
              <button className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100" onClick={() => updateStatus(listing, "rejected", window.prompt("Rejection reason") || "Rejected by admin")}>Reject</button>
            </div>
          ])}
        />
        {pendingListings.length === 0 ? (
          <GlassCard className="mt-4">
            <StatusPill tone="green">Clear</StatusPill>
            <p className="mt-3 text-sm text-muted">No pending listings need review right now.</p>
          </GlassCard>
        ) : null}
      </div>
    </div>
  );
}
