"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileVideo,
  Globe2,
  HeartHandshake,
  HelpCircle,
  ImageIcon,
  Languages,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { featuredDaysRemaining, isFeaturedActive, isIdVerifiedListing, type Listing, type ProfileGalleryImage } from "@/lib/data";
import { buildProfileSeoContent, type ProfileSeoContent } from "@/lib/profile-seo";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { getApiBase, normalizeGalleryImage } from "@/lib/profiles";
import { authFetch, getCurrentUser } from "@/lib/admin-auth";
import { SaveProfileButton } from "@/components/save-profile-button";

type ProfileReview = {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  user?: {
    name?: string;
    role?: string;
  };
};

type SessionUser = {
  id: string;
  role: string;
};

type LeadFormState = {
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  serviceNeeded: string;
  budget: string;
  timeline: string;
  contactPreference: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
};

type ProfileModel = {
  serviceLines: string[];
  pricingLines: string[];
  hourLines: string[];
  adultDetails: Array<{ label: string; value: string; tone: AdultTone }>;
  availabilityLines: string[];
  rateLines: string[];
};

type AdultTone = "blue" | "emerald" | "amber" | "rose" | "violet" | "sky" | "indigo" | "teal" | "orange";

export function ProfileDetail({
  listing,
  gallery = [],
  previewMode = false,
  seoContent
}: {
  listing: Listing;
  gallery?: ProfileGalleryImage[];
  previewMode?: boolean;
  seoContent?: ProfileSeoContent;
}) {
  const profileModel = buildProfileModel(listing);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewCount, setViewCount] = useState(listing.viewCount);
  const [galleryItems, setGalleryItems] = useState<ProfileGalleryImage[]>(gallery);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    whatsapp: "",
    serviceNeeded: profileModel.serviceLines[0] || "",
    budget: "",
    timeline: "",
    contactPreference: "WhatsApp",
    preferredDate: "",
    preferredTime: "",
    message: ""
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadNotice, setLeadNotice] = useState("");

  const displayGallery = useMemo(() => {
    return galleryItems.filter((image) => image.isActive);
  }, [galleryItems]);
  const seo = useMemo(() => seoContent || buildProfileSeoContent(listing, displayGallery.length), [displayGallery.length, listing, seoContent]);

  const lightboxImage = lightboxIndex === null ? undefined : displayGallery[lightboxIndex];
  const avatar = listing.avatarImage || listing.image;
  const whatsappUrl = whatsappHref(listing.whatsapp || listing.phone, listing.name);
  const phoneUrl = listing.phone ? `tel:${listing.phone.replace(/\s+/g, "")}` : undefined;
  const websiteUrl = listing.website || undefined;
  const activeFeatured = isFeaturedActive(listing);
  const featuredDays = featuredDaysRemaining(listing);
  const idVerified = isIdVerifiedListing(listing);

  useEffect(() => {
    setGalleryItems(gallery);
  }, [gallery]);

  useEffect(() => {
    const profileId = listing.id || listing.slug;
    fetch(`${getApiBase()}/api/profiles/${profileId}/gallery`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload: { data?: unknown[] } | undefined) => {
        if (!Array.isArray(payload?.data)) return;
        const fresh = payload.data.map(normalizeGalleryImage).filter((image) => image.isActive && image.imageUrl);
        if (fresh.length) setGalleryItems(fresh);
      })
      .catch(() => undefined);
  }, [listing.id, listing.slug]);

  useEffect(() => {
    const profileId = listing.id || listing.slug;
    const storageKey = `profile-viewed:${profileId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(storageKey)) return;

    fetch(`${getApiBase()}/api/profiles/${profileId}/view`, { method: "POST" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload: { data?: { viewCount?: number } } | undefined) => {
        if (typeof payload?.data?.viewCount === "number") {
          setViewCount(payload.data.viewCount);
          sessionStorage.setItem(storageKey, "1");
        }
      })
      .catch(() => undefined);
  }, [listing.id, listing.slug]);

  useEffect(() => {
    const profileId = listing.id || listing.slug;
    fetch(`${getApiBase()}/api/profiles/${profileId}/reviews`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload: { data?: ProfileReview[] } | undefined) => {
        if (Array.isArray(payload?.data)) setReviews(payload.data);
      })
      .catch(() => undefined);

    getCurrentUser()
      .then((user) => {
        if (user && typeof user === "object" && "role" in user) setCurrentUser(user as SessionUser);
      })
      .catch(() => undefined)
      .finally(() => setSessionChecked(true));
  }, [listing.id, listing.slug]);

  async function submitReview() {
    setReviewNotice("");
    const profileId = listing.id || listing.slug;
    if (reviewComment.trim().length < 10) {
      setReviewNotice("Please write at least 10 characters.");
      return;
    }
    try {
      const response = await authFetch(`${getApiBase()}/api/profiles/${profileId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, title: reviewTitle, comment: reviewComment })
      });
      const payload = await response.json() as { data?: ProfileReview; error?: string };
      if (!response.ok || !payload.data) {
        if (response.status === 401) throw new Error("Login as a review user before posting a review.");
        throw new Error(payload.error || "Review could not be saved.");
      }
      setReviewComment("");
      setReviewTitle("");
      setReviewNotice("Review submitted for moderation. It will appear after admin approval.");
    } catch (error) {
      setReviewNotice(error instanceof Error ? error.message : "Review could not be saved.");
    }
  }

  function moveLightbox(direction: -1 | 1) {
    if (!displayGallery.length || lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + direction + displayGallery.length) % displayGallery.length);
  }

  function trackInsight(type: "WHATSAPP_CLICK" | "PHONE_CLICK" | "WEBSITE_CLICK" | "CONTACT_CLICK") {
    const profileId = listing.id || listing.slug;
    fetch(`${getApiBase()}/api/profiles/${profileId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    }).catch(() => undefined);
  }

  function scrollToQuote() {
    document.getElementById("request-quote")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateLeadField(key: keyof typeof leadForm, value: string) {
    setLeadForm((current) => ({ ...current, [key]: value }));
  }

  async function submitLead() {
    setLeadNotice("");
    if (leadForm.name.trim().length < 2) {
      setLeadNotice("Please enter your name.");
      return;
    }
    if (leadForm.phone.replace(/\D/g, "").length < 7) {
      setLeadNotice("Please enter a valid phone number.");
      return;
    }

    setLeadLoading(true);
    try {
      const profileId = listing.id || listing.slug;
      const response = await authFetch(`${getApiBase()}/api/profiles/${profileId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leadForm, source: "PROFILE_QUOTE", sourcePath: window.location.pathname })
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Request could not be sent.");
      setLeadNotice(payload.message || "Request sent. The business owner can contact you soon.");
      setLeadForm((current) => ({
        name: "",
        phone: "",
        email: "",
        whatsapp: "",
        serviceNeeded: current.serviceNeeded,
        budget: "",
        timeline: "",
        contactPreference: "WhatsApp",
        preferredDate: "",
        preferredTime: "",
        message: ""
      }));
    } catch (error) {
      setLeadNotice(error instanceof Error ? error.message : "Request could not be sent.");
    } finally {
      setLeadLoading(false);
    }
  }

  function shareProfile() {
    const nav = typeof navigator !== "undefined" ? navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      clipboard?: Clipboard;
    } : undefined;
    if (nav?.share) {
      void nav.share({ title: listing.name, url: window.location.href }).catch(() => undefined);
    } else if (nav?.clipboard) {
      void nav.clipboard.writeText(window.location.href).catch(() => undefined);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:py-8">
      {previewMode ? (
        <div className="mb-5 rounded-[1.35rem] bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950 ring-1 ring-amber-200">
          Owner preview: this profile is visible only to you right now. It becomes public on its profile page after admin approval.
        </div>
      ) : null}
      <section className="glass relative overflow-hidden rounded-[1.5rem] p-2 sm:rounded-[2.5rem] sm:p-3">
        <div className="relative h-56 overflow-hidden rounded-[1.25rem] sm:h-64 sm:rounded-[2rem] md:h-[27rem]">
          <ManagedImage src={listing.coverImage || listing.image} alt={listing.name} priority className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
        </div>
        <div className="relative mx-auto -mt-16 max-w-6xl px-1.5 pb-3 sm:-mt-24 sm:px-4 sm:pb-5">
          <div className="glass-strong rounded-[1.35rem] p-4 sm:rounded-[2rem] sm:p-5 md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.35rem] border-4 border-white bg-white shadow-glass sm:h-28 sm:w-28 sm:rounded-[1.7rem]">
                  <ManagedImage src={avatar} alt={`${listing.name} logo`} className="object-cover" sizes="112px" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl md:text-5xl">{listing.name}</h1>
                    {idVerified && <BadgeCheck className="h-7 w-7 text-blue-500" />}
                  </div>
                  <p className="mt-2 text-lg text-muted">{listing.category}</p>
                  <div className="mt-4 grid gap-3 text-sm text-muted sm:flex sm:flex-wrap sm:gap-4">
                    <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-champagne text-champagne" /> {listing.rating} ({listing.reviews} reviews)</span>
                    <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {viewCount.toLocaleString()} views</span>
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.location}</span>
                    <span className={`rounded-full px-3 py-1 font-semibold ${listing.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                      {previewMode && listing.status !== "approved" ? `${listing.status.charAt(0).toUpperCase()}${listing.status.slice(1)} - not public` : "Approved"}
                    </span>
                    {activeFeatured ? <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">{featuredDays ? `Featured ${featuredDays}d left` : "Featured"}</span> : null}
                    {listing.isAdult ? <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">18+</span> : null}
                    {listing.isAdult ? (
                      <span className={`rounded-full px-3 py-1 font-semibold ${idVerified ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
                        {idVerified ? "ID verified" : "Not ID verified"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:flex md:flex-wrap md:justify-end">
                <Action icon={<Phone className="h-4 w-4" />} label="Call" href={phoneUrl} onClick={() => trackInsight("PHONE_CLICK")} tone="call" />
                <Action icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" href={whatsappUrl} onClick={() => trackInsight("WHATSAPP_CLICK")} tone="whatsapp" />
                <Action icon={<Send className="h-4 w-4" />} label="Quote" onClick={scrollToQuote} tone="quote" />
                <Action icon={<Globe2 className="h-4 w-4" />} label="Website" href={websiteUrl} onClick={() => trackInsight("WEBSITE_CLICK")} tone="website" />
                <SaveProfileButton
                  profileId={listing.id || listing.slug}
                  showLabel
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-rose-500 shadow-sm md:w-auto"
                  savedClassName="bg-rose-50 text-rose-600"
                />
                <Action icon={<Share2 className="h-4 w-4" />} label="Share" onClick={shareProfile} className="col-span-2 md:col-span-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 py-6 md:py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="contents lg:block lg:min-w-0 lg:space-y-6">
          <GlassCard className="order-1">
            <h2 className="text-2xl font-semibold text-ink">About</h2>
            {listing.isAdult ? (
              <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${idVerified ? "bg-blue-50 text-blue-800 ring-blue-100" : "bg-rose-50 text-rose-800 ring-rose-100"}`}>
                {idVerified
                  ? "This 18+ profile has completed admin document verification."
                  : "Note: this 18+ profile is approved, but the provider's ID verification is not completed yet."}
              </div>
            ) : null}
            <p className="mt-4 leading-8 text-muted">{listing.about}</p>
          </GlassCard>

          {listing.isAdult ? (
            <AdultProfileDetails listing={listing} model={profileModel} idVerified={idVerified} className="order-2" />
          ) : (
            <StandardProfileDetails listing={listing} model={profileModel} className="order-2" />
          )}

          <GallerySection
            images={displayGallery}
            allImages={galleryItems.filter((image) => image.isActive)}
            className="order-5"
            onOpen={setLightboxIndex}
          />

          {profileModel.pricingLines.length ? (
            <GlassCard className="order-3">
              <h2 className="text-2xl font-semibold text-ink">{listing.isAdult ? "Rates / Donation Notes" : "Pricing"}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {profileModel.pricingLines.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-muted shadow-sm">{item}</div>
                ))}
              </div>
            </GlassCard>
          ) : null}

          <ProfileSeoSection listing={listing} seo={seo} className="order-8" />

          <GlassCard className="order-9">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Reviews</h2>
                <p className="mt-2 text-sm text-muted">{reviews.length} published review{reviews.length === 1 ? "" : "s"}</p>
              </div>
              {!currentUser ? <Button href="/signup" variant="ghost">Create Review Account</Button> : null}
            </div>

            {!sessionChecked ? (
              <div className="mt-5 h-28 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />
            ) : !currentUser ? (
              <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                <h3 className="text-lg font-semibold text-ink">Login to write a review</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Reviews are tied to verified user accounts and appear after admin approval.</p>
                <div className="mt-4 grid gap-3 sm:flex">
                  <Button href="/login" variant="gold">Login</Button>
                  <Button href="/signup" variant="ghost">Create Review Account</Button>
                </div>
              </div>
            ) : currentUser?.role === "OWNER" ? (
              <div className="mt-5 rounded-3xl bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-200">
                Owner accounts can post and manage listings. Use a review user account to review public profiles.
              </div>
            ) : (
              <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Rating</span>
                    <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Title</span>
                    <input value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} placeholder="Short review title" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100" />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-semibold text-ink">Your Review</span>
                  <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={4} placeholder="Share your real experience..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100" />
                </label>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-muted">Reviews are moderated before publishing.</p>
                  <Button variant="gold" onClick={submitReview}>Post Review</Button>
                </div>
                {reviewNotice ? <p className="mt-3 rounded-2xl bg-cloud px-4 py-3 text-sm font-semibold text-ink">{reviewNotice}</p> : null}
              </div>
            )}

            <div className="mt-5 grid gap-3">
              {reviews.length ? reviews.map((review) => (
                <div key={review.id} className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 text-champagne">
                      {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-5 w-5 ${index < review.rating ? "fill-current" : ""}`} />)}
                    </div>
                    <span className="text-xs font-semibold text-muted">{formatDate(review.createdAt)}</span>
                  </div>
                  {review.title ? <h3 className="mt-3 font-semibold text-ink">{review.title}</h3> : null}
                  <p className="mt-2 text-sm leading-6 text-muted">{review.comment}</p>
                  <p className="mt-3 text-sm font-semibold text-ink">{review.user?.name || "Verified User"}</p>
                </div>
              )) : (
                <div className="rounded-3xl bg-white p-5 text-sm font-semibold text-muted ring-1 ring-slate-200">No reviews yet. Be the first review user to share feedback.</div>
              )}
            </div>
          </GlassCard>
        </div>

        <aside className="contents lg:block lg:min-w-0 lg:space-y-6">
          <RequestQuoteCard
            listing={listing}
            serviceOptions={profileModel.serviceLines}
            form={leadForm}
            loading={leadLoading}
            notice={leadNotice}
            className="order-6"
            onChange={updateLeadField}
            onSubmit={submitLead}
          />
          <GlassCard className="order-7">
            <h3 className="text-xl font-semibold text-ink">Contact Info</h3>
            <div className="mt-5 space-y-4 text-sm text-muted">
              <Info icon={<Phone className="h-4 w-4" />} label={listing.phone} />
              {listing.whatsapp ? <Info icon={<MessageCircle className="h-4 w-4" />} label={listing.whatsapp} /> : null}
              <Info icon={<Mail className="h-4 w-4" />} label={listing.email} />
              <Info icon={<Globe2 className="h-4 w-4" />} label={listing.website} />
              <Info icon={<MapPin className="h-4 w-4" />} label={listing.address || listing.location} />
            </div>
            <div className="mt-6 grid gap-3">
              {phoneUrl ? (
                <a
                  href={phoneUrl}
                  onClick={() => trackInsight("PHONE_CLICK")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-glass transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  <Phone className="h-4 w-4" /> Call Now
                </a>
              ) : null}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackInsight("WHATSAPP_CLICK")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-glass transition hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Now
                </a>
              ) : null}
              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackInsight("WEBSITE_CLICK")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-glass transition hover:-translate-y-0.5 hover:bg-indigo-700"
                >
                  <Globe2 className="h-4 w-4" /> Visit Website
                </a>
              ) : null}
              <Button variant="gold" className="w-full" onClick={() => {
                trackInsight("CONTACT_CLICK");
                scrollToQuote();
              }}>Request Quote</Button>
            </div>
          </GlassCard>
          <GlassCard className="order-4">
            <h3 className="text-xl font-semibold text-ink">{listing.isAdult ? "Availability" : "Business Hours"}</h3>
            <div className="mt-5 space-y-3">
              {(profileModel.availabilityLines.length ? profileModel.availabilityLines : profileModel.hourLines).map((hour, index) => (
                <Info key={`${hour}-${index}`} icon={<CalendarDays className="h-4 w-4" />} label={hour} />
              ))}
            </div>
          </GlassCard>
        </aside>
      </section>

      {lightboxImage ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 px-4 py-8 backdrop-blur-md" role="dialog" aria-modal="true">
          <button className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-glass" onClick={() => setLightboxIndex(null)} aria-label="Close gallery media">
            <X className="h-5 w-5" />
          </button>
          <button className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-glass md:left-8" onClick={() => moveLightbox(-1)} aria-label="Previous media">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative flex max-h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] bg-ink shadow-glass sm:rounded-[2rem]">
            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2 sm:p-4">
              <LightboxMedia src={lightboxImage.imageUrl} alt={lightboxImage.altText || lightboxImage.title || listing.name} />
            </div>
            <div className="shrink-0 bg-white px-4 py-3 text-ink sm:px-5">
              <p className="truncate text-base font-semibold sm:text-lg">{lightboxImage.title || listing.name}</p>
              {lightboxImage.category ? <p className="mt-1 text-sm text-muted">{lightboxImage.category}</p> : null}
            </div>
          </div>
          <button className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-glass md:right-8" onClick={() => moveLightbox(1)} aria-label="Next media">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </main>
  );
}

