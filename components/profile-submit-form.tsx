"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  ImagePlus,
  Loader2,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { VerifyEmailNotice } from "@/components/verify-email-notice";
import { UploadDropzone } from "@/components/upload-dropzone";
import { CategoryProfileAssist } from "@/components/category-profile-assist";
import { adminFetch, authFetch, getCurrentUser } from "@/lib/admin-auth";
import { categories, type Category, type Listing } from "@/lib/data";
import { apiUrl, getApiBase, normalizeProfile } from "@/lib/profiles";
import { useAllCountries, useCitySearch } from "@/lib/use-city-search";

type ProfileFormState = {
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
  citySlug: string;
  categoryId: string;
  address: string;
  shortDescription: string;
  description: string;
  services: string;
  pricing: string;
  businessHours: string;
  coverImage: string;
  avatarImage: string;
  certificateImage: string;
  workPhotoImage: string;
  galleryItems: GalleryFormItem[];
  govIdDocument: string;
  ageSelfieDocument: string;
  adultLegalConfirmed: boolean;
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
  status: string;
};

type AdultRatesState = {
  oneHour: string;
  twoHours: string;
  dinnerDate: string;
  overnight: string;
  travelExtended: string;
  custom: string;
};

type GalleryFormItem = {
  imageUrl: string;
  title: string;
  altText: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

type Option = {
  value: string;
  label: string;
  meta?: string;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
};

const defaultCover = "Upload a real cover photo. If empty, the public page shows a branded fallback.";
const maxProfileGalleryItems = 10;

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

const initialForm: ProfileFormState = {
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
  citySlug: "",
  categoryId: "",
  address: "",
  shortDescription: "",
  description: "",
  services: "",
  pricing: "",
  businessHours: "Mon - Fri: 9 AM - 6 PM",
  coverImage: "",
  avatarImage: "",
  certificateImage: "",
  workPhotoImage: "",
  galleryItems: [],
  govIdDocument: "",
  ageSelfieDocument: "",
  adultLegalConfirmed: false,
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
  adultRates: { ...emptyAdultRates },
  status: "PENDING"
};

const steps = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "location", label: "Location", icon: MapPin },
  { key: "details", label: "Details", icon: Sparkles },
  { key: "media", label: "Media", icon: ImagePlus },
  { key: "review", label: "Review", icon: CheckCircle2 }
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/_/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validProfileSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function toList(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function listToText(value?: string[]) {
  return Array.isArray(value) ? value.join("\n") : "";
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

function adultDetailLines(form: ProfileFormState) {
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

function adultAvailabilityLines(form: ProfileFormState) {
  return form.adultAvailability.length ? [`Availability: ${form.adultAvailability.join(", ")}`] : [];
}

function adultPricingLines(form: ProfileFormState) {
  return [
    form.adultRates.oneHour.trim() ? `1 hour: ${form.adultRates.oneHour.trim()}` : "",
    form.adultRates.twoHours.trim() ? `2 hours: ${form.adultRates.twoHours.trim()}` : "",
    form.adultRates.dinnerDate.trim() ? `Dinner date: ${form.adultRates.dinnerDate.trim()}` : "",
    form.adultRates.overnight.trim() ? `Overnight: ${form.adultRates.overnight.trim()}` : "",
    form.adultRates.travelExtended.trim() ? `Travel / extended booking: ${form.adultRates.travelExtended.trim()}` : "",
    form.adultRates.custom.trim() ? `Custom: ${form.adultRates.custom.trim()}` : ""
  ].filter(Boolean);
}

function isVideoUrl(value?: string) {
  return /\.(mp4|webm|mov|m4v|ogv)(?:$|\?)/i.test(String(value || "").trim());
}

function mediaPreviewUrl(value?: string) {
  const src = String(value || "");
  if (src.startsWith("/uploads/") || src.startsWith("/api/uploads/")) return `${getApiBase().replace(/\/$/, "")}${src}`;
  return src;
}

function formFromListing(listing: Listing): ProfileFormState {
  const govId = listing.verificationDocuments?.find((document) => document.type === "GOV_ID")?.fileUrl || "";
  const ageSelfie = listing.verificationDocuments?.find((document) => document.type === "AGE_SELFIE")?.fileUrl || "";
  const phone = splitPhoneNumber(listing.phone);
  const whatsapp = splitPhoneNumber(listing.whatsapp);
  return {
    name: listing.name === "Untitled draft" ? "" : listing.name,
    slug: listing.slug?.startsWith("draft-") ? "" : listing.slug,
    ownerName: listing.ownerName || "",
    ownerEmail: listing.ownerEmail || listing.email || "",
    phoneCountryCode: phone.countryCode,
    phone: phone.number,
    whatsappCountryCode: whatsapp.countryCode,
    whatsapp: whatsapp.number,
    website: listing.website || "",
    countryId: listing.country || "in",
    citySlug: listing.city || "delhi",
    categoryId: listing.categorySlug || "astrologer",
    address: listing.address || listing.location || "",
    shortDescription: listing.shortDescription || "",
    description: listing.about || "",
    services: listToText(listing.services),
    pricing: listToText(listing.pricing),
    businessHours: listToText(listing.hours) || initialForm.businessHours,
    coverImage: listing.coverImage || "",
    avatarImage: listing.avatarImage || "",
    certificateImage: "",
    workPhotoImage: "",
    galleryItems: (listing.gallery || []).slice(0, maxProfileGalleryItems).map((image, index) => ({
      imageUrl: image.imageUrl,
      title: image.title || "",
      altText: image.altText || "",
      category: image.category || (isVideoUrl(image.imageUrl) ? "Videos" : "Gallery"),
      sortOrder: image.sortOrder || index + 1,
      isActive: image.isActive !== false
    })),
    govIdDocument: govId,
    ageSelfieDocument: ageSelfie,
    adultLegalConfirmed: Boolean(listing.adultDisclaimerAcceptedAt),
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
    adultRates: { ...emptyAdultRates },
    status: listing.status === "draft" ? "DRAFT" : "PENDING"
  };
}

function selectedLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

export function ProfileSubmitForm({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(categories);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(!admin);
  const [existingListing, setExistingListing] = useState<Listing | null>(null);
  const [draftListing, setDraftListing] = useState<Listing | null>(null);
  const [notice, setNotice] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  // Owners register anywhere, so both selectors span every country and city,
  // not just the ones that already have listings.
  const { countries, loading: loadingCountries } = useAllCountries();

  const countryOptions = useMemo<Option[]>(
    () => countries.map((item) => ({ value: item.code, label: item.name, meta: item.code.toUpperCase() })),
    [countries]
  );
  // An owner must be able to register a business in any city, including one
  // with no listings yet, so these come from a search across every city rather
  // than from the ACTIVE-only list the public filters use.
  const [citySearch, setCitySearch] = useState("");
  const { cities: searchedCities, loading: searchingCities } = useCitySearch(form.countryId, citySearch);
  const cityOptions = useMemo<Option[]>(
    () => searchedCities.map((item) => ({ value: item.slug, label: item.name, meta: item.slug })),
    [searchedCities]
  );
  const categoryOptions = useMemo<Option[]>(
    () => availableCategories.map((item) => ({ value: item.slug, label: item.name, meta: `${item.isAdult ? "18+ category - " : ""}${item.description}` })),
    [availableCategories]
  );
  const statusOptions = useMemo<Option[]>(
    () => [
      { value: "PENDING", label: "Pending" },
      { value: "DRAFT", label: "Draft" },
      { value: "APPROVED", label: "Approved" },
      { value: "REJECTED", label: "Rejected" },
      { value: "SUSPENDED", label: "Suspended" }
    ],
    []
  );
  const selectedCategory = useMemo(() => availableCategories.find((item) => item.slug === form.categoryId), [availableCategories, form.categoryId]);
  const isAdultCategory = Boolean(selectedCategory?.isAdult);

  useEffect(() => {
    if (loadingCountries) return;
    if (!form.countryId) return;
    // Only clear an unknown country once the list has actually loaded; a
    // country with no listings yet is still a valid place to register.
    if (countries.length && !countries.some((item) => item.code === form.countryId)) {
      setForm((current) => current.countryId === form.countryId ? { ...current, countryId: "", citySlug: "" } : current);
    }
  }, [countries, form.countryId, loadingCountries]);

  useEffect(() => {
    let mounted = true;
    fetch(apiUrl(`/api/categories`), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { data?: Array<Record<string, unknown>> };
        if (!mounted || !Array.isArray(payload.data)) return;
        const activeCategories = payload.data
          .filter((item) => String(item.status || "ACTIVE").toUpperCase() === "ACTIVE")
          .map((item) => ({
            slug: String(item.slug || ""),
            name: String(item.name || ""),
            count: Number((item._count as { profiles?: number } | undefined)?.profiles || item.count || 0),
            description: String(item.description || ""),
            iconName: String(item.iconName || "Home"),
            isAdult: Boolean(item.isAdult),
            adultLevel: typeof item.adultLevel === "string" ? item.adultLevel : undefined,
            minimumAge: Number(item.minimumAge || 0),
            showOnHomepage: item.showOnHomepage !== false,
            indexable: item.indexable !== false
          }))
          .filter((item) => item.slug && item.name);
        if (activeCategories.length) setAvailableCategories(activeCategories);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (admin) return;
    let mounted = true;
    getCurrentUser()
      .then(async (user) => {
        if (!mounted) return;
        if (user && typeof user === "object" && "role" in user) {
          const sessionUser = user as SessionUser;
          setCurrentUser(sessionUser);
          if (sessionUser.role === "OWNER") {
            const response = await authFetch(apiUrl(`/api/dashboard/listings`)).catch(() => undefined);
            if (response?.ok) {
              const payload = await response.json() as { data?: unknown };
              if (mounted && Array.isArray(payload.data) && payload.data.length > 0) {
                const selected = normalizeProfile(payload.data[0]);
                if (selected.status === "draft") {
                  setDraftListing(selected);
                  setForm(formFromListing(selected));
                  setNotice("Draft loaded. Complete the missing details and submit it for admin review when ready.");
                } else {
                  setExistingListing(selected);
                }
              }
            }
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setCheckingProfile(false);
      });
    return () => {
      mounted = false;
    };
  }, [admin]);

  function update<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "countryId") next.citySlug = "";
      return next;
    });
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

  function addGalleryItem(item: GalleryFormItem) {
    setForm((current) => {
      if (current.galleryItems.length >= maxProfileGalleryItems) return current;
      return {
        ...current,
        galleryItems: [
          ...current.galleryItems,
          { ...item, sortOrder: current.galleryItems.length + 1, isActive: true }
        ]
      };
    });
  }

  function removeGalleryItem(index: number) {
    setForm((current) => ({
      ...current,
      galleryItems: current.galleryItems.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex + 1 }))
    }));
  }

  function requiredForCurrentStep() {
    if (step === 0) return [
      !form.name.trim() && "Profile name",
      !form.slug.trim() && "Profile slug",
      form.slug.trim() && !validProfileSlug(form.slug.trim()) && "Valid profile slug",
      !form.ownerName.trim() && "Owner name",
      !form.phone.trim() && "Phone"
    ].filter(Boolean);
    if (step === 1) return [
      !form.countryId && "Country",
      !form.citySlug && "City",
      !form.categoryId && "Category",
      !form.address.trim() && "Address",
      isAdultCategory && !form.adultLegalConfirmed && "18+ legal confirmation"
    ].filter(Boolean);
    if (step === 2) return [
      !form.description.trim() && "Description",
      isAdultCategory && (!form.adultAge.trim() || Number(form.adultAge) < 18) && "Adult age 18+",
      isAdultCategory && !form.adultAvailableFor.length && "Available for",
      isAdultCategory && !form.adultBookingType.length && "Booking type",
      isAdultCategory && !form.adultMinimumDuration && "Minimum booking duration"
    ].filter(Boolean);
    return [];
  }

  function goNext() {
    const missing = requiredForCurrentStep();
    if (missing.length) {
      setNotice(`Required before next step: ${missing.join(", ")}.`);
      return;
    }
    setNotice("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  if (!admin && currentUser?.role === "USER") {
    return (
      <GlassCard className="p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-800 ring-1 ring-amber-200">
          Review user account
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-ink">This account can post reviews only</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          Service profiles must be submitted from a Business Owner account. This keeps public reviews separate from profile ownership and improves trust signals for SEO pages.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/signup?role=OWNER" variant="gold">Create Owner Account</Button>
          <Button href="/categories" variant="ghost">Browse Listings</Button>
        </div>
      </GlassCard>
    );
  }

  if (!admin && checkingProfile) {
    return (
      <GlassCard className="p-6 md:p-8">
        <div className="h-5 w-40 animate-pulse rounded-full bg-white/80" />
        <div className="mt-5 h-8 w-72 max-w-full animate-pulse rounded-2xl bg-white/80" />
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-white/70" />
      </GlassCard>
    );
  }

  if (!admin && currentUser?.role === "OWNER" && existingListing) {
    const publicHref = `/${existingListing.country}/${existingListing.city}/${existingListing.categorySlug}/${existingListing.slug}`;
    return (
      <GlassCard className="p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800 ring-1 ring-emerald-200">
          One profile per owner
        </div>
          <h2 className="mt-4 text-2xl font-semibold text-ink">Your service profile already exists</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          Each Business Owner account can post one profile. Edit your existing profile from the dashboard instead of creating a second listing.
        </p>
        <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="font-semibold text-ink">{existingListing.name}</p>
          <p className="mt-1 text-sm text-muted">{existingListing.category} in {existingListing.cityName} - {existingListing.status}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={`/dashboard/edit-profile?listing=${existingListing.slug}`} variant="gold">Edit Existing Profile</Button>
          <Button href="/dashboard" variant="ghost">Dashboard</Button>
          {existingListing.status === "approved" ? <Button href={publicHref} variant="ghost">View Public Page</Button> : null}
        </div>
      </GlassCard>
    );
  }

  // Owners must confirm their email before the API will accept a profile, so
  // say so before the wizard is filled in rather than failing on submit.
  const needsEmailVerification = !admin && currentUser?.role === "OWNER" && currentUser.emailVerified === false;

  async function submitProfile(statusOverride?: string) {
    setNotice("");
    setCreatedSlug("");
    const isDraft = statusOverride === "DRAFT";
    const manualServices = toList(form.services);
    const manualPricing = toList(form.pricing);
    const manualHours = toList(form.businessHours);
    const adultServices = isAdultCategory ? adultDetailLines(form) : [];
    const adultPricing = isAdultCategory ? adultPricingLines(form) : [];
    const adultHours = isAdultCategory ? adultAvailabilityLines(form) : [];
    const galleryItems = form.galleryItems.slice(0, maxProfileGalleryItems).map((item, index) => {
      const imageUrl = item.imageUrl.trim();
      const video = isVideoUrl(imageUrl);
      return {
        imageUrl,
        title: item.title.trim() || (video ? "Profile video" : "Gallery media"),
        altText: item.altText.trim() || `${form.name.trim() || "Profile"} ${video ? "video" : "gallery media"}`,
        category: item.category || (video ? "Videos" : "Gallery"),
        sortOrder: index + 1,
        isActive: true
      };
    }).filter((item) => item.imageUrl);

    const payload = {
      name: form.name.trim() || (isDraft ? "Untitled draft" : ""),
      slug: slugify(form.slug || form.name),
      ownerName: form.ownerName.trim() || form.name.trim(),
      ownerEmail: form.ownerEmail.trim(),
      phone: formatPhoneNumber(form.phoneCountryCode, form.phone),
      whatsapp: formatPhoneNumber(form.whatsappCountryCode, form.whatsapp),
      website: form.website.trim(),
      countryId: form.countryId,
      citySlug: form.citySlug,
      categoryId: form.categoryId,
      address: form.address.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      services: mergeUnique(manualServices, adultServices),
      pricing: mergeUnique(manualPricing, adultPricing),
      businessHours: mergeUnique(manualHours, adultHours),
      coverImage: form.coverImage.trim(),
      avatarImage: form.avatarImage.trim(),
      gallery: galleryItems,
      adultLegalConfirmed: form.adultLegalConfirmed,
      adultDisclaimerAcceptedAt: form.adultLegalConfirmed,
      adultVerificationDocuments: [
        form.govIdDocument.trim() ? {
          type: "GOV_ID",
          fileUrl: form.govIdDocument.trim(),
          originalName: "Government ID"
        } : undefined,
        form.ageSelfieDocument.trim() ? {
          type: "AGE_SELFIE",
          fileUrl: form.ageSelfieDocument.trim(),
          originalName: "DOB selfie"
        } : undefined
      ].filter(Boolean),
      status: admin ? statusOverride || form.status : isDraft ? "DRAFT" : "PENDING",
      saveMode: isDraft ? "DRAFT" : "SUBMIT"
    };

    const missing = [
      !payload.name && "Profile name",
      !payload.slug && "Profile slug",
      payload.slug && !validProfileSlug(payload.slug) && "Valid profile slug",
      !payload.description && "Description",
      !payload.ownerName && "Owner name",
      !payload.phone && "Phone",
      !payload.countryId && "Country",
      !payload.citySlug && "City",
      !payload.categoryId && "Category",
      isAdultCategory && !form.adultLegalConfirmed && "18+ legal confirmation",
      isAdultCategory && (!form.adultAge.trim() || Number(form.adultAge) < 18) && "Adult age 18+",
      isAdultCategory && !form.adultAvailableFor.length && "Available for",
      isAdultCategory && !form.adultBookingType.length && "Booking type",
      isAdultCategory && !form.adultMinimumDuration && "Minimum booking duration",
      isAdultCategory && !form.govIdDocument.trim() && "Government ID document",
      isAdultCategory && !form.ageSelfieDocument.trim() && "Latest photo holding DOB paper"
    ].filter(Boolean);

    if (!isDraft && missing.length) {
      setNotice(`Required: ${missing.join(", ")}.`);
      return;
    }

    setLoading(true);
    try {
      const url = draftListing && !admin
        ? apiUrl(`/api/dashboard/listings/${draftListing.id || draftListing.slug}`)
        : admin ? apiUrl(`/api/admin/listings`) : apiUrl(`/api/profiles`);
      const response = await (admin ? adminFetch : authFetch)(url, {
        method: draftListing && !admin ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json() as { data?: unknown; error?: string };
      if (!response.ok) {
        if (response.status === 401) throw new Error("Please login or create an account before submitting a profile.");
        throw new Error(json.error || "Profile save failed.");
      }
      const saved = normalizeProfile(json.data);
      setCreatedSlug(saved.slug || payload.slug);
      if (isDraft) {
        setDraftListing(saved);
        setNotice("Draft saved. You can leave now and complete it later from your dashboard.");
      } else {
        setDraftListing(null);
          setNotice(admin ? "Profile created successfully." : "Profile submitted for admin approval.");
        if (!admin) {
          router.push(`/dashboard/profile/${saved.slug}`);
          return;
        }
        setForm(initialForm);
        setStep(0);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Profile save failed.");
    } finally {
      setLoading(false);
    }
  }

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <>
      {needsEmailVerification ? <VerifyEmailNotice email={currentUser?.email || ""} className="mb-5" /> : null}
      <GlassCard className="p-4 sm:p-6 md:p-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne shadow-sm ring-1 ring-slate-200">
            <UserRound className="h-4 w-4" /> {admin ? "Admin profile flow" : "Registered user submission"}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-ink md:text-3xl">{admin ? "Create listing" : "Submit your profile"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {admin ? "Create a listing directly, then manage approval, feature status and gallery assets." : "Complete each step. Save a draft anytime, then submit it for admin approval when complete."}
          </p>
        </div>
        {createdSlug ? (
          <Link href={admin ? `/admin/listings/${createdSlug}` : "/dashboard/add-profile"} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> {admin ? "Review listing" : "Submitted"}
          </Link>
        ) : null}
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
            <Field label="Profile Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Pandit Aditya Pareek" />
            <div>
              <Field
                label="Profile Slug"
                value={form.slug}
                onChange={(value) => update("slug", slugify(value))}
                placeholder="choose-your-profile-username"
              />
              <p className="mt-2 text-xs font-semibold text-muted">
                Use it like a username: letters, numbers and hyphens only. Examples: saloni-apte or saloniapte123. Owners cannot change it after submission/publish.
              </p>
            </div>
            <Field label="Provider / Owner Name" value={form.ownerName} onChange={(value) => update("ownerName", value)} placeholder="Profile owner" />
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
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <AutocompleteField label="Country" value={form.countryId} onChange={(value) => update("countryId", value)} options={countryOptions} placeholder="Select country" />
            <AutocompleteField
              label="City"
              value={form.citySlug}
              onChange={(value) => update("citySlug", value)}
              options={cityOptions}
              onQueryChange={setCitySearch}
              loading={searchingCities}
              placeholder={form.countryId ? "Type to search your city" : "Select country first"}
              disabled={!form.countryId}
            />
            <AutocompleteField label="Category" value={form.categoryId} onChange={(value) => update("categoryId", value)} options={categoryOptions} placeholder="Select category" />
            {admin ? <AutocompleteField label="Initial Status" value={form.status} onChange={(value) => update("status", value)} options={statusOptions} placeholder="Search status" /> : null}
            {isAdultCategory ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-200 md:col-span-2">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-bold">18+ category selected</p>
                    <p className="mt-1">This listing remains pending until admin approves both the profile and verification documents. Public pages will show ID verification status.</p>
                    <label className="mt-3 flex items-start gap-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={form.adultLegalConfirmed}
                        onChange={(event) => update("adultLegalConfirmed", event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      I confirm this is a legal 18+ service, no minors are involved, and government ID plus latest DOB photo will be submitted for admin verification.
                    </label>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-200 md:col-span-2">
              Country, city, category and profile slug are locked after submission. Admins can review visibility, but owners cannot change these public address fields later.
            </div>
            <Field label="Address" value={form.address} onChange={(value) => update("address", value)} placeholder="Delhi NCR, India" className="md:col-span-2" />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {isAdultCategory ? (
              <AdultProfileFields
                form={form}
                update={update}
                toggleOption={toggleAdultOption}
                updateRate={updateAdultRate}
              />
            ) : (
              <CategoryProfileAssist
                categorySlug={form.categoryId}
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
            <Textarea label={isAdultCategory ? "Additional Services" : "Additional Service Notes"} value={form.services} onChange={(value) => update("services", value)} placeholder={isAdultCategory ? "Add any extra public service notes, one per line" : "Use the category builder above or enter one service per line"} />
            <Textarea label={isAdultCategory ? "Additional Rates / Donation" : "Additional Pricing Notes"} value={form.pricing} onChange={(value) => update("pricing", value)} placeholder={isAdultCategory ? "Add custom rate notes if needed" : "Use the pricing builder above or enter one pricing item per line"} />
            <Textarea label={isAdultCategory ? "Additional Availability Notes" : "Additional Timing Notes"} value={form.businessHours} onChange={(value) => update("businessHours", value)} placeholder={isAdultCategory ? "Example: Advance booking required" : "Use timing presets above or enter public hours"} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Website" value={form.website} onChange={(value) => update("website", value)} placeholder="https://example.com" />
            <div className="md:col-span-2 grid gap-4">
              <UploadDropzone
                admin={admin}
                label="Cover image"
                type="cover"
                value={form.coverImage}
                requirement="Landscape, JPG or PNG"
                helper="This is the wide banner at the top of your profile. A 16:9 photo works best — the server makes optimised versions automatically."
                onUploaded={(url) => update("coverImage", url)}
                onCleared={() => update("coverImage", "")}
              />
              <UploadDropzone
                admin={admin}
                label="Profile picture or logo"
                type="avatar"
                value={form.avatarImage}
                requirement="Square, JPG or PNG"
                helper="Shown next to your name in search results and on your profile. A square image avoids cropping."
                onUploaded={(url) => update("avatarImage", url)}
                onCleared={() => update("avatarImage", "")}
              />
              <GalleryManager
                admin={admin}
                items={form.galleryItems}
                profileName={form.name}
                onAdd={addGalleryItem}
                onRemove={removeGalleryItem}
              />
              {isAdultCategory ? (
                /* Identity documents live on their own page. Keeping private ID
                   next to public marketing images made this form feel invasive
                   and buried the step that actually gates publication. */
                <div className="rounded-2xl border border-line bg-sunken p-5">
                  <p className="text-sm font-semibold text-ink">Identity verification is handled separately</p>
                  <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
                    Your category is age-restricted, so we need a government ID and a dated photo before the listing can
                    be published. Those go to private storage, never to your public profile.
                  </p>
                  <Link
                    href="/dashboard/verification"
                    className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-copper-600"
                  >
                    Go to verification
                  </Link>
                </div>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-muted md:col-span-2">
              Images are uploaded to Profinr and served from here, so they cannot break or change later. The gallery
              takes up to {maxProfileGalleryItems} images or videos.
            </p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <ReviewItem label="Business" value={form.name || "Not added"} />
            <ReviewItem label="Owner" value={form.ownerName || "Not added"} />
            <ReviewItem label="Country" value={selectedLabel(countryOptions, form.countryId)} />
            <ReviewItem label="City" value={selectedLabel(cityOptions, form.citySlug)} />
            <ReviewItem label="Category" value={selectedLabel(categoryOptions, form.categoryId)} />
            <ReviewItem label="Status" value={admin ? selectedLabel(statusOptions, form.status) : draftListing ? "Draft until submitted" : "Pending approval"} />
            <ReviewItem label="18+ category" value={isAdultCategory ? "Yes" : "No"} />
            {isAdultCategory ? <ReviewItem label="18+ confirmation" value={form.adultLegalConfirmed ? "Accepted" : "Missing"} /> : null}
            {isAdultCategory ? <ReviewItem label="Adult age" value={form.adultAge || "Missing"} /> : null}
            {isAdultCategory ? <ReviewItem label="Minimum booking" value={form.adultMinimumDuration || "Missing"} /> : null}
            <ReviewItem label="Phone" value={formatPhoneNumber(form.phoneCountryCode, form.phone) || "Not added"} />
            <ReviewItem label="URL slug" value={slugify(form.slug || form.name) || "Not generated"} />
            <ReviewItem label="Gallery media" value={`${form.galleryItems.length}/${maxProfileGalleryItems} added`} />
            {isAdultCategory ? <ReviewItem label="Government ID" value={form.govIdDocument ? "Uploaded privately" : "Missing"} /> : null}
            {isAdultCategory ? <ReviewItem label="DOB photo" value={form.ageSelfieDocument ? "Uploaded privately" : "Missing"} /> : null}
          </div>
        ) : null}
      </div>

      {notice ? <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{notice}</p> : null}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="ghost" onClick={() => setForm(initialForm)}>Reset</Button>
          {!admin ? <Button variant="ghost" disabled={loading} onClick={() => submitProfile("DRAFT")}>Save Draft</Button> : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={step === 0 || loading} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button variant="primary" disabled={loading} onClick={goNext}>
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              {admin ? <Button variant="ghost" disabled={loading} onClick={() => submitProfile("PENDING")}>Save Pending</Button> : null}
              <Button variant="gold" disabled={loading || needsEmailVerification} onClick={() => submitProfile(admin ? undefined : "PENDING")}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {admin ? "Create Profile" : "Submit Profile"}
              </Button>
            </>
          )}
        </div>
      </div>
      </GlassCard>
    </>
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
  form: ProfileFormState;
  update: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
  toggleOption: (key: "adultAvailableFor" | "adultAvailability" | "adultBookingType", option: string) => void;
  updateRate: (key: keyof AdultRatesState, value: string) => void;
}) {
  return (
    <div className="md:col-span-2 grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-200 md:col-span-2">
        <p className="font-bold">Adult service details</p>
        <p className="mt-1">These fields are saved into the same profile services, pricing and availability sections that public pages already use.</p>
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

function GalleryManager({
  admin,
  items,
  profileName,
  onAdd,
  onRemove
}: {
  admin: boolean;
  items: GalleryFormItem[];
  profileName: string;
  onAdd: (item: GalleryFormItem) => void;
  onRemove: (index: number) => void;
}) {
  const [title, setTitle] = useState("");
  const limitReached = items.length >= maxProfileGalleryItems;

  function addFromUrl(url: string) {
    const cleanUrl = url.trim();
    if (!cleanUrl || limitReached) return;
    const video = isVideoUrl(cleanUrl);
    onAdd({
      imageUrl: cleanUrl,
      title: title.trim() || (video ? "Profile video" : "Gallery media"),
      altText: `${profileName || "Profile"} ${title.trim() || (video ? "video" : "gallery media")}`,
      category: video ? "Videos" : "Gallery",
      sortOrder: items.length + 1,
      isActive: true
    });
    setTitle("");
  }

  return (
    <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-ink">Gallery Media</p>
          <p className="mt-1 text-xs leading-5 text-muted">Add up to {maxProfileGalleryItems} public images or videos. Recommended photo size: 1200 x 1600 px (3:4), matching the public preview frame. Cover, avatar and private verification files do not count here.</p>
        </div>
        <span className="w-fit rounded-full bg-cloud px-3 py-1 text-xs font-bold text-muted">{items.length}/{maxProfileGalleryItems}</span>
      </div>
      <div className="mt-4 grid gap-3">
        <Field label="Title for the next upload" value={title} onChange={setTitle} placeholder="Optional caption" />
        <UploadDropzone
          admin={admin}
          label="Add a photo or video"
          type="gallery"
          requirement={`${items.length}/${maxProfileGalleryItems} used`}
          helper="Best at 1200 x 1600 px (3:4) — the same portrait frame visitors see. Photos and short videos are both fine."
          disabled={limitReached}
          disabledMessage={`Gallery is full — ${maxProfileGalleryItems} items maximum.`}
          onUploaded={(url) => addFromUrl(url)}
        />
      </div>
      {items.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <div key={`${item.imageUrl}-${index}`} className="overflow-hidden rounded-2xl bg-cloud text-sm ring-1 ring-slate-200">
              <GalleryThumb item={item} />
              <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{item.title || "Gallery media"}</p>
                </div>
                <button type="button" onClick={() => onRemove(index)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-rose-600 shadow-sm">
                Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GalleryThumb({ item }: { item: GalleryFormItem }) {
  const src = mediaPreviewUrl(item.imageUrl);
  if (isVideoUrl(item.imageUrl)) {
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-shade text-white">
        <video src={src} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
          <FileVideo className="h-3.5 w-3.5" /> Video
        </span>
      </div>
    );
  }
  return <img src={src} alt={item.altText || item.title || "Gallery media"} className="aspect-[3/4] w-full bg-cloud object-cover" />;
}

function AutocompleteField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  onQueryChange,
  loading = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  /** Called as the user types, for fields whose options are fetched. */
  onQueryChange?: (query: string) => void;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedLabel(options, value));
  }, [options, value]);

  const filtered = useMemo(() => {
    // When options are fetched they are already scoped to the query; filtering
    // again would hide valid server results.
    if (onQueryChange) return options.slice(0, 80);
    const normalized = query.toLowerCase().trim();
    const result = normalized
      ? options.filter((option) => `${option.label} ${option.value} ${option.meta || ""}`.toLowerCase().includes(normalized))
      : options;
    return result.slice(0, 80);
  }, [options, query, onQueryChange]);

  function select(option: Option) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  return (
    <label className="relative block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            onQueryChange?.(event.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-cloud disabled:text-muted"
          role="combobox"
          aria-expanded={open}
        />
      </div>
      {open && !disabled ? (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-glass">
          {filtered.length ? filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${option.value === value ? "bg-ink text-white" : "text-ink hover:bg-cloud"}`}
            >
              <span className="block font-semibold">{option.label}</span>
              {option.meta ? <span className={`mt-0.5 block truncate text-xs ${option.value === value ? "text-white/75" : "text-muted"}`}>{option.meta}</span> : null}
            </button>
          )) : (
            <div className="rounded-xl bg-cloud px-3 py-3 text-sm font-semibold text-muted">No results found</div>
          )}
        </div>
      ) : null}
    </label>
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
