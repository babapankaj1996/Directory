"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileVideo,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { adminFetch, authFetch, getCurrentUser } from "@/lib/admin-auth";
import { apiUrl, getApiBase, normalizeProfile } from "@/lib/profiles";
import type { Listing, ProfileVerificationDocument } from "@/lib/data";
import { effectiveVerificationStatus as resolveEffectiveVerificationStatus } from "@/lib/verification-status";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UploadDropzone } from "@/components/upload-dropzone";
import { CategoryProfileAssist } from "@/components/category-profile-assist";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type EditFormState = {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  phoneCountryCode: string;
  phone: string;
  whatsappCountryCode: string;
  whatsapp: string;
  website: string;
  countryId: string;
  cityName: string;
  categoryName: string;
  address: string;
  shortDescription: string;
  description: string;
  services: string;
  pricing: string;
  businessHours: string;
  coverImage: string;
  avatarImage: string;
  adultAge: string;
  adultAvailableFor: string[];
  adultOrientation: string;
  adultHeight: string;
  adultBodyType: string;
  adultEthnicity: string;
  adultLanguages: string;
  adultAvailability: string[];
  adultBookingType: string[];
  adultMinimumDuration: string;
  adultRates: AdultRatesState;
};

type AdultRatesState = {
  oneHour: string;
  twoHours: string;
  dinnerDate: string;
  overnight: string;
  travelExtended: string;
  custom: string;
};

const steps = [
  { key: "business", label: "Business", icon: Building2 },
  { key: "location", label: "Location", icon: MapPin },
  { key: "details", label: "Details", icon: Sparkles },
  { key: "media", label: "Media", icon: ImagePlus },
  { key: "review", label: "Review", icon: CheckCircle2 }
];

const MAX_PROFILE_GALLERY_IMAGES = 10;
const phoneCountryCodes = [
  { code: "+91", label: "India", short: "IN" },
  { code: "+1", label: "United States", short: "US" },
  { code: "+971", label: "United Arab Emirates", short: "AE" },
  { code: "+44", label: "United Kingdom", short: "UK" },
  { code: "+61", label: "Australia", short: "AU" },
  { code: "+65", label: "Singapore", short: "SG" },
  { code: "+966", label: "Saudi Arabia", short: "SA" },
  { code: "+974", label: "Qatar", short: "QA" },
  { code: "+965", label: "Kuwait", short: "KW" },
  { code: "+973", label: "Bahrain", short: "BH" }
];
const adultAvailableForOptions = ["Incall", "Outcall", "Only 5 Star Hotels"];
const adultOrientationOptions = ["Straight", "Bisexual", "Prefer not to say"];
const adultAvailabilityOptions = ["Weekdays", "Weekends", "Mornings", "Afternoons", "Evenings", "Late nights", "By appointment only"];
const adultBookingTypeOptions = ["In-call", "Out-call", "Dinner date", "Event date", "Travel date", "Overnight", "Extended booking"];
const adultMinimumDurationOptions = ["1 hour", "2 hours", "3 hours", "Dinner date", "Overnight", "24 hours", "Custom"];
const adultBodyTypeOptions = ["Slim", "Athletic", "Average", "Curvy", "Plus size", "Prefer not to say"];
const adultEthnicityOptions = ["Indian", "Asian", "Arab", "Black", "Caucasian", "Latina", "Mixed", "Prefer not to say"];

const emptyAdultRates: AdultRatesState = {
  oneHour: "",
  twoHours: "",
  dinnerDate: "",
  overnight: "",
  travelExtended: "",
  custom: ""
};

const emptyForm: EditFormState = {
  name: "",
  slug: "",
  ownerName: "",
  ownerEmail: "",
  phoneCountryCode: "+91",
  phone: "",
  whatsappCountryCode: "+91",
  whatsapp: "",
  website: "",
  countryId: "",
  cityName: "",
  categoryName: "",
  address: "",
  shortDescription: "",
  description: "",
  services: "",
  pricing: "",
  businessHours: "",
  coverImage: "",
  avatarImage: "",
  adultAge: "",
  adultAvailableFor: [],
  adultOrientation: "",
  adultHeight: "",
  adultBodyType: "",
  adultEthnicity: "",
  adultLanguages: "",
  adultAvailability: [],
  adultBookingType: [],
  adultMinimumDuration: "",
  adultRates: { ...emptyAdultRates }
};

function listToText(value: string[]) {
  return value.join("\n");
}