const adultServiceLabels = ["Age", "Available for", "Orientation", "Height", "Body type", "Ethnicity", "Languages spoken", "Booking type", "Minimum booking duration"];
const adultPricingLabels = ["1 hour", "2 hours", "Dinner date", "Overnight", "Travel / extended booking", "Custom"];
const adultHourLabels = ["Availability"];

function buildProfileModel(listing: Listing): ProfileModel {
  const services = listing.services || [];
  const pricing = listing.pricing || [];
  const hours = listing.hours || [];
  if (!listing.isAdult) {
    return {
      serviceLines: services,
      pricingLines: pricing || [],
      hourLines: hours,
      adultDetails: [],
      availabilityLines: [],
      rateLines: []
    };
  }

  const adultDetails = [
    detail("Age", prefixedValue(services, "Age"), "blue"),
    detail("Available for", prefixedValue(services, "Available for"), "emerald"),
    detail("Orientation", prefixedValue(services, "Orientation"), "rose"),
    detail("Height", prefixedValue(services, "Height"), "violet"),
    detail("Body type", prefixedValue(services, "Body type"), "amber"),
    detail("Ethnicity", prefixedValue(services, "Ethnicity"), "orange"),
    detail("Languages spoken", prefixedValue(services, "Languages spoken"), "sky"),
    detail("Booking type", prefixedValue(services, "Booking type"), "indigo"),
    detail("Minimum duration", prefixedValue(services, "Minimum booking duration"), "teal")
  ].filter((item): item is { label: string; value: string; tone: AdultTone } => Boolean(item?.value));

  const generatedRates = adultPricingLabels
    .map((label) => prefixedValue(pricing || [], label) ? `${label}: ${prefixedValue(pricing || [], label)}` : "")
    .filter(Boolean);

  const manualServices = withoutPrefixedLines(services, adultServiceLabels);
  const manualPricing = generatedRates.length ? withoutPrefixedLines(pricing || [], adultPricingLabels) : pricing || [];
  const availability = prefixedList(hours, "Availability");
  const manualHours = availability.length ? withoutPrefixedLines(hours, adultHourLabels) : hours;

  return {
    serviceLines: manualServices,
    pricingLines: manualPricing,
    hourLines: manualHours,
    adultDetails,
    availabilityLines: availability,
    rateLines: generatedRates
  };
}

