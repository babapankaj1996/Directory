"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Ban, CheckCircle2, Clock3, ExternalLink, FilePenLine, FileText, FileVideo, ImagePlus, Pencil, Plus, Save, ShieldCheck, Star, Trash2, XCircle } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { UploadField } from "@/components/upload-field";
import { activeFeaturedCampaign, featuredDaysRemaining, isFeaturedActive, isFeaturedExpired, type FeaturedPlacementRequest, type Listing, type ListingStatus, type ProfileGalleryImage, type ProfileVerificationDocument } from "@/lib/data";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase, normalizeGalleryImage, normalizeProfile, toApiStatus } from "@/lib/profiles";
import { effectiveVerificationStatus as resolveEffectiveVerificationStatus } from "@/lib/verification-status";

const MAX_PROFILE_GALLERY_IMAGES = 10;
const documentTypes = [
  { value: "GOV_ID", label: "Government ID" },
  { value: "AGE_SELFIE", label: "DOB selfie/photo" },
  { value: "BUSINESS_LICENSE", label: "Business license" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ADDRESS_PROOF", label: "Address proof" },
  { value: "OTHER", label: "Other document" }
];
const reviewTabs = [
  { id: "overview", label: "Overview" },
  { id: "gallery", label: "Gallery" },
  { id: "documents", label: "Verified documents" },
  { id: "controls", label: "Controls" }
] as const;

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

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function defaultFeaturedDate() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function featuredUntilIso(value: string) {
  const date = new Date(`${value}T23:59:59.000Z`);
  return Number.isNaN(date.getTime()) ? new Date(`${defaultFeaturedDate()}T23:59:59.000Z`).toISOString() : date.toISOString();
}

function featuredStatusLabel(listing: Listing) {
  if (isFeaturedActive(listing)) {
    const days = featuredDaysRemaining(listing);
    const campaign = activeFeaturedCampaign(listing);
    const scope = campaign?.pagePath === "ALL" ? "all pages" : campaign?.pagePath;
    const label = days ? `Active featured (${days} days left)` : "Active featured";
    return scope ? `${label} on ${scope}` : label;
  }
  if (isFeaturedExpired(listing)) return "Featured expired";
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
  return `${request.status.toLowerCase()} - ${request.requestedDays} days - ${featuredPageLabel(request.requestedPage)}`;
}

function featuredPageLabel(value?: string) {
  if (value === "LISTINGS") return "all listings";
  if (value === "CITY") return "city page";
  if (value === "CATEGORY") return "category page";
  return "listing/city/category";
}

function listingVerificationStatus(listing: Listing, documents: ProfileVerificationDocument[]) {
  return resolveEffectiveVerificationStatus({
    profileStatus: listing.verificationStatus,
    documents,
    isAdult: listing.isAdult
  });
}

export function AdminListingReview({ listing: initialListing, gallery: initialGallery }: { listing: Listing; gallery: ProfileGalleryImage[] }) {
  const [listing, setListing] = useState(initialListing);
  const [gallery, setGallery] = useState(initialGallery);
  const [verificationDocuments, setVerificationDocuments] = useState<ProfileVerificationDocument[]>(initialListing.verificationDocuments || []);
  const [verificationNotes, setVerificationNotes] = useState(initialListing.verificationNotes || "");
  const [moderationNote, setModerationNote] = useState(initialListing.rejectionReason || initialListing.adminNotes || "");
  const [notice, setNotice] = useState("");
  const [newDocument, setNewDocument] = useState({
    type: "GOV_ID",
    fileUrl: "",
    originalName: "",
    adminNotes: ""
  });
  const [newImage, setNewImage] = useState({
    imageUrl: "",
    title: "",
    altText: ""
  });

  const certificates = useMemo(() => gallery.filter((image) => image.category === "Certificates"), [gallery]);
  const galleryLimitReached = gallery.length >= MAX_PROFILE_GALLERY_IMAGES;
  const publicHref = `/${listing.country}/${listing.city}/${listing.categorySlug}/${listing.slug}`;
  const pendingRequest = pendingFeaturedRequest(listing);
  const latestRequest = latestFeaturedRequest(listing);
  const submittedDocumentTypes = useMemo(() => new Set(verificationDocuments.map((document) => document.type)), [verificationDocuments]);
  const missingRequiredDocs = listing.isAdult ? ["GOV_ID", "AGE_SELFIE"].filter((type) => !submittedDocumentTypes.has(type)) : [];
  const effectiveVerification = listingVerificationStatus(listing, verificationDocuments);
  const reviewWarnings = [
    !listing.about?.trim() && "Description is missing",
    !gallery.length && "Gallery media is missing",
    listing.isAdult && missingRequiredDocs.length ? `Missing 18+ document(s): ${missingRequiredDocs.map(documentLabel).join(", ")}` : "",
    listing.isAdult && effectiveVerification !== "VERIFIED" ? "18+ ID verification is not marked verified" : ""
  ].filter((warning): warning is string => Boolean(warning));

  async function updateStatus(status: ListingStatus, reasonOverride?: string) {
    const cleanNote = (reasonOverride ?? moderationNote).trim();
    const reason = status === "rejected" || status === "suspended" ? cleanNote || `${formatStatus(status)} by admin` : undefined;
    const adminNotes = cleanNote || listing.adminNotes;
    const optimistic = { ...listing, status, verified: status === "approved", rejectionReason: reason, adminNotes };
    setListing(optimistic);
    setNotice(`${listing.name} moved to ${formatStatus(status)}.`);

    try {
      const response = await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toApiStatus(status), rejectionReason: reason, adminNotes })
      });
      if (response.ok) {
        const payload = await response.json() as { data?: unknown };
        if (payload.data) setListing(normalizeProfile(payload.data));
      }
    } catch {
      undefined;
    }
  }

  async function toggleFeatured() {
    const nextFeatured = !isFeaturedActive(listing);
    const featuredUntil = nextFeatured
      ? featuredUntilIso(window.prompt("Featured expiry date (YYYY-MM-DD)", listing.featuredUntil?.slice(0, 10) || defaultFeaturedDate()) || defaultFeaturedDate())
      : undefined;
    setListing({ ...listing, featured: nextFeatured, featuredUntil });
    setNotice(nextFeatured ? `Listing featured until ${formatDate(featuredUntil)}.` : "Listing removed from featured.");

    try {
      const response = await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: nextFeatured, featuredUntil })
      });
      if (response.ok) {
        const payload = await response.json() as { data?: unknown };
        if (payload.data) setListing(normalizeProfile(payload.data));
      }
    } catch {
      undefined;
    }
  }

  async function updateFeaturedRequest(request: FeaturedPlacementRequest, status: "APPROVED" | "REJECTED") {
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
    if (payload.profile) setListing(normalizeProfile(payload.profile));
    setNotice(status === "APPROVED" ? `Featured request approved for ${request.requestedDays} days.` : "Featured request rejected.");
  }

  async function addGalleryImage() {
    if (!newImage.imageUrl.trim()) return;
    if (galleryLimitReached) {
      setNotice(`Gallery limit reached. Profiles can have up to ${MAX_PROFILE_GALLERY_IMAGES} media items.`);
      return;
    }
    const video = isVideoMedia(newImage.imageUrl);
    const optimistic: ProfileGalleryImage = {
      id: `local-${Date.now()}`,
      profileSlug: listing.slug,
      imageUrl: newImage.imageUrl,
      title: newImage.title || (video ? "Profile video" : "Gallery media"),
      altText: newImage.altText || newImage.title || `${listing.name} gallery media`,
      category: video ? "Videos" : "Gallery",
      sortOrder: gallery.length + 1,
      isActive: true
    };
    setGallery((current) => [...current, optimistic]);
    setNewImage({ imageUrl: "", title: "", altText: "" });

    try {
      const response = await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic)
      });
      if (response.ok) {
        const payload = await response.json() as { data?: unknown };
        if (payload.data) setGallery((current) => current.map((image) => image.id === optimistic.id ? normalizeGalleryImage(payload.data) : image));
      }
    } catch {
      undefined;
    }
  }

  async function editGalleryImage(image: ProfileGalleryImage) {
    const title = window.prompt("Media title", image.title || "") ?? image.title;
    const updated = { ...image, title };
    setGallery((current) => current.map((item) => item.id === image.id ? updated : item));

    try {
      const response = await adminFetch(`${getApiBase()}/api/admin/gallery/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        const payload = await response.json() as { data?: unknown };
        if (payload.data) setGallery((current) => current.map((item) => item.id === image.id ? normalizeGalleryImage(payload.data) : item));
      }
    } catch {
      undefined;
    }
  }

  async function deleteGalleryImage(image: ProfileGalleryImage) {
    if (!window.confirm("Delete this gallery media?")) return;
    setGallery((current) => current.filter((item) => item.id !== image.id));
    try {
      await adminFetch(`${getApiBase()}/api/admin/gallery/${image.id}`, { method: "DELETE" });
    } catch {
      undefined;
    }
  }

  async function updateDocumentStatus(document: ProfileVerificationDocument, status: string) {
    setVerificationDocuments((current) => current.map((item) => item.id === document.id ? { ...item, status } : item));
  }

  function updateDocumentNote(document: ProfileVerificationDocument, adminNotes: string) {
    setVerificationDocuments((current) => current.map((item) => item.id === document.id ? { ...item, adminNotes } : item));
  }

  async function addVerificationDocument() {
    if (!newDocument.fileUrl.trim()) {
      setNotice("Upload or paste a verification document first.");
      return;
    }
    const optimistic: ProfileVerificationDocument = {
      id: `local-doc-${Date.now()}`,
      profileId: listing.id,
      type: newDocument.type,
      fileUrl: newDocument.fileUrl,
      originalName: newDocument.originalName || undefined,
      status: "PENDING",
      adminNotes: newDocument.adminNotes || undefined
    };
    setVerificationDocuments((current) => [...current, optimistic]);
    setNewDocument({ type: "GOV_ID", fileUrl: "", originalName: "", adminNotes: "" });

    try {
      const response = await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/verification-documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic)
      });
      if (!response.ok) throw new Error("Document could not be saved.");
      const payload = await response.json() as { data?: ProfileVerificationDocument };
      if (payload.data) {
        setVerificationDocuments((current) => current.map((item) => item.id === optimistic.id ? payload.data as ProfileVerificationDocument : item));
      }
      setNotice("Verification document added.");
    } catch {
      setVerificationDocuments((current) => current.filter((item) => item.id !== optimistic.id));
      setNotice("Verification document upload was not saved.");
    }
  }

  async function deleteVerificationDocument(document: ProfileVerificationDocument) {
    if (!document.id || !window.confirm("Delete this verification document?")) return;
    setVerificationDocuments((current) => current.filter((item) => item.id !== document.id));
    try {
      await adminFetch(`${getApiBase()}/api/admin/listings/verification-documents/${document.id}`, { method: "DELETE" });
      setNotice("Verification document deleted.");
    } catch {
      setNotice("Verification document removed locally, but backend delete failed.");
    }
  }

  async function saveVerification(status: "VERIFIED" | "PENDING" | "REJECTED") {
    const nextDocuments = verificationDocuments.map((document) => ({
      ...document,
      status: status === "VERIFIED" ? "VERIFIED" : status === "REJECTED" ? "REJECTED" : document.status || "PENDING"
    }));
    if (status === "VERIFIED" || status === "REJECTED") setVerificationDocuments(nextDocuments);
    const response = await adminFetch(`${getApiBase()}/api/admin/listings/${listing.id || listing.slug}/verification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationStatus: status,
        verificationNotes,
        documents: nextDocuments.map((document) => ({
          id: document.id,
          status: document.status || "PENDING",
          adminNotes: document.adminNotes
        }))
      })
    }).catch(() => undefined);
    if (response?.ok) {
      const payload = await response.json() as { data?: unknown };
      if (payload.data) {
        const updated = normalizeProfile(payload.data);
        setListing(updated);
        setVerificationDocuments(updated.verificationDocuments || []);
      }
      setNotice(`Verification marked ${status.toLowerCase()}.`);
    } else {
      setNotice("Verification update failed.");
    }
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow="Listing review"
        title={listing.name}
        description={`Review submitted details, moderation status, SEO content and media assets for ${publicHref}.`}
      />

      <GlassCard className="mb-6 overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-72 overflow-hidden bg-shade">
            <Image src={listing.coverImage || listing.image} alt={listing.name} fill className="object-cover opacity-80" sizes="(min-width: 1024px) 55vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-shade/85 via-shade/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-7">
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={statusTone(listing.status)}>{formatStatus(listing.status)}</StatusPill>
                <StatusPill tone={listing.isAdult ? "amber" : "gray"}>{listing.isAdult ? "18+ listing" : "Standard"}</StatusPill>
                <StatusPill tone={effectiveVerification === "VERIFIED" ? "blue" : effectiveVerification === "REJECTED" ? "red" : "gray"}>{effectiveVerification.toLowerCase()}</StatusPill>
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">{listing.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{listing.shortDescription || listing.about}</p>
            </div>
          </div>
          <div className="grid content-between gap-5 bg-white/75 p-5 md:p-7">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={isFeaturedActive(listing) ? "blue" : isFeaturedExpired(listing) ? "amber" : "gray"}>{featuredStatusLabel(listing)}</StatusPill>
                {pendingRequest ? <StatusPill tone="amber">Feature request pending</StatusPill> : null}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ReviewMetric label="Gallery" value={`${gallery.length}/${MAX_PROFILE_GALLERY_IMAGES}`} note="public media" />
                <ReviewMetric label="Documents" value={String(verificationDocuments.length)} note={listing.isAdult ? "18+ proof" : "verification"} />
                <ReviewMetric label="City" value={listing.cityName} note={listing.country.toUpperCase()} />
                <ReviewMetric label="Category" value={listing.category} note={listing.categorySlug} />
              </div>
            </div>
            <div className={reviewWarnings.length ? "rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100" : "rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"}>
              <div className="flex items-start gap-3">
                {reviewWarnings.length ? <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />}
                <div>
                  <p className={`text-sm font-bold ${reviewWarnings.length ? "text-amber-900" : "text-emerald-800"}`}>{reviewWarnings.length ? "Review before launch" : "Ready for moderation"}</p>
                  <div className={`mt-2 grid gap-1 text-sm font-semibold leading-6 ${reviewWarnings.length ? "text-amber-900" : "text-emerald-800"}`}>
                    {reviewWarnings.length ? reviewWarnings.map((warning) => <span key={warning}>{warning}</span>) : <span>No obvious content or media blockers detected.</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="sticky top-3 z-20 mb-6 p-3 shadow-glass">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {reviewTabs.map((tab) => (
            <a key={tab.id} href={`#${tab.id}`} className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm transition hover:bg-ink hover:text-white">
              {tab.label}
            </a>
          ))}
          <Link href={publicHref} className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm transition hover:bg-ink hover:text-white">
            <ExternalLink className="h-4 w-4" /> Public URL
          </Link>
        </div>
      </GlassCard>

      {notice ? <GlassCard className="mb-6 p-4 text-sm font-semibold text-muted">{notice}</GlassCard> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <GlassCard id="overview" className="scroll-mt-24">
            <div className="relative h-72 overflow-hidden rounded-[1.6rem] bg-white">
              <Image src={listing.coverImage || listing.image} alt={listing.name} fill className="object-cover" sizes="100vw" />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Basic info</h2>
                <p className="mt-2 text-muted">{listing.shortDescription || listing.about}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={statusTone(listing.status)}>{formatStatus(listing.status)}</StatusPill>
                {isFeaturedActive(listing) ? <StatusPill tone="blue">Featured</StatusPill> : isFeaturedExpired(listing) ? <StatusPill tone="amber">Featured expired</StatusPill> : <StatusPill tone="gray">Normal</StatusPill>}
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Detail label="Business name" value={listing.name} />
              <Detail label="Owner name" value={listing.ownerName} />
              <Detail label="Owner email" value={listing.ownerEmail || listing.email} />
              <Detail label="Phone" value={listing.phone} />
              <Detail label="WhatsApp" value={listing.whatsapp || "-"} />
              <Detail label="Website" value={listing.website} />
              <Detail label="Country" value={listing.country.toUpperCase()} />
              <Detail label="City" value={listing.cityName} />
              <Detail label="Category" value={listing.category} />
              <Detail label="18+ listing" value={listing.isAdult ? "Yes" : "No"} />
              <Detail label="ID verification" value={listing.isAdult ? effectiveVerification : "Not required"} />
              <Detail label="Address" value={listing.address || listing.location} />
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">Business description</h2>
            <p className="mt-4 leading-8 text-muted">{listing.about}</p>
          </GlassCard>

          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">Services</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {listing.services.map((service) => <Pill key={service}>{service}</Pill>)}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">Pricing</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(listing.pricing?.length ? listing.pricing : ["No pricing submitted"]).map((item) => <Pill key={item}>{item}</Pill>)}
            </div>
          </GlassCard>

          <GlassCard id="gallery" className="scroll-mt-24">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-champagne">Media review</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Gallery media</h2>
                <p className="mt-2 text-sm font-semibold text-muted">{gallery.length}/{MAX_PROFILE_GALLERY_IMAGES} media items used. Public preview uses a 3:4 frame.</p>
              </div>
              <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted ring-1 ring-slate-200">1200 x 1600 px</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {gallery.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-[1.4rem] bg-white/70 shadow-sm">
                  <div className="relative aspect-[3/4]">
                    <AdminMedia src={image.imageUrl} alt={image.altText || image.title || listing.name} className="object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-ink">{image.title || "Gallery media"}</p>
                      <p className="text-xs text-muted">{isVideoMedia(image.imageUrl) ? "Video" : "Photo"} preview</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editGalleryImage(image)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-sm"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteGalleryImage(image)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {gallery.length === 0 ? <p className="text-sm text-muted">No gallery media submitted.</p> : null}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">Add gallery media</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Media URL" value={newImage.imageUrl} onChange={(value) => setNewImage((current) => ({ ...current, imageUrl: value }))} />
              <Field label="Title" value={newImage.title} onChange={(value) => setNewImage((current) => ({ ...current, title: value }))} />
              <Field label="Alt text" value={newImage.altText} onChange={(value) => setNewImage((current) => ({ ...current, altText: value }))} />
            </div>
            <div className="mt-4">
              <UploadField
                admin
                label="Upload Gallery Image or Video"
                type="gallery"
                value={newImage.imageUrl}
                helper={`Recommended photo size: 1200 x 1600 px (3:4). Images are optimized and videos are stored as gallery media. ${gallery.length}/${MAX_PROFILE_GALLERY_IMAGES} used.`}
                disabled={galleryLimitReached}
                disabledMessage={`Gallery limit reached: ${MAX_PROFILE_GALLERY_IMAGES}/${MAX_PROFILE_GALLERY_IMAGES} media items used.`}
                onUploaded={(url) => setNewImage((current) => ({ ...current, imageUrl: url }))}
              />
            </div>
            <button
              onClick={addGalleryImage}
              disabled={galleryLimitReached}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" /> {galleryLimitReached ? "Limit reached" : "Add Media"}
            </button>
          </GlassCard>
        </div>

        <aside className="space-y-6">
          <GlassCard id="controls" className="scroll-mt-24">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-champagne">Moderation</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Approval decision</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Use one note for rejection, suspension, or internal review context.</p>
              </div>
              <StatusPill tone={statusTone(listing.status)}>{formatStatus(listing.status)}</StatusPill>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-ink">Admin decision note</span>
              <textarea
                value={moderationNote}
                onChange={(event) => setModerationNote(event.target.value)}
                rows={4}
                placeholder="Explain rejection/suspension reason or internal launch note..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
              />
            </label>

            <div className="mt-5 grid gap-2">
              <Button variant="gold" onClick={() => updateStatus("approved")}><CheckCircle2 className="mr-2 h-4 w-4" /> Approve Listing</Button>
              <Button variant="ghost" onClick={() => updateStatus("pending")}><Clock3 className="mr-2 h-4 w-4" /> Keep Pending</Button>
              <Button variant="ghost" onClick={() => updateStatus("draft")}><FilePenLine className="mr-2 h-4 w-4" /> Move to Draft</Button>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Button variant="ghost" onClick={() => updateStatus("rejected")}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                <Button variant="ghost" onClick={() => updateStatus("suspended")}><Ban className="mr-2 h-4 w-4" /> Suspend</Button>
              </div>
              <Button variant="primary" onClick={() => updateStatus(listing.status, moderationNote)}><Save className="mr-2 h-4 w-4" /> Save Note</Button>
              <Button href={`/admin/profiles/${listing.slug}/edit`} variant="ghost"><Pencil className="mr-2 h-4 w-4" /> Edit Listing</Button>
            </div>

            <div className="mt-6 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Featured placement</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{featuredStatusLabel(listing)}</p>
                </div>
                <Star className="h-5 w-5 text-champagne" />
              </div>
              <div className="mt-4 grid gap-2">
                <Button variant="ghost" onClick={toggleFeatured}><Star className="mr-2 h-4 w-4" /> {isFeaturedActive(listing) ? "Remove Featured" : listing.featured ? "Extend Featured" : "Feature Listing"}</Button>
                {pendingRequest ? (
                  <>
                    <Button variant="gold" onClick={() => updateFeaturedRequest(pendingRequest, "APPROVED")}><CheckCircle2 className="mr-2 h-4 w-4" /> Approve Feature Request</Button>
                    <Button variant="ghost" onClick={() => updateFeaturedRequest(pendingRequest, "REJECTED")}><XCircle className="mr-2 h-4 w-4" /> Reject Feature Request</Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Detail label="Featured until" value={formatDate(listing.featuredUntil)} />
              <Detail label="Feature request" value={featuredRequestLabel(latestRequest)} />
              {latestRequest?.requestedPagePath ? <Detail label="Requested page" value={latestRequest.requestedPagePath || "-"} /> : null}
              <Detail label="Rejection reason" value={listing.rejectionReason || "-"} />
            </div>
          </GlassCard>

          <GlassCard id="documents" className="scroll-mt-24">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Verified documents</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {listing.isAdult
                    ? "Verify government ID and latest DOB photo before marking this 18+ provider verified."
                    : "Store business proof, certificates, address proof, or optional verification documents for this listing."}
                </p>
              </div>
              <ShieldCheck className="h-6 w-6 text-champagne" />
            </div>
            <div className="mt-5 space-y-4">
              <Detail label="Public badge" value={listing.isAdult ? (effectiveVerification === "VERIFIED" ? "ID verified" : "Not ID verified") : effectiveVerification} />
              {verificationDocuments.map((document) => (
                <div key={document.id || document.fileUrl} className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{documentLabel(document.type)}</p>
                      <p className="mt-1 text-xs text-muted">{document.originalName || "Private verification document"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={document.status || "PENDING"}
                        onChange={(event) => updateDocumentStatus(document, event.target.value)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
                      >
                        <option value="PENDING">pending</option>
                        <option value="VERIFIED">verified</option>
                        <option value="REJECTED">rejected</option>
                      </select>
                      <button onClick={() => deleteVerificationDocument(document)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm" aria-label="Delete verification document">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <PrivateDocumentPreview fileUrl={document.fileUrl} />
                  <label className="mt-3 block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Document admin note</span>
                    <textarea
                      value={document.adminNotes || ""}
                      onChange={(event) => updateDocumentNote(document, event.target.value)}
                      rows={2}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
                    />
                  </label>
                </div>
              ))}
              {verificationDocuments.length === 0 ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-100">No verification documents submitted.</p> : null}
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200">
                <h3 className="text-lg font-semibold text-ink">Add verification document</h3>
                <div className="mt-4 grid gap-3">
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Document type</span>
                    <select value={newDocument.type} onChange={(event) => setNewDocument((current) => ({ ...current, type: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                      {documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </label>
                  <UploadField
                    admin
                    label="Upload Private Document"
                    type="document"
                    value={newDocument.fileUrl}
                    helper="Private document uploads are visible to admins only."
                    onUploaded={(url, payload) => setNewDocument((current) => ({
                      ...current,
                      fileUrl: url,
                      originalName: payload?.originalName || current.originalName
                    }))}
                  />
                  <Field label="Document URL" value={newDocument.fileUrl} onChange={(value) => setNewDocument((current) => ({ ...current, fileUrl: value }))} />
                  <Field label="Admin note" value={newDocument.adminNotes} onChange={(value) => setNewDocument((current) => ({ ...current, adminNotes: value }))} />
                  <button onClick={addVerificationDocument} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass"><Plus className="h-4 w-4" /> Add Document</button>
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">Verification notes</span>
                <textarea
                  value={verificationNotes}
                  onChange={(event) => setVerificationNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <div className="grid gap-2">
                <Button variant={effectiveVerification === "VERIFIED" ? "ghost" : "gold"} disabled={effectiveVerification === "VERIFIED"} onClick={() => saveVerification("VERIFIED")}>
                  {effectiveVerification === "VERIFIED" ? "Verified" : "Mark Verified"}
                </Button>
                <Button variant="ghost" onClick={() => saveVerification("PENDING")}>Keep Pending</Button>
                <Button variant="ghost" onClick={() => saveVerification("REJECTED")}>Reject Verification</Button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">Business hours</h2>
            <div className="mt-5 grid gap-3">
              {listing.hours.map((hour) => <Pill key={hour}>{hour}</Pill>)}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">Documents / certificates</h2>
            <div className="mt-5 grid gap-3">
              {certificates.map((image) => (
                <Link key={image.id} href={image.imageUrl} className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-ink">
                  <FileText className="h-4 w-4 text-champagne" /> {image.title || "Certificate"}
                </Link>
              ))}
              {certificates.length === 0 ? <p className="text-sm leading-6 text-muted">No certificate images have been submitted.</p> : null}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-2xl font-semibold text-ink">SEO</h2>
            <div className="mt-5 space-y-3">
              <Detail label="SEO title" value={listing.seoTitle || `${listing.name} in ${listing.cityName}`} />
              <Detail label="SEO description" value={listing.seoDescription || listing.about} />
            </div>
          </GlassCard>

          <Button href={publicHref} variant="ghost" className="w-full"><ExternalLink className="mr-2 h-4 w-4" /> Public URL</Button>
          <button onClick={() => updateStatus(listing.status, moderationNote)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ead39a] to-[#d8aa5b] px-5 py-3 text-sm font-semibold text-onaccent shadow-glow">
            <Save className="h-4 w-4" /> Save Review Notes
          </button>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/65 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReviewMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{note}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-muted shadow-sm">{children}</div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
    </label>
  );
}

function documentLabel(type?: string) {
  return documentTypes.find((item) => item.value === type)?.label || "Verification document";
}

function resolveAdminMediaSrc(src: string) {
  if (src.startsWith("/uploads/") || src.startsWith("/api/uploads/")) {
    return `${getApiBase().replace(/\/$/, "")}${src}`;
  }
  return src;
}

function AdminMedia({ src, alt, className }: { src: string; alt: string; className: string }) {
  if (isVideoMedia(src)) {
    return (
      <div className="absolute inset-0 bg-shade text-white">
        <video
          src={resolveAdminMediaSrc(src)}
          aria-label={alt}
          muted
          playsInline
          preload="metadata"
          className={`h-full w-full ${className}`}
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
          <FileVideo className="h-3.5 w-3.5" /> Video
        </span>
      </div>
    );
  }
  return (
    <img
      src={resolveAdminMediaSrc(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}

function isVideoMedia(value?: string) {
  return /\.(mp4|webm|mov|m4v|ogv)(?:$|\?)/i.test(String(value || "").toLowerCase());
}

function PrivateDocumentPreview({ fileUrl }: { fileUrl: string }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    let localObjectUrl = "";
    const url = fileUrl.startsWith("http") ? fileUrl : `${getApiBase()}${fileUrl}`;
    adminFetch(url)
      .then((response) => response.ok ? response.blob() : undefined)
      .then((blob) => {
        if (!mounted || !blob) {
          if (mounted) setFailed(true);
          return;
        }
        const nextUrl = URL.createObjectURL(blob);
        localObjectUrl = nextUrl;
        setObjectUrl(nextUrl);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    };
  }, [fileUrl]);

  if (failed) return <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Document preview unavailable.</p>;
  if (!objectUrl) return <div className="mt-3 h-32 animate-pulse rounded-xl bg-cloud" />;
  return <img src={objectUrl} alt="Private verification document preview" className="mt-3 max-h-72 w-full rounded-xl object-contain ring-1 ring-slate-200" />;
}