function toList(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function splitPhoneNumber(value?: string) {
  const phone = String(value || "").trim();
  const match = phone.match(/^(\+\d{1,4})\s*(.*)$/);
  if (!match) return { countryCode: "+91", number: phone };
  const countryCode = phoneCountryCodes.some((item) => item.code === match[1]) ? match[1] : "+91";
  return { countryCode, number: match[2] || "" };
}

function formatPhoneNumber(countryCode: string, number: string) {
  const cleanNumber = number.trim();
  if (!cleanNumber) return "";
  if (cleanNumber.startsWith("+")) return cleanNumber;
  return `${countryCode} ${cleanNumber}`.trim();
}

function mergeUnique(...groups: string[][]) {
  const seen = new Set<string>();
  return groups.flat().map((item) => item.trim()).filter((item) => {
    if (!item) return false;
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function prefixedValue(lines: string[], label: string) {
  const prefix = `${label}:`;
  const line = lines.find((item) => item.toLowerCase().startsWith(prefix.toLowerCase()));
  return line ? line.slice(prefix.length).trim() : "";
}

function prefixedList(lines: string[], label: string) {
  return prefixedValue(lines, label).split(",").map((item) => item.trim()).filter(Boolean);
}

function withoutGeneratedAdultLines(lines: string[], labels: string[]) {
  return lines.filter((line) => !labels.some((label) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`)));
}

const adultServiceLabels = ["Age", "Available for", "Orientation", "Height", "Body type", "Ethnicity", "Languages spoken", "Booking type", "Minimum booking duration"];
const adultPricingLabels = ["1 hour", "2 hours", "Dinner date", "Overnight", "Travel / extended booking", "Custom"];
const adultHourLabels = ["Availability"];

function adultDetailLines(form: EditFormState) {
  return [
    form.adultAge.trim() ? `Age: ${form.adultAge.trim()}` : "",
    form.adultAvailableFor.length ? `Available for: ${form.adultAvailableFor.join(", ")}` : "",
    form.adultOrientation ? `Orientation: ${form.adultOrientation}` : "",
    form.adultHeight.trim() ? `Height: ${form.adultHeight.trim()}` : "",
    form.adultBodyType ? `Body type: ${form.adultBodyType}` : "",
    form.adultEthnicity ? `Ethnicity: ${form.adultEthnicity}` : "",
    form.adultLanguages.trim() ? `Languages spoken: ${form.adultLanguages.trim()}` : "",
    form.adultBookingType.length ? `Booking type: ${form.adultBookingType.join(", ")}` : "",
    form.adultMinimumDuration ? `Minimum booking duration: ${form.adultMinimumDuration}` : ""
  ].filter(Boolean);
}

function adultAvailabilityLines(form: EditFormState) {
  return form.adultAvailability.length ? [`Availability: ${form.adultAvailability.join(", ")}`] : [];
}

function adultPricingLines(form: EditFormState) {
  return [
    form.adultRates.oneHour.trim() ? `1 hour: ${form.adultRates.oneHour.trim()}` : "",
    form.adultRates.twoHours.trim() ? `2 hours: ${form.adultRates.twoHours.trim()}` : "",
    form.adultRates.dinnerDate.trim() ? `Dinner date: ${form.adultRates.dinnerDate.trim()}` : "",
    form.adultRates.overnight.trim() ? `Overnight: ${form.adultRates.overnight.trim()}` : "",
    form.adultRates.travelExtended.trim() ? `Travel / extended booking: ${form.adultRates.travelExtended.trim()}` : "",
    form.adultRates.custom.trim() ? `Custom: ${form.adultRates.custom.trim()}` : ""
  ].filter(Boolean);
}

function formFromListing(listing: Listing): EditFormState {
  const services = listing.services || [];
  const pricing = listing.pricing || [];
  const hours = listing.hours || [];
  const phone = splitPhoneNumber(listing.phone);
  const whatsapp = splitPhoneNumber(listing.whatsapp);
  const isAdult = Boolean(listing.isAdult);
  return {
    name: listing.name,
    slug: listing.slug,
    ownerName: listing.ownerName,
    ownerEmail: listing.ownerEmail || listing.email || "",
    phoneCountryCode: phone.countryCode,
    phone: phone.number,
    whatsappCountryCode: whatsapp.countryCode,
    whatsapp: whatsapp.number,
    website: listing.website || "",
    countryId: listing.country.toUpperCase(),
    cityName: listing.cityName || listing.city,
    categoryName: listing.category || listing.categorySlug,
    address: listing.address || listing.location || "",
    shortDescription: listing.shortDescription || "",
    description: listing.about || "",
    services: listToText(isAdult ? withoutGeneratedAdultLines(services, adultServiceLabels) : services),
    pricing: listToText(isAdult ? withoutGeneratedAdultLines(pricing, adultPricingLabels) : pricing),
    businessHours: listToText(isAdult ? withoutGeneratedAdultLines(hours, adultHourLabels) : hours),
    coverImage: listing.coverImage || listing.image || "",
    avatarImage: listing.avatarImage || "",
    adultAge: prefixedValue(services, "Age"),
    adultAvailableFor: prefixedList(services, "Available for"),
    adultOrientation: prefixedValue(services, "Orientation"),
    adultHeight: prefixedValue(services, "Height"),
    adultBodyType: prefixedValue(services, "Body type"),
    adultEthnicity: prefixedValue(services, "Ethnicity"),
    adultLanguages: prefixedValue(services, "Languages spoken"),
    adultAvailability: prefixedList(hours, "Availability"),
    adultBookingType: prefixedList(services, "Booking type"),
    adultMinimumDuration: prefixedValue(services, "Minimum booking duration"),
    adultRates: {
      oneHour: prefixedValue(pricing, "1 hour"),
      twoHours: prefixedValue(pricing, "2 hours"),
      dinnerDate: prefixedValue(pricing, "Dinner date"),
      overnight: prefixedValue(pricing, "Overnight"),
      travelExtended: prefixedValue(pricing, "Travel / extended booking"),
      custom: prefixedValue(pricing, "Custom")
    }
  };
}

export function OwnerProfileEditor({ admin = false, listingId }: { admin?: boolean; listingId?: string }) {
  const searchParams = useSearchParams();
  const requestedListing = admin ? listingId : searchParams.get("listing");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [gallery, setGallery] = useState<Listing["gallery"]>([]);
  const [verificationDocuments, setVerificationDocuments] = useState<ProfileVerificationDocument[]>([]);
  const [form, setForm] = useState<EditFormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setNotice("");
      if (admin) {
        const response = requestedListing
          ? await adminFetch(apiUrl(`/api/admin/listings/${requestedListing}`)).catch(() => undefined)
          : undefined;
        if (!mounted) return;
        if (response?.ok) {
          const payload = await response.json() as { data?: unknown };
          if (payload.data) {
            const selected = normalizeProfile(payload.data);
            setUser({ id: "admin", name: "Admin", email: "", role: "ADMIN" });
            setListing(selected);
            setGallery(selected.gallery || []);
            setVerificationDocuments(selected.verificationDocuments || []);
            setForm(formFromListing(selected));
          }
        }
        setLoading(false);
        return;
      }
      const sessionUser = await getCurrentUser().catch(() => undefined);
      if (!mounted) return;
      if (sessionUser && typeof sessionUser === "object" && "role" in sessionUser) {
        setUser(sessionUser as SessionUser);
      }
      const response = await authFetch(apiUrl(`/api/dashboard/listings`)).catch(() => undefined);
      if (!mounted) return;
      if (response?.ok) {
        const payload = await response.json() as { data?: unknown };
        const listings = Array.isArray(payload.data) ? payload.data.map(normalizeProfile) : [];
        const selected = listings.find((item) => item.slug === requestedListing || item.id === requestedListing) || listings[0];
        if (selected) {
          setListing(selected);
          setGallery(selected.gallery || []);
          setVerificationDocuments(selected.verificationDocuments || []);
          setForm(formFromListing(selected));
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [admin, requestedListing]);

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;
  const galleryCount = gallery?.length || 0;
  const galleryLimitReached = galleryCount >= MAX_PROFILE_GALLERY_IMAGES;
  const isAdultListing = Boolean(listing?.isAdult);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#verification") {
      setStep(3);
    }
  }, []);

  useEffect(() => {
    if (step !== 3 || typeof window === "undefined" || window.location.hash !== "#verification") return;
    window.setTimeout(() => document.getElementById("verification")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [step]);

  const requiredMissing = useMemo(() => {
    if (step === 0) return [
      !form.name.trim() && "Business name",
      !form.ownerName.trim() && "Owner name",
      !form.phone.trim() && "Phone"
    ].filter(Boolean);
    if (step === 1) return [
      !form.address.trim() && "Address"
    ].filter(Boolean);
    if (step === 2) return [
      !form.description.trim() && "Description",
      isAdultListing && (!form.adultAge.trim() || Number(form.adultAge) < 18) && "Adult age 18+",
      isAdultListing && !form.adultAvailableFor.length && "Available for",
      isAdultListing && !form.adultBookingType.length && "Booking type",
      isAdultListing && !form.adultMinimumDuration && "Minimum booking duration"
    ].filter(Boolean);
    return [];
  }, [form, isAdultListing, step]);

  function update<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAdultOption(key: "adultAvailableFor" | "adultAvailability" | "adultBookingType", option: string) {
    setForm((current) => {
      const selected = current[key];
      const exists = selected.includes(option);
      return {
        ...current,
        [key]: exists ? selected.filter((item) => item !== option) : [...selected, option]
      };
    });
  }

  function updateAdultRate(key: keyof AdultRatesState, value: string) {
    setForm((current) => ({
      ...current,
      adultRates: { ...current.adultRates, [key]: value }
    }));
  }

  function goNext() {
    if (requiredMissing.length) {
      setNotice(`Required before next step: ${requiredMissing.join(", ")}.`);
      return;
    }
    setNotice("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function save(saveMode: "DRAFT" | "SUBMIT" = "SUBMIT") {
    if (!listing) return;
    const isDraft = saveMode === "DRAFT" && listing.status === "draft";
    const missing = [
      !form.name.trim() && "Business name",
      !form.ownerName.trim() && "Owner name",
      !form.phone.trim() && "Phone",
      !form.address.trim() && "Address",
      !form.description.trim() && "Description",
      isAdultListing && (!form.adultAge.trim() || Number(form.adultAge) < 18) && "Adult age 18+",
      isAdultListing && !form.adultAvailableFor.length && "Available for",
      isAdultListing && !form.adultBookingType.length && "Booking type",
      isAdultListing && !form.adultMinimumDuration && "Minimum booking duration"
    ].filter(Boolean);
    if (!isDraft && missing.length) {
      setNotice(`Required: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    setNotice("");
    const services = isAdultListing ? mergeUnique(toList(form.services), adultDetailLines(form)) : toList(form.services);
    const pricing = isAdultListing ? mergeUnique(toList(form.pricing), adultPricingLines(form)) : toList(form.pricing);
    const businessHours = isAdultListing ? mergeUnique(toList(form.businessHours), adultAvailabilityLines(form)) : toList(form.businessHours);
    const saveUrl = admin
      ? apiUrl(`/api/admin/listings/${listing.id || listing.slug}`)
      : apiUrl(`/api/dashboard/listings/${listing.id || listing.slug}`);
    const saveFetcher = admin ? adminFetch : authFetch;
    const response = await saveFetcher(saveUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        phone: formatPhoneNumber(form.phoneCountryCode, form.phone),
        whatsapp: formatPhoneNumber(form.whatsappCountryCode, form.whatsapp),
        website: form.website.trim(),
        address: form.address.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        services,
        pricing,
        businessHours,
        coverImage: form.coverImage.trim(),
        avatarImage: form.avatarImage.trim(),
        status: admin ? listing.status.toUpperCase() : isDraft ? "DRAFT" : "PENDING",
        saveMode
      })
    }).catch(() => undefined);

    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as { error?: string } : {};
      setNotice(payload.error || "Profile update failed.");
      setSaving(false);
      return;
    }

    const payload = await response.json() as { data?: unknown };
    const updated = normalizeProfile(payload.data);
    setListing(updated);
    setGallery(updated.gallery || gallery);
    setVerificationDocuments(updated.verificationDocuments || verificationDocuments);
    setForm(formFromListing(updated));
    setNotice(admin ? "Profile saved with the same owner edit form. Current moderation status was kept." : isDraft ? "Draft saved. Complete the missing fields and submit for review when ready." : "Profile saved. It is pending admin review again before public changes are trusted.");
    setSaving(false);
  }

  async function addGalleryImage(url: string) {
    if (!listing) return;
    if (galleryLimitReached) {
      setNotice(`Gallery limit reached. Each profile can have up to ${MAX_PROFILE_GALLERY_IMAGES} media items.`);
      return;
    }
    const video = isVideoMedia(url);
    const galleryUrl = admin
      ? apiUrl(`/api/admin/listings/${listing.id || listing.slug}/gallery`)
      : apiUrl(`/api/dashboard/listings/${listing.id || listing.slug}/gallery`);
    const galleryFetcher = admin ? adminFetch : authFetch;
    const response = await galleryFetcher(galleryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: url,
        title: video ? "Profile video" : "Gallery media",
        altText: `${form.name || listing.name} ${video ? "profile video" : "gallery media"}`,
        category: video ? "Videos" : "Gallery",
        sortOrder: (gallery?.length || 0) + 1,
        isActive: true
      })
    }).catch(() => undefined);
    if (response?.ok) {
      const payload = await response.json() as { data?: unknown };
      const next = normalizeProfile({ ...listing, gallery: [...(gallery || []), payload.data] }).gallery || [];
      setGallery(next);
      setNotice(`${video ? "Video" : "Gallery media"} uploaded and attached to your profile.`);
    } else {
      setNotice("Media uploaded, but gallery attachment failed. Add the returned URL again or contact admin.");
    }
  }

  async function addVerificationDocument(url: string, type: "GOV_ID" | "AGE_SELFIE", originalName?: string) {
    if (!listing) return;
    const optimistic: ProfileVerificationDocument = {
      id: `local-doc-${Date.now()}`,
      profileId: listing.id,
      type,
      fileUrl: url,
      originalName,
      status: "PENDING"
    };
    setVerificationDocuments((current) => [optimistic, ...current]);
    setListing((current) => current ? { ...current, verificationStatus: "PENDING", verificationNotes: undefined } : current);
    setNotice("Verification document uploaded. Admin will review it from the Verification tab.");

    const documentUrl = admin
      ? apiUrl(`/api/admin/listings/${listing.id || listing.slug}/verification-documents`)
      : apiUrl(`/api/dashboard/listings/${listing.id || listing.slug}/verification-documents`);
    const documentFetcher = admin ? adminFetch : authFetch;
    const response = await documentFetcher(documentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, fileUrl: url, originalName })
    }).catch(() => undefined);

    if (response?.ok) {
      const payload = await response.json() as { data?: ProfileVerificationDocument };
      if (payload.data) {
        setVerificationDocuments((current) => current.map((document) => document.id === optimistic.id ? payload.data as ProfileVerificationDocument : document));
      }
    } else {
      setVerificationDocuments((current) => current.filter((document) => document.id !== optimistic.id));
      setNotice("Verification document upload could not be attached to your profile.");
    }
  }

  if (loading) {
    return (
      <main className={admin ? "" : "mx-auto max-w-6xl px-4 py-10"}>
        <GlassCard className="p-6 md:p-8">
          <div className="h-5 w-44 animate-pulse rounded-full bg-white/80" />
          <div className="mt-5 h-9 w-80 max-w-full animate-pulse rounded-2xl bg-white/80" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="h-24 animate-pulse rounded-2xl bg-white/70" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/70" />
          </div>
        </GlassCard>
      </main>
    );
  }

  if (user?.role === "USER") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <GlassCard className="p-6 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-800 ring-1 ring-blue-200">
            Review user account
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-ink">Review users cannot edit listings</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">Use this account to review approved profiles. Business profile editing is available to Business Owner accounts.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/listings" variant="gold">Explore Listings</Button>
            <Button href="/dashboard" variant="ghost">Dashboard</Button>
          </div>
        </GlassCard>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className={admin ? "" : "mx-auto max-w-6xl px-4 py-10"}>
        <GlassCard className="p-6 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-800 ring-1 ring-amber-200">
            No profile found
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-ink">{admin ? "Admin profile could not be loaded" : "Create your business profile first"}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">{admin ? "Go back to the admin listing manager and open the profile again." : "Each owner account can manage one business profile. Once submitted, country, city, category and slug are locked."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={admin ? "/admin/listings" : "/dashboard/add-profile"} variant="gold">{admin ? "Admin Listings" : "Add Profile"}</Button>
            <Button href={admin ? "/admin" : "/dashboard"} variant="ghost">{admin ? "Admin Dashboard" : "Dashboard"}</Button>
          </div>
        </GlassCard>
      </main>
    );
  }

  const publicHref = `/${listing.country}/${listing.city}/${listing.categorySlug}/${listing.slug}`;
  const needsVerification = Boolean(listing.isAdult || verificationDocuments.length || (listing.verificationStatus && listing.verificationStatus !== "NOT_REQUIRED"));

  return (
    <main className={admin ? "" : "mx-auto max-w-7xl px-4 py-10 md:py-12"}>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-champagne">{admin ? "Admin profile editor" : "Business profile dashboard"}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">{admin ? "Edit profile" : "Edit your profile"}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted">
            {admin ? "This uses the same step-by-step editor owners use, with admin permissions for saving content, gallery uploads and verification documents." : "These fields match the Add Profile flow. Country, city, category and profile slug are locked after submission to keep the public profile address stable."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {listing.status === "approved" ? <Button href={publicHref} variant="ghost">Public Page</Button> : <Button href={admin ? `/admin/listings/${listing.slug}` : `/dashboard/profile/${listing.slug}`} variant="ghost">{admin ? "Review Page" : "Preview Page"}</Button>}
          <Button href={admin ? "/admin/listings" : "/dashboard"} variant="ghost">{admin ? "Admin Listings" : "Dashboard"}</Button>
        </div>
      </div>

      <GlassCard className="p-4 sm:p-6 md:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne shadow-sm ring-1 ring-slate-200">
              <UserRound className="h-4 w-4" /> {admin ? "Admin edit flow" : "Owner edit flow"}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-ink md:text-3xl">{listing.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Current status: <span className="font-semibold text-ink">{listing.status}</span>. {admin ? "Saving changes keeps the current moderation status." : "Saving changes sends the profile back to pending review."}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">
            <LockKeyhole className="mr-2 inline h-4 w-4 text-champagne" />
            {admin ? "Profile URL locked" : "One profile per owner"}
          </div>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-5">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const done = index < step;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setStep(index)}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                  active ? "bg-ink text-white shadow-glass" : done ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100" : "bg-white text-muted ring-1 ring-slate-200 hover:text-ink"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/15 text-champagne" : "bg-white text-champagne shadow-sm"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 rounded-[1.6rem] bg-white/75 p-4 ring-1 ring-slate-200 sm:p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-champagne shadow-sm">
              <StepIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Step {step + 1} of {steps.length}</p>
              <h3 className="text-xl font-semibold text-ink">{currentStep.label}</h3>
            </div>
          </div>

          {step === 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Business Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Business name" />
              <LockedField label="Profile Slug" value={form.slug} />
              <Field label="Owner Name" value={form.ownerName} onChange={(value) => update("ownerName", value)} placeholder="Business owner" />
              <Field label="Owner Email" value={form.ownerEmail} onChange={(value) => update("ownerEmail", value)} placeholder="hello@example.com" type="email" />
              <PhoneField
                label="Phone"
                countryCode={form.phoneCountryCode}
                onCountryCodeChange={(value) => update("phoneCountryCode", value)}
                value={form.phone}
                onChange={(value) => update("phone", value)}
                placeholder="92891 09245"
              />
              <PhoneField
                label="WhatsApp"
                countryCode={form.whatsappCountryCode}
                onCountryCodeChange={(value) => update("whatsappCountryCode", value)}
                value={form.whatsapp}
                onChange={(value) => update("whatsapp", value)}
                placeholder="92891 09245"
              />
              <Field label="Website" value={form.website} onChange={(value) => update("website", value)} placeholder="https://example.com" className="md:col-span-2" />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <LockedField label="Country" value={form.countryId} />
              <LockedField label="City" value={form.cityName} />
              <LockedField label="Category" value={form.categoryName} />
              <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-200">
                Country, city, category and slug cannot be changed after posting.
              </div>
              <Field label="Address" value={form.address} onChange={(value) => update("address", value)} placeholder="Delhi NCR, India" className="md:col-span-2" />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {isAdultListing ? (
                <AdultProfileFields
                  form={form}
                  update={update}
                  toggleOption={toggleAdultOption}
                  updateRate={updateAdultRate}
                />
              ) : (
                <CategoryProfileAssist
                  categorySlug={listing.categorySlug}
                  services={form.services}
                  pricing={form.pricing}
                  businessHours={form.businessHours}
                  onServicesChange={(value) => update("services", value)}
                  onPricingChange={(value) => update("pricing", value)}
                  onBusinessHoursChange={(value) => update("businessHours", value)}
                />
              )}
              <Field label="Short Description" value={form.shortDescription} onChange={(value) => update("shortDescription", value)} placeholder="A concise one-line summary" className="md:col-span-2" />
              <Textarea label="Full Description" value={form.description} onChange={(value) => update("description", value)} placeholder="Write the complete profile description..." />
              <Textarea label={isAdultListing ? "Additional Services" : "Additional Service Notes"} value={form.services} onChange={(value) => update("services", value)} placeholder={isAdultListing ? "Add extra public service notes, one per line" : "Use the category builder above or enter one service per line"} />
              <Textarea label={isAdultListing ? "Additional Rates / Donation" : "Additional Pricing Notes"} value={form.pricing} onChange={(value) => update("pricing", value)} placeholder={isAdultListing ? "Add custom rate notes if needed" : "Use the pricing builder above or enter one pricing item per line"} />
              <Textarea label={isAdultListing ? "Additional Availability Notes" : "Additional Timing Notes"} value={form.businessHours} onChange={(value) => update("businessHours", value)} placeholder={isAdultListing ? "Example: Advance booking required" : "Use timing presets above or enter public hours"} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-4 md:col-span-2">
                <UploadDropzone
                  label="Cover image"
                  type="cover"
                  value={form.coverImage}
                  requirement="Landscape, JPG or PNG"
                  helper="The wide banner at the top of your profile. A 16:9 photo works best."
                  onUploaded={(url) => update("coverImage", url)}
                  onCleared={() => update("coverImage", "")}
                />
                <UploadDropzone
                  label="Profile picture or logo"
                  type="avatar"
                  value={form.avatarImage}
                  requirement="Square, JPG or PNG"
                  helper="Shown beside your name in search results."
                  onUploaded={(url) => update("avatarImage", url)}
                  onCleared={() => update("avatarImage", "")}
                />
                <UploadDropzone
                  label="Add a photo or video"
                  type="gallery"
                  requirement={`${galleryCount}/${MAX_PROFILE_GALLERY_IMAGES} used`}
                  helper="Best at 1200 x 1600 px (3:4) — the same portrait frame visitors see."
                  disabled={galleryLimitReached}
                  disabledMessage={`Gallery is full — ${MAX_PROFILE_GALLERY_IMAGES} items maximum.`}
                  onUploaded={addGalleryImage}
                />
                <div id="verification" className="scroll-mt-24 rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-lg font-semibold text-ink">Verification documents</h4>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        Listing approval and document verification are separate. {needsVerification ? "If admin rejects a document, the comment below explains what to upload again." : "This profile does not require documents yet, but you can upload them if admin asks for proof."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <VerificationStatusBox listing={listing} documents={verificationDocuments} />
                    {/* Identity documents are handled on their own page, so
                        private ID is never mixed into the form used for public
                        marketing content. */}
                    <Link
                      href="/dashboard/verification"
                      className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-copper-600"
                    >
                      Manage verification documents
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex min-h-44 items-center justify-center rounded-[1.5rem] border border-dashed border-champagne/70 bg-white text-center md:col-span-2">
                <div>
                  <ImagePlus className="mx-auto h-8 w-8 text-champagne" />
                  <p className="mt-2 text-sm font-semibold text-ink">Update public URLs or upload local files</p>
                  <p className="text-xs text-muted">Gallery previews use one clean 3:4 portrait frame. Recommended photo size: 1200 x 1600 px.</p>
                </div>
              </div>
              {gallery?.length ? (
                <div className="grid gap-3 md:col-span-2">
                  <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-muted ring-1 ring-slate-200">
                    Gallery usage: {galleryCount}/{MAX_PROFILE_GALLERY_IMAGES} media items. {admin ? "Remove or reorder old media from the listing review gallery tools if needed." : "Ask admin to remove old media if you need to replace them."}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {gallery.map((image) => (
                      <div key={image.id || image.imageUrl} className="overflow-hidden rounded-2xl bg-white text-sm ring-1 ring-slate-200">
                        <MediaPreview src={image.imageUrl} alt={image.altText || image.title || "Gallery media"} />
                        <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-3">
                          <span className="min-w-0 truncate font-semibold text-ink">{image.title || "Gallery media"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <ReviewItem label="Business" value={form.name || "Not added"} />
              <ReviewItem label="Owner" value={form.ownerName || "Not added"} />
              <ReviewItem label="Country" value={form.countryId} />
              <ReviewItem label="City" value={form.cityName} />
              <ReviewItem label="Category" value={form.categoryName} />
              <ReviewItem label="Status after save" value={admin ? listing.status : "Pending approval"} />
              <ReviewItem label="Phone" value={formatPhoneNumber(form.phoneCountryCode, form.phone) || "Not added"} />
              <ReviewItem label="Website" value={form.website || "Not added"} />
              {isAdultListing ? <ReviewItem label="Adult age" value={form.adultAge || "Missing"} /> : null}
              {isAdultListing ? <ReviewItem label="Minimum booking" value={form.adultMinimumDuration || "Missing"} /> : null}
              <ReviewItem label="URL slug" value={form.slug || "Not generated"} />
            </div>
          ) : null}
        </div>

        {notice ? <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{notice}</p> : null}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => setForm(formFromListing(listing))}>Reset</Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button variant="primary" disabled={saving} onClick={goNext}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                {listing.status === "draft" ? <Button variant="ghost" disabled={saving} onClick={() => save("DRAFT")}>Save Draft</Button> : null}
                <Button variant="gold" disabled={saving} onClick={() => save("SUBMIT")}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {listing.status === "draft" ? "Submit for Review" : "Save Profile"}
                </Button>
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={className}>
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

function PhoneField({
  label,
  countryCode,
  onCountryCodeChange,
  value,
  onChange,
  placeholder
}: {
  label: string;
  countryCode: string;
  onCountryCodeChange: (value: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <div className="grid grid-cols-[132px_minmax(0,1fr)] gap-2">
        <select
          value={countryCode}
          onChange={(event) => onCountryCodeChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
          aria-label={`${label} country code`}
        >
          {phoneCountryCodes.map((item) => (
            <option key={`${label}-${item.code}`} value={item.code}>{item.short} {item.code}</option>
          ))}
        </select>
        <input
          type="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition ${selected.includes(option) ? "bg-ink text-white ring-ink" : "bg-cloud text-ink ring-slate-200"}`}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="h-4 w-4"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function AdultProfileFields({
  form,
  update,
  toggleOption,
  updateRate
}: {
  form: EditFormState;
  update: <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => void;
  toggleOption: (key: "adultAvailableFor" | "adultAvailability" | "adultBookingType", option: string) => void;
  updateRate: (key: keyof AdultRatesState, value: string) => void;
}) {
  return (
    <div className="md:col-span-2 grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-200 md:col-span-2">
        <p className="font-bold">Adult service details</p>
        <p className="mt-1">These fields replace the old generic category options for 18+ profiles and save into the existing services, pricing and availability sections.</p>
      </div>
      <Field label="Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Public profile name" />
      <Field label="Age" type="number" value={form.adultAge} onChange={(value) => update("adultAge", value)} placeholder="18+" />
      <CheckboxGroup
        label="Available For"
        options={adultAvailableForOptions}
        selected={form.adultAvailableFor}
        onToggle={(option) => toggleOption("adultAvailableFor", option)}
      />
      <SelectField
        label="Orientation"
        value={form.adultOrientation}
        onChange={(value) => update("adultOrientation", value)}
        options={adultOrientationOptions}
        placeholder="Select orientation"
      />
      <Field label="Height" value={form.adultHeight} onChange={(value) => update("adultHeight", value)} placeholder="Example: 5 ft 6 in" />
      <SelectField
        label="Body Type"
        value={form.adultBodyType}
        onChange={(value) => update("adultBodyType", value)}
        options={adultBodyTypeOptions}
        placeholder="Select body type"
      />
      <SelectField
        label="Ethnicity"
        value={form.adultEthnicity}
        onChange={(value) => update("adultEthnicity", value)}
        options={adultEthnicityOptions}
        placeholder="Select ethnicity"
      />
      <Field label="Languages Spoken" value={form.adultLanguages} onChange={(value) => update("adultLanguages", value)} placeholder="Hindi, English" />
      <CheckboxGroup
        label="Availability"
        options={adultAvailabilityOptions}
        selected={form.adultAvailability}
        onToggle={(option) => toggleOption("adultAvailability", option)}
      />
      <CheckboxGroup
        label="Booking Type"
        options={adultBookingTypeOptions}
        selected={form.adultBookingType}
        onToggle={(option) => toggleOption("adultBookingType", option)}
      />
      <SelectField
        label="Minimum Booking Duration"
        value={form.adultMinimumDuration}
        onChange={(value) => update("adultMinimumDuration", value)}
        options={adultMinimumDurationOptions}
        placeholder="Select minimum duration"
        className="md:col-span-2"
      />
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 md:col-span-2">
        <p className="text-sm font-semibold text-ink">Rates / Donation</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="1 hour" value={form.adultRates.oneHour} onChange={(value) => updateRate("oneHour", value)} placeholder="Example: INR 5000" />
          <Field label="2 hours" value={form.adultRates.twoHours} onChange={(value) => updateRate("twoHours", value)} placeholder="Example: INR 8000" />
          <Field label="Dinner date" value={form.adultRates.dinnerDate} onChange={(value) => updateRate("dinnerDate", value)} placeholder="Example: On request" />
          <Field label="Overnight" value={form.adultRates.overnight} onChange={(value) => updateRate("overnight", value)} placeholder="Example: On request" />
          <Field label="Travel / extended booking" value={form.adultRates.travelExtended} onChange={(value) => updateRate("travelExtended", value)} placeholder="Example: Custom quote" />
          <Field label="Custom" value={form.adultRates.custom} onChange={(value) => updateRate("custom", value)} placeholder="Any other rate note" />
        </div>
      </div>
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <div className="flex min-h-[46px] items-center gap-2 rounded-2xl border border-slate-200 bg-cloud px-4 py-3 text-sm font-semibold text-ink">
        <LockKeyhole className="h-4 w-4 shrink-0 text-champagne" />
        <span className="break-words">{value || "-"}</span>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="md:col-span-2">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function VerificationStatusBox({ listing, documents }: { listing: Listing; documents: ProfileVerificationDocument[] }) {
  const status = effectiveVerificationStatus(listing, documents);
  return (
    <div className="rounded-2xl bg-cloud p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-muted ring-1 ring-slate-200">
          Profile: {status.toLowerCase()}
        </span>
        {listing.verificationNotes ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-100">Admin note available</span>
        ) : null}
      </div>
      {listing.verificationNotes ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-100">
          {listing.verificationNotes}
        </p>
      ) : null}
      <div className="mt-4 grid gap-2">
        {documents.length ? documents.map((document) => (
          <div key={document.id || `${document.type}-${document.fileUrl}`} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink"><FileText className="mr-2 inline h-4 w-4 text-champagne" />{verificationDocumentLabel(document.type)}</p>
                <p className="mt-1 truncate text-xs text-muted">{document.originalName || "Private document uploaded"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${verificationTone(document.status || "PENDING")}`}>
                {(document.status || "PENDING").toLowerCase()}
              </span>
            </div>
            {document.adminNotes ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold leading-6 text-rose-800 ring-1 ring-rose-100">
                Admin comment: {document.adminNotes}
              </p>
            ) : null}
          </div>
        )) : (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-muted ring-1 ring-slate-200">
            No verification documents uploaded yet.
          </p>
        )}
      </div>
    </div>
  );
}

function verificationDocumentLabel(type?: string) {
  if (type === "GOV_ID") return "Government ID";
  if (type === "AGE_SELFIE") return "DOB selfie/photo";
  if (type === "BUSINESS_LICENSE") return "Business license";
  if (type === "ADDRESS_PROOF") return "Address proof";
  if (type === "CERTIFICATE") return "Certificate";
  return "Verification document";
}

function effectiveVerificationStatus(listing: Listing, documents: ProfileVerificationDocument[]) {
  return resolveEffectiveVerificationStatus({
    profileStatus: listing.verificationStatus,
    documents,
    isAdult: listing.isAdult
  });
}

function verificationTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "VERIFIED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (normalized === "REJECTED") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

function mediaPreviewUrl(value?: string) {
  const src = String(value || "");
  if (src.startsWith("/uploads/") || src.startsWith("/api/uploads/")) return `${getApiBase().replace(/\/$/, "")}${src}`;
  return src;
}

function isVideoMedia(value?: string) {
  return /\.(mp4|webm|mov|m4v|ogv)(?:$|\?)/i.test(String(value || "").toLowerCase());
}

function MediaPreview({ src, alt }: { src: string; alt: string }) {
  const preview = mediaPreviewUrl(src);
  if (isVideoMedia(src)) {
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-shade text-white">
        <video src={preview} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
          <FileVideo className="h-3.5 w-3.5" /> Video
        </span>
      </div>
    );
  }
  return <img src={preview} alt={alt} className="aspect-[3/4] w-full bg-cloud object-cover" />;
}