function detail(label: string, value: string, tone: AdultTone) {
  return value ? { label, value, tone } : undefined;
}

function prefixedValue(lines: string[], label: string) {
  const prefix = `${label}:`;
  const line = lines.find((item) => item.toLowerCase().startsWith(prefix.toLowerCase()));
  return line ? line.slice(prefix.length).trim() : "";
}

function prefixedList(lines: string[], label: string) {
  return prefixedValue(lines, label).split(",").map((item) => item.trim()).filter(Boolean);
}

function withoutPrefixedLines(lines: string[], labels: string[]) {
  return lines.filter((line) => !labels.some((label) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`)));
}

function StandardProfileDetails({ listing, model, className = "" }: { listing: Listing; model: ProfileModel; className?: string }) {
  const detailTiles: Array<{ label: string; value: string; tone: AdultTone }> = [
    { label: "Category", value: listing.category, tone: "blue" },
    { label: "Service area", value: listing.cityName || listing.location, tone: "emerald" },
    { label: "Rating", value: `${listing.rating} / 5 (${listing.reviews} reviews)`, tone: "amber" },
    { label: "Trust", value: listing.verified ? "Verified provider" : "Approved provider", tone: "sky" }
  ];

  return (
    <GlassCard className={`overflow-hidden p-0 ${className}`}>
      <div className="bg-gradient-to-r from-sky-50 via-emerald-50 to-amber-50 p-5 ring-1 ring-white/70 md:p-7">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-700 shadow-sm ring-1 ring-sky-100">
              <Sparkles className="h-4 w-4" /> Service profile
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-ink">Profile details</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Key service, location and trust details for visitors before they contact this provider.
            </p>
          </div>
          <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold shadow-sm ring-1 ${listing.verified ? "bg-blue-600 text-white ring-blue-500" : "bg-emerald-600 text-white ring-emerald-500"}`}>
            {listing.verified ? "Verified" : "Approved"}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {detailTiles.map((item) => (
            <StandardDetailTile key={item.label} label={item.label} value={item.value} tone={item.tone} />
          ))}
        </div>

        {model.serviceLines.length ? (
          <div className="mt-6 rounded-[1.35rem] bg-white/80 p-4 shadow-sm ring-1 ring-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <HeartHandshake className="h-4 w-4 text-sky-600" /> Service highlights
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.serviceLines.map((service, index) => (
                <span key={`${service}-${index}`} className="rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 ring-1 ring-sky-100">{service}</span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.35rem] bg-white/75 px-4 py-3 text-sm font-semibold leading-6 text-muted ring-1 ring-white">
          <BadgeCheck className="mr-2 inline h-4 w-4 text-emerald-600" />
          {listing.name} is approved for public discovery on this service directory.
        </div>
      </div>
    </GlassCard>
  );
}

function StandardDetailTile({ label, value, tone }: { label: string; value: string; tone: AdultTone }) {
  const toneClass = adultToneClass(tone);
  return (
    <div className={`rounded-[1.25rem] p-4 shadow-sm ring-1 ${toneClass.card}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass.icon}`}>
        {standardDetailIcon(label)}
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function standardDetailIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("category")) return <BadgeCheck className="h-5 w-5" />;
  if (normalized.includes("area")) return <MapPin className="h-5 w-5" />;
  if (normalized.includes("rating")) return <Star className="h-5 w-5" />;
  if (normalized.includes("trust")) return <ShieldCheck className="h-5 w-5" />;
  return <Sparkles className="h-5 w-5" />;
}

function AdultProfileDetails({ listing, model, idVerified, className = "" }: { listing: Listing; model: ProfileModel; idVerified: boolean; className?: string }) {
  return (
    <GlassCard className={`overflow-hidden p-0 ${className}`}>
      <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 p-5 ring-1 ring-white/70 md:p-7">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-700 shadow-sm ring-1 ring-rose-100">
              <ShieldCheck className="h-4 w-4" /> 18+ profile
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-ink">Profile details</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {idVerified ? "Admin-verified provider details for adult visitors." : "Approved profile with ID verification status shown for visitor trust."}
            </p>
          </div>
          <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold shadow-sm ring-1 ${idVerified ? "bg-blue-600 text-white ring-blue-500" : "bg-rose-600 text-white ring-rose-500"}`}>
            {idVerified ? "ID verified" : "ID not verified"}
          </span>
        </div>

        {model.adultDetails.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {model.adultDetails.map((item) => (
              <AdultDetailTile key={item.label} label={item.label} value={item.value} tone={item.tone} />
            ))}
          </div>
        ) : null}

        {model.serviceLines.length ? (
          <div className="mt-6 rounded-[1.35rem] bg-white/80 p-4 shadow-sm ring-1 ring-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <HeartHandshake className="h-4 w-4 text-rose-600" /> Service types
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.serviceLines.map((service, index) => (
                <span key={`${service}-${index}`} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{service}</span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {model.availabilityLines.length ? (
            <div className="rounded-[1.35rem] bg-white/80 p-4 shadow-sm ring-1 ring-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Clock3 className="h-4 w-4 text-emerald-600" /> Availability
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {model.availabilityLines.map((item) => (
                  <span key={item} className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">{item}</span>
                ))}
              </div>
            </div>
          ) : null}

          {model.rateLines.length ? (
            <div className="rounded-[1.35rem] bg-white/80 p-4 shadow-sm ring-1 ring-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <WalletCards className="h-4 w-4 text-amber-600" /> Rates / donation
              </div>
              <div className="mt-3 grid gap-2">
                {model.rateLines.map((rate) => (
                  <span key={rate} className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">{rate}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-[1.35rem] bg-white/75 px-4 py-3 text-sm font-semibold leading-6 text-muted ring-1 ring-white">
          <Sparkles className="mr-2 inline h-4 w-4 text-champagne" />
          {listing.name} is listed only for adult visitors. Contact details and booking information are shown after admin approval.
        </div>
      </div>
    </GlassCard>
  );
}

function ProfileSeoSection({ listing, seo, className = "" }: { listing: Listing; seo: ProfileSeoContent; className?: string }) {
  return (
    <GlassCard className={className}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne shadow-sm ring-1 ring-slate-200">
            <Sparkles className="h-4 w-4" /> Profile guide
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-ink">{seo.summaryTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted">{seo.summary}</p>
        </div>
        {listing.isAdult ? (
          <span className="w-fit rounded-full bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 ring-1 ring-amber-200">
            18+ only
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.35rem] bg-cloud p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><ShieldCheck className="h-5 w-5 text-champagne" /> {seo.trustTitle}</h3>
          <div className="mt-4 grid gap-3">
            {seo.trustPoints.map((point) => (
              <p key={point} className="flex gap-3 text-sm leading-6 text-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {point}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><HelpCircle className="h-5 w-5 text-champagne" /> {seo.compareTitle}</h3>
          <div className="mt-4 grid gap-3">
            {seo.comparePoints.map((point) => (
              <p key={point} className="text-sm leading-6 text-muted">{point}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
        <h3 className="text-lg font-semibold text-ink">{seo.localTitle}</h3>
        <p className="mt-2 text-sm leading-7 text-muted">{seo.localCopy}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-cloud p-4">
            <p className="text-sm font-semibold text-ink">Profile details searchers compare</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {seo.serviceSignals.map((signal) => (
                <span key={signal} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-slate-200">
                  {signal}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-cloud p-4">
            <p className="text-sm font-semibold text-ink">Long-tail searches this page supports</p>
            <div className="mt-3 grid gap-2">
              {seo.localSearchAngles.slice(0, 5).map((keyword) => (
                <span key={keyword} className="text-sm leading-6 text-muted">{keyword}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {seo.internalLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full bg-cloud px-4 py-2 text-sm font-semibold text-muted transition hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
        <h3 className="text-lg font-semibold text-ink">Profile FAQs</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {seo.faq.map((item) => (
            <details key={item.question} className="rounded-2xl bg-cloud px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{item.question}</summary>
              <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function AdultDetailTile({ label, value, tone }: { label: string; value: string; tone: AdultTone }) {
  const toneClass = adultToneClass(tone);
  return (
    <div className={`rounded-[1.25rem] p-4 shadow-sm ring-1 ${toneClass.card}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass.icon}`}>
        {adultDetailIcon(label)}
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function adultToneClass(tone: AdultTone) {
  const tones: Record<AdultTone, { card: string; icon: string }> = {
    blue: { card: "bg-blue-50/90 ring-blue-100", icon: "bg-blue-600 text-white" },
    emerald: { card: "bg-emerald-50/90 ring-emerald-100", icon: "bg-emerald-600 text-white" },
    amber: { card: "bg-amber-50/90 ring-amber-100", icon: "bg-amber-500 text-ink" },
    rose: { card: "bg-rose-50/90 ring-rose-100", icon: "bg-rose-600 text-white" },
    violet: { card: "bg-violet-50/90 ring-violet-100", icon: "bg-violet-600 text-white" },
    sky: { card: "bg-sky-50/90 ring-sky-100", icon: "bg-sky-600 text-white" },
    indigo: { card: "bg-indigo-50/90 ring-indigo-100", icon: "bg-indigo-600 text-white" },
    teal: { card: "bg-teal-50/90 ring-teal-100", icon: "bg-teal-600 text-white" },
    orange: { card: "bg-orange-50/90 ring-orange-100", icon: "bg-orange-500 text-white" }
  };
  return tones[tone];
}

function adultDetailIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("age")) return <UserRound className="h-5 w-5" />;
  if (normalized.includes("available")) return <HeartHandshake className="h-5 w-5" />;
  if (normalized.includes("orientation")) return <BadgeCheck className="h-5 w-5" />;
  if (normalized.includes("height")) return <Ruler className="h-5 w-5" />;
  if (normalized.includes("body")) return <Sparkles className="h-5 w-5" />;
  if (normalized.includes("ethnicity")) return <MapPin className="h-5 w-5" />;
  if (normalized.includes("language")) return <Languages className="h-5 w-5" />;
  if (normalized.includes("booking")) return <CalendarDays className="h-5 w-5" />;
  if (normalized.includes("duration")) return <Timer className="h-5 w-5" />;
  return <BadgeCheck className="h-5 w-5" />;
}

function RequestQuoteCard({
  listing,
  serviceOptions,
  form,
  loading,
  notice,
  className = "",
  onChange,
  onSubmit
}: {
  listing: Listing;
  serviceOptions: string[];
  form: LeadFormState;
  loading: boolean;
  notice: string;
  className?: string;
  onChange: (key: keyof LeadFormState, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <GlassCard className={`scroll-mt-24 ${className}`} id="request-quote">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-champagne">Service request</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Request a quote</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Send your requirement directly to this business owner.</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-champagne shadow-sm">
          <Send className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        <LeadInput label="Name" value={form.name} onChange={(value) => onChange("name", value)} placeholder="Your name" />
        <LeadInput label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} placeholder="+91 90000 00000" />
        <LeadInput label="Email" value={form.email} onChange={(value) => onChange("email", value)} placeholder="you@example.com" type="email" />
        <LeadInput label="WhatsApp" value={form.whatsapp} onChange={(value) => onChange("whatsapp", value)} placeholder="Optional" />
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Service needed</span>
          <select value={form.serviceNeeded} onChange={(event) => onChange("serviceNeeded", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
            <option value="">Select service</option>
            {(serviceOptions.length ? serviceOptions : listing.services).map((service, index) => <option key={`${service}-${index}`} value={service}>{service}</option>)}
            <option value="Custom quote">Custom quote</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <LeadInput label="Budget" value={form.budget} onChange={(value) => onChange("budget", value)} placeholder="Example: INR 3000" />
          <label>
            <span className="mb-2 block text-sm font-semibold text-ink">Timeline</span>
            <select value={form.timeline} onChange={(event) => onChange("timeline", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
              <option value="">Select timeline</option>
              <option value="Today">Today</option>
              <option value="This week">This week</option>
              <option value="This month">This month</option>
              <option value="Flexible">Flexible</option>
            </select>
          </label>
        </div>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Preferred contact</span>
          <select value={form.contactPreference} onChange={(event) => onChange("contactPreference", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone">Phone call</option>
            <option value="Email">Email</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <LeadInput label="Preferred date" value={form.preferredDate} onChange={(value) => onChange("preferredDate", value)} type="date" />
          <LeadInput label="Preferred time" value={form.preferredTime} onChange={(value) => onChange("preferredTime", value)} type="time" />
        </div>
        <label>
          <span className="mb-2 block text-sm font-semibold text-ink">Message</span>
          <textarea value={form.message} onChange={(event) => onChange("message", event.target.value)} rows={4} placeholder="Tell them what you need..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100" />
        </label>
      </div>
      <Button variant="gold" className="mt-5 w-full" onClick={onSubmit} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Send Request
      </Button>
      {notice ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{notice}</p> : null}
    </GlassCard>
  );
}

function LeadInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function GallerySection({
  images,
  allImages,
  className = "",
  onOpen
}: {
  images: ProfileGalleryImage[];
  allImages: ProfileGalleryImage[];
  className?: string;
  onOpen: (index: number) => void;
}) {
  return (
      <GlassCard className={`overflow-hidden ${className}`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-champagne">Media</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Profile gallery</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {allImages.length
                ? `${allImages.length} approved media item${allImages.length === 1 ? "" : "s"} shown in a consistent 3:4 portrait preview frame.`
                : "No public gallery media has been added yet."}
            </p>
          </div>
          <span className="w-fit rounded-full bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted ring-1 ring-slate-200">
            1200 x 1600 px
          </span>
        </div>

        {images.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => (
              <button
                key={image.id || `${image.imageUrl}-${index}`}
                onClick={() => onOpen(index)}
                className="group relative aspect-[3/4] overflow-hidden rounded-[1.25rem] bg-white text-left shadow-sm ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:shadow-glass"
              >
                <GalleryMedia src={image.imageUrl} alt={image.altText || image.title || "Profile gallery media"} className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/72 to-transparent p-3 text-white">
                  <p className="truncate text-sm font-semibold">{image.title || "Gallery media"}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex min-h-64 items-center justify-center rounded-[1.6rem] border border-dashed border-champagne/40 bg-white/55 text-center">
            <div className="px-6">
              <ImageIcon className="mx-auto h-10 w-10 text-champagne" />
              <h3 className="mt-3 text-lg font-semibold text-ink">No gallery available</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">This profile has not added public gallery media yet.</p>
            </div>
          </div>
        )}
      </GlassCard>
    );
}

function whatsappHref(phone?: string, name?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return undefined;
  const text = encodeURIComponent(`Hi, I found ${name || "your profile"} on the directory and want to know more.`);
  return `https://wa.me/${digits}?text=${text}`;
}

function resolveMediaSrc(src: string) {
  if (src.startsWith("/uploads/") || src.startsWith("/api/uploads/")) {
    return `${getApiBase().replace(/\/$/, "")}${src}`;
  }
  return src;
}

function escapeSvgText(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char] || char));
}

