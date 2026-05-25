"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Ban, CalendarDays, CheckCircle2, Clock3, Eye, FilePenLine, Mail, MapPin, Pencil, Phone, Search, Star, Trash2, XCircle } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { activeFeaturedCampaign, featuredDaysRemaining, isFeaturedActive, isFeaturedExpired, listings as fallbackListings, type FeaturedPlacementRequest, type Listing, type ListingStatus } from "@/lib/data";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase, normalizeProfile, toApiStatus } from "@/lib/profiles";
import { effectiveVerificationStatus as resolveEffectiveVerificationStatus } from "@/lib/verification-status";

type ModalAction = "reject" | "suspend" | "delete";

const filters = ["ALL", "DRAFT", "PENDING", "APPROVED", "REJECTED", "SUSPENDED", "FEATURE_REQUESTS", "FEATURED", "EXPIRED_FEATURED", "ADULT", "VERIFICATION_PENDING"];
const verificationFilters = ["VERIFICATION_PENDING", "VERIFICATION_VERIFIED", "VERIFICATION_REJECTED", "ADULT", "ALL"];

function searchTokens(value: string) {
  return value.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function matchesSearch(tokens: string[], values: Array<string | number | boolean | undefined | null>) {
  if (!tokens.length) return true;
  const text = values.filter((value) => value !== undefined && value !== null).join(" ").toLowerCase();
  return tokens.every((token) => text.includes(token));
}

function statusTone(status: ListingStatus) {
  if (status === "draft") return "blue";
  if (status === "approved") return "green";
  if (status === "pending") return "amber";
  if (status === "rejected") return "red";
  return "gray";
}

function formatStatus(status: ListingStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatFilter(filter: string) {
  if (filter === "ALL") return "All";
  if (filter === "VERIFICATION_PENDING") return "Verification pending";
  if (filter === "VERIFICATION_VERIFIED") return "Verified";
  if (filter === "VERIFICATION_REJECTED") return "Verification rejected";
  if (filter === "FEATURE_REQUESTS") return "Feature requests";
  if (filter === "EXPIRED_FEATURED") return "Expired featured";
  if (filter === "ADULT") return "18+";
  return filter.charAt(0) + filter.slice(1).toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function defaultFeaturedDate() {
  const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function featuredUntilIso(value: string) {
  const date = new Date(`${value}T23:59:59.000Z`);
  return Number.isNaN(date.getTime()) ? new Date(`${defaultFeaturedDate()}T23:59:59.000Z`).toISOString() : date.toISOString();
}

function featuredLabel(listing: Listing) {
  if (isFeaturedActive(listing)) {
    const days = featuredDaysRemaining(listing);
    const campaign = activeFeaturedCampaign(listing);
    const scope = campaign?.pagePath === "ALL" ? "all pages" : campaign?.pagePath;
    const label = days ? `Active (${days}d left)` : "Active";
    return scope ? `${label} - ${scope}` : label;
  }
  if (isFeaturedExpired(listing)) return "Expired";
  return "Normal";
}

function latestFeaturedRequest(listing: Listing) {
  return [...(listing.featuredPlacementRequests || [])].sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return secondTime - firstTime;
  })[0];
}

function pendingFeaturedRequest(listing: Listing) {
  return (listing.featuredPlacementRequests || []).find((request) => request.status === "PENDING");
}

function featuredRequestLabel(request?: FeaturedPlacementRequest) {
  if (!request) return "No request";
  return `${request.status.toLowerCase()} - ${request.requestedDays}d - ${featuredPageLabel(request.requestedPage)}`;
}

function featuredPageLabel(value?: string) {
  if (value === "LISTINGS") return "all listings";
  if (value === "CITY") return "city page";
  if (value === "CATEGORY") return "category page";
  return "listing/city/category";
}

function listingVerificationStatus(listing: Listing) {
  return resolveEffectiveVerificationStatus({
    profileStatus: listing.verificationStatus,
    documents: listing.verificationDocuments,
    isAdult: listing.isAdult
  });
}

export function AdminListingsManager({ initialStatus = "ALL", mode = "listings" }: { initialStatus?: string; mode?: "listings" | "verification" }) {
  const [items, setItems] = useState<Listing[]>(fallbackListings);
  const [statusFilter, setStatusFilter] = useState(initialStatus.toUpperCase());
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ action: ModalAction; listing: Listing } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    adminFetch(`${getApiBase()}/api/admin/listings`)
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload: { data?: unknown[] } | undefined) => {
        if (mounted && Array.isArray(payload?.data)) setItems(payload.data.map(normalizeProfile));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const visible = useMemo(() => {
    const tokens = searchTokens(search);
    return items.filter((listing) => {
      const verificationStatus = listingVerificationStatus(listing);
      const statusMatch = statusFilter === "ALL" ||
        (statusFilter === "FEATURED" ? isFeaturedActive(listing) :
          statusFilter === "EXPIRED_FEATURED" ? isFeaturedExpired(listing) :
          statusFilter === "FEATURE_REQUESTS" ? Boolean(pendingFeaturedRequest(listing)) :
          statusFilter === "ADULT" ? listing.isAdult :
            statusFilter === "VERIFICATION_PENDING" ? listing.isAdult && verificationStatus === "PENDING" :
              statusFilter === "VERIFICATION_VERIFIED" ? listing.isAdult && verificationStatus === "VERIFIED" :
                statusFilter === "VERIFICATION_REJECTED" ? listing.isAdult && verificationStatus === "REJECTED" :
              listing.status === statusFilter.toLowerCase());
      const searchMatch = matchesSearch(tokens, [
        listing.name,
        listing.slug,
        listing.ownerName,
        listing.cityName,
        listing.city,
        listing.country,
        listing.category,
        listing.categorySlug,
        listing.email,
        listing.ownerEmail,
        listing.phone,
        listing.whatsapp,
        listing.website,
        listing.status,
        isFeaturedActive(listing) ? "featured active premium" : isFeaturedExpired(listing) ? "featured expired" : "normal",
        featuredRequestLabel(latestFeaturedRequest(listing)),
        listing.isAdult ? "18+ adult age restricted" : "standard",
        listing.verificationStatus,
        listing.services.join(" ")
      ]);
      return statusMatch && searchMatch;
    });
  }, [items, search, statusFilter]);

  function replaceListing(updated: Listing) {
    setItems((current) => current.map((listing) => listing.slug === updated.slug ? updated : listing));
  }

  async function updateStatus(listing: Listing, status: ListingStatus, reason?: string, notes?: string) {
    const optimistic = { ...listing, status, verified: status === "approved", rejectionReason: reason, adminNotes: notes };
    replaceListing(optimistic);
    setNotice(`${listing.name} moved to ${formatStatus(status)}.`);

    try {
      const response = await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toApiStatus(status), rejectionReason: reason, adminNotes: notes })
      });
      if (response.ok) {
        const payload = await response.json() as { data?: unknown };
        if (payload.data) replaceListing(normalizeProfile(payload.data));
      }
    } catch {
      undefined;
    }
  }

  async function updateFeatured(listing: Listing, featured: boolean) {
    const featuredUntil = featured
      ? featuredUntilIso(window.prompt("Featured expiry date (YYYY-MM-DD)", listing.featuredUntil?.slice(0, 10) || defaultFeaturedDate()) || defaultFeaturedDate())
      : undefined;
    const optimistic = { ...listing, featured, featuredUntil };
    replaceListing(optimistic);
    setNotice(featured ? `${listing.name} featured until ${formatDate(featuredUntil)}.` : `${listing.name} removed from featured.`);

    try {
      const response = await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: featured, featuredUntil })
      });
      if (response.ok) {
        const payload = await response.json() as { data?: unknown };
        if (payload.data) replaceListing(normalizeProfile(payload.data));
      }
    } catch {
      undefined;
    }
  }

  async function updateFeaturedRequest(listing: Listing, request: FeaturedPlacementRequest, status: "APPROVED" | "REJECTED") {
    setNotice(status === "APPROVED" ? `${listing.name} featured for ${request.requestedDays} days.` : `${listing.name} featured request rejected.`);
    const response = await adminFetch(`${getApiBase()}/api/admin/listings/featured-requests/${request.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    }).catch(() => undefined);

    if (!response?.ok) {
      setNotice("Featured request could not be updated.");
      return;
    }

    const payload = await response.json() as { data?: FeaturedPlacementRequest; profile?: unknown };
    if (payload.profile) {
      replaceListing(normalizeProfile(payload.profile));
    } else if (payload.data) {
      replaceListing({
        ...listing,
        featuredPlacementRequests: (listing.featuredPlacementRequests || []).map((item) => item.id === payload.data?.id ? payload.data as FeaturedPlacementRequest : item)
      });
    }
  }

  async function deleteListing(listing: Listing) {
    setItems((current) => current.filter((item) => item.slug !== listing.slug));
    setNotice(`${listing.name} deleted.`);
    try {
      await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}`, { method: "DELETE" });
    } catch {
      undefined;
    }
  }

  function openModal(action: ModalAction, listing: Listing) {
    setModal({ action, listing });
    setRejectionReason(listing.rejectionReason || "");
    setAdminNotes(listing.adminNotes || "");
  }

  async function confirmModal() {
    if (!modal) return;
    if (modal.action === "delete") {
      await deleteListing(modal.listing);
    } else if (modal.action === "reject") {
      await updateStatus(modal.listing, "rejected", rejectionReason || "Rejected by admin", adminNotes);
    } else {
      await updateStatus(modal.listing, "suspended", rejectionReason || "Suspended by admin", adminNotes);
    }
    setModal(null);
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow={mode === "verification" ? "Document verification" : "Listing manager"}
        title={mode === "verification" ? "Verify listing documents" : "Manage listings"}
        description={mode === "verification" ? "Review 18+ verification documents, approve identity checks, reject incomplete files and open each listing for full document review." : "Review every submitted profile, filter approval states, update featured placement and manage public visibility."}
      />

      <GlassCard className="mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(mode === "verification" ? verificationFilters : filters).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${statusFilter === filter ? "bg-ink text-white shadow-glass" : "bg-white/70 text-muted hover:bg-white hover:text-ink"}`}
              >
                {formatFilter(filter)}
              </button>
            ))}
          </div>
          <label className="relative block w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, owner, city, category, email, phone"
              className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
            />
          </label>
        </div>
        {notice ? <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold text-muted">{notice}</p> : null}
      </GlassCard>

      <GlassCard className="p-3 sm:p-4">
        <div className="grid gap-4">
          {visible.map((listing) => (
            <AdminListingCard
              key={listing.slug}
              listing={listing}
              onOpenModal={openModal}
              onUpdateFeatured={updateFeatured}
              onUpdateFeaturedRequest={updateFeaturedRequest}
              onUpdateStatus={updateStatus}
            />
          ))}
        </div>
        {visible.length === 0 ? (
          <div className="p-6">
            <h3 className="text-xl font-semibold text-ink">No listings found</h3>
            <p className="mt-2 text-sm text-muted">Try a different status filter or search term.</p>
          </div>
        ) : null}
      </GlassCard>

      {modal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="glass-strong w-full max-w-xl rounded-[2rem] p-6 shadow-glass">
            <h3 className="text-2xl font-semibold text-ink">
              {modal.action === "delete" ? "Delete listing" : modal.action === "reject" ? "Reject listing" : "Suspend listing"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Confirm this action for <span className="font-semibold text-ink">{modal.listing.name}</span>. Public pages only show approved listings.
            </p>
            {modal.action !== "delete" ? (
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-ink">Rejection / suspension reason</span>
                <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={3} className="w-full rounded-2xl border border-white bg-white/75 px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
              </label>
            ) : null}
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-ink">Admin notes</span>
              <textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={3} className="w-full rounded-2xl border border-white bg-white/75 px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-semibold text-ink shadow-sm">Cancel</button>
              <button onClick={confirmModal} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass">Confirm</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminListingCard({
  listing,
  onOpenModal,
  onUpdateFeatured,
  onUpdateFeaturedRequest,
  onUpdateStatus
}: {
  listing: Listing;
  onOpenModal: (action: ModalAction, listing: Listing) => void;
  onUpdateFeatured: (listing: Listing, featured: boolean) => void;
  onUpdateFeaturedRequest: (listing: Listing, request: FeaturedPlacementRequest, status: "APPROVED" | "REJECTED") => void;
  onUpdateStatus: (listing: Listing, status: ListingStatus) => void;
}) {
  const activeFeatured = isFeaturedActive(listing);
  const expiredFeatured = isFeaturedExpired(listing);
  const imageSrc = resolveAdminListingImage(listing.image || listing.coverImage || listing.avatarImage);
  const latestRequest = latestFeaturedRequest(listing);
  const pendingRequest = pendingFeaturedRequest(listing);
  const summary = listing.shortDescription || listing.about || "No profile description has been added yet.";
  const verificationStatus = listingVerificationStatus(listing);
  const adultVerificationTone: "blue" | "red" | "amber" = verificationStatus === "VERIFIED" ? "blue" : verificationStatus === "REJECTED" ? "red" : "amber";
  const location = [listing.cityName, listing.country?.toUpperCase()].filter(Boolean).join(", ");

  return (
    <article className={`group overflow-hidden rounded-[1.35rem] bg-white/85 shadow-sm ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-glow md:rounded-[1.8rem] ${activeFeatured ? "ring-amber-200" : ""}`}>
      <div className="grid grid-cols-[minmax(118px,35%)_minmax(0,1fr)] sm:grid-cols-[190px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative min-h-[190px] overflow-hidden bg-slate-100 sm:min-h-[230px]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={listing.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 35vw, (max-width: 1024px) 190px, 240px"
            />
          ) : (
            <div className="flex h-full min-h-[190px] items-center justify-center bg-gradient-to-br from-slate-100 to-amber-50 px-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-muted">
              No image
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-2 sm:left-4 sm:top-4">
            <StatusPill tone={statusTone(listing.status)}>{formatStatus(listing.status)}</StatusPill>
            {activeFeatured ? <StatusPill tone="blue">{featuredLabel(listing)}</StatusPill> : expiredFeatured ? <StatusPill tone="amber">Featured expired</StatusPill> : null}
          </div>
          {listing.isAdult ? (
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4">
              <StatusPill tone={adultVerificationTone}>18+ {verificationStatus.toLowerCase()}</StatusPill>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 p-3 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Link href={`/admin/listings/${listing.slug}`} className="flex min-w-0 items-center gap-2 text-base font-semibold leading-snug text-ink hover:text-champagne sm:text-xl">
                <span className="line-clamp-2 min-w-0">{listing.name}</span>
                {listing.isAdult && verificationStatus === "VERIFIED" ? <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" /> : null}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted sm:text-sm">
                <span>{listing.category}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{listing.ownerName}</span>
                {listing.isAdult ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">18+</span> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {activeFeatured ? <StatusPill tone="blue">Featured</StatusPill> : <StatusPill tone="gray">Normal</StatusPill>}
              <StatusPill tone={latestRequest?.status === "PENDING" ? "amber" : latestRequest?.status === "APPROVED" ? "green" : latestRequest?.status === "REJECTED" ? "red" : "gray"}>
                {latestRequest ? `${latestRequest.status.toLowerCase()} request` : "No request"}
              </StatusPill>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMeta icon={<MapPin className="h-4 w-4" />} label="Location" value={location || "-"} />
            <AdminMeta icon={<Phone className="h-4 w-4" />} label="Phone" value={listing.phone || "-"} />
            <AdminMeta icon={<Mail className="h-4 w-4" />} label="Email" value={listing.email || listing.ownerEmail || "-"} />
            <AdminMeta icon={<CalendarDays className="h-4 w-4" />} label="Created" value={formatDate(listing.createdAt)} />
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <p className="line-clamp-2 text-sm leading-6 text-muted">{summary}</p>
              {listing.services.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {listing.services.slice(0, 4).map((service) => (
                    <span key={service} className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold text-muted">{service}</span>
                  ))}
                </div>
              ) : null}
            </div>
            <FeatureRequestSummary request={latestRequest} />
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminActionButton href={`/admin/listings/${listing.slug}`} label="View Review"><Eye className="h-4 w-4" /> View Review</AdminActionButton>
              <AdminActionButton href={`/admin/profiles/${listing.slug}/edit`} label="Edit"><Pencil className="h-4 w-4" /> Edit</AdminActionButton>
              <AdminActionButton label="Draft" tone="blue" onClick={() => onUpdateStatus(listing, "draft")}><FilePenLine className="h-4 w-4" /> Draft</AdminActionButton>
              <AdminActionButton label="Pending" tone="amber" onClick={() => onUpdateStatus(listing, "pending")}><Clock3 className="h-4 w-4" /> Pending</AdminActionButton>
              <AdminActionButton label="Approve" tone="green" onClick={() => onUpdateStatus(listing, "approved")}><CheckCircle2 className="h-4 w-4" /> Approve</AdminActionButton>
              <AdminActionButton label="Reject" tone="red" onClick={() => onOpenModal("reject", listing)}><XCircle className="h-4 w-4" /> Reject</AdminActionButton>
              <AdminActionButton label="Suspend" tone="gray" onClick={() => onOpenModal("suspend", listing)}><Ban className="h-4 w-4" /> Suspend</AdminActionButton>
              <AdminActionButton label={activeFeatured ? "Remove Featured" : "Mark Featured"} tone="gold" onClick={() => onUpdateFeatured(listing, !activeFeatured)}><Star className="h-4 w-4" /> {activeFeatured ? "Remove Featured" : "Feature"}</AdminActionButton>
              {pendingRequest ? (
                <>
                  <AdminActionButton label="Approve Feature Request" tone="green" onClick={() => onUpdateFeaturedRequest(listing, pendingRequest, "APPROVED")}><CheckCircle2 className="h-4 w-4" /> Approve Request</AdminActionButton>
                  <AdminActionButton label="Reject Feature Request" tone="red" onClick={() => onUpdateFeaturedRequest(listing, pendingRequest, "REJECTED")}><XCircle className="h-4 w-4" /> Reject Request</AdminActionButton>
                </>
              ) : null}
              <AdminActionButton label="Delete" tone="red" onClick={() => onOpenModal("delete", listing)}><Trash2 className="h-4 w-4" /> Delete</AdminActionButton>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function resolveAdminListingImage(src?: string) {
  if (!src) return "";
  if (src.startsWith("/uploads/") || src.startsWith("/api/uploads/")) {
    return `${getApiBase().replace(/\/$/, "")}${src}`;
  }
  return src;
}

function AdminMeta({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-cloud px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{icon} {label}</p>
      <div className="mt-1 truncate text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function FeatureRequestSummary({ request }: { request?: FeaturedPlacementRequest }) {
  if (!request) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
        <StatusPill tone="gray">No request</StatusPill>
        <p className="mt-2 text-xs font-semibold text-muted">No featured placement request from this owner.</p>
      </div>
    );
  }

  const tone: "green" | "red" | "amber" = request.status === "APPROVED" ? "green" : request.status === "REJECTED" ? "red" : "amber";
  return (
    <div className="rounded-2xl bg-amber-50/60 px-4 py-3 ring-1 ring-amber-100">
      <StatusPill tone={tone}>{request.status.toLowerCase()} request</StatusPill>
      <p className="mt-2 text-sm font-semibold text-ink">{request.requestedDays} days on {featuredPageLabel(request.requestedPage)}</p>
      <p className="mt-1 truncate text-xs text-muted">{request.requestedPagePath || "No page path selected"}</p>
    </div>
  );
}

function AdminActionButton({
  children,
  href,
  label,
  onClick,
  tone = "default"
}: {
  children: ReactNode;
  href?: string;
  label: string;
  onClick?: () => void;
  tone?: "default" | "green" | "red" | "gray" | "blue" | "amber" | "gold";
}) {
  const tones = {
    default: "bg-white text-ink ring-slate-200 hover:bg-slate-50",
    green: "bg-emerald-600 text-white ring-emerald-200 hover:bg-emerald-700",
    red: "bg-rose-50 text-rose-700 ring-rose-100 hover:bg-rose-100",
    gray: "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-100 hover:bg-blue-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100 hover:bg-amber-100",
    gold: "bg-champagne text-white ring-amber-200 hover:bg-amber-600"
  };
  const className = `inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold shadow-sm ring-1 transition sm:px-4 ${tones[tone]}`;

  if (href) {
    return (
      <Link title={label} aria-label={label} href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