function mediaFallbackSrc(label: string) {
  const title = escapeSvgText(String(label || "Directory media").trim().slice(0, 42) || "Directory media");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="70" y="70" width="1060" height="660" rx="42" fill="rgba(255,255,255,0.58)" stroke="#d6b46a" stroke-opacity="0.45" stroke-width="4"/><circle cx="600" cy="340" r="76" fill="#d6b46a" fill-opacity="0.2"/><path d="M558 352h84l-24-34-22 26-15-18-23 26Z" fill="#9a7a28"/><text x="600" y="492" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#182230">${title}</text><text x="600" y="552" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#64748b">Image preview unavailable</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function ManagedImage({ src, alt, className, sizes, priority = false }: { src: string; alt: string; className: string; sizes: string; priority?: boolean }) {
  const fallback = useMemo(() => mediaFallbackSrc(alt), [alt]);
  const [currentSrc, setCurrentSrc] = useState(() => src ? resolveMediaSrc(src) : fallback);

  useEffect(() => {
    setCurrentSrc(src ? resolveMediaSrc(src) : fallback);
  }, [src, fallback]);

  return (
    <Image
      src={currentSrc || fallback}
      alt={alt}
      fill
      priority={priority}
      className={className}
      sizes={sizes}
      onError={() => setCurrentSrc(fallback)}
    />
  );
}

function GalleryMedia({ src, alt, className, eager = false }: { src: string; alt: string; className: string; eager?: boolean }) {
  const fallback = useMemo(() => mediaFallbackSrc(alt), [alt]);
  const [currentSrc, setCurrentSrc] = useState(() => src ? resolveMediaSrc(src) : fallback);

  useEffect(() => {
    setCurrentSrc(src ? resolveMediaSrc(src) : fallback);
  }, [src, fallback]);

  if (isVideoMedia(currentSrc)) {
    return (
      <div className="absolute inset-0 bg-ink">
        <video
          src={currentSrc}
          aria-label={alt}
          controls={eager}
          muted
          playsInline
          preload={eager ? "metadata" : "none"}
          className={`h-full w-full ${className}`}
          onError={() => setCurrentSrc(fallback)}
        />
        {!eager ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
            <FileVideo className="h-3.5 w-3.5" /> Video
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={currentSrc || fallback}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
      onError={() => setCurrentSrc(fallback)}
    />
  );
}

function LightboxMedia({ src, alt }: { src: string; alt: string }) {
  const fallback = useMemo(() => mediaFallbackSrc(alt), [alt]);
  const [currentSrc, setCurrentSrc] = useState(() => src ? resolveMediaSrc(src) : fallback);

  useEffect(() => {
    setCurrentSrc(src ? resolveMediaSrc(src) : fallback);
  }, [src, fallback]);

  if (isVideoMedia(currentSrc)) {
    return (
      <video
        src={currentSrc}
        aria-label={alt}
        controls
        playsInline
        preload="metadata"
        className="max-h-[calc(86vh-5.5rem)] max-w-full object-contain"
        onError={() => setCurrentSrc(fallback)}
      />
    );
  }

  return (
    <img
      src={currentSrc || fallback}
      alt={alt}
      loading="eager"
      decoding="async"
      className="max-h-[calc(86vh-5.5rem)] max-w-full object-contain"
      onError={() => setCurrentSrc(fallback)}
    />
  );
}

function isVideoMedia(value: string) {
  return /\.(mp4|webm|mov|m4v|ogv)(?:$|\?)/i.test(String(value || "").toLowerCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function Action({
  icon,
  label,
  href,
  onClick,
  tone = "default",
  className = ""
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "call" | "whatsapp" | "quote" | "website";
  className?: string;
}) {
  const tones = {
    default: "bg-white/80 text-ink hover:bg-white",
    call: "bg-blue-600 text-white hover:bg-blue-700",
    whatsapp: "bg-emerald-600 text-white hover:bg-emerald-700",
    quote: "bg-amber-500 text-ink hover:bg-amber-400",
    website: "bg-indigo-600 text-white hover:bg-indigo-700"
  };
  const classes = `flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 md:w-auto ${tones[tone]} ${className}`;
  if (href) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} onClick={onClick} className={classes}>
        {icon}{label}
      </a>
    );
  }
  return <button type="button" onClick={onClick} className={classes}>{icon}{label}</button>;
}

function Info({ icon, label }: { icon: ReactNode; label: string }) {
  return <div className="flex items-start gap-3 rounded-2xl bg-white/65 px-4 py-3"><span className="mt-0.5 text-champagne">{icon}</span><span>{label || "Not available"}</span></div>;
}
