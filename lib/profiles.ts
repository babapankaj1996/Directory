import {
  getApprovedListings,
  getGalleryByProfileSlug,
  getListing,
  getListingByPath,
  featuredDaysRemaining,
  isFeaturedActive,
  isFeaturedExpired,
  categories as fallbackCategories,
  listings,
  sortByFeaturedVisibility,
  type Category,
  type Listing,
  type ListingStatus,
  type FeaturedPlacementCampaign,
  type FeaturedPlacementRequest,
  type ProfileGalleryImage,
  type ProfileVerificationDocument
} from "@/lib/data";
import { effectiveVerificationStatus } from "@/lib/verification-status";

type JsonRecord = Record<string, unknown>;

export type ProfileFilters = {
  country?: string;
  city?: string;
  category?: string;
  search?: string;
  featured?: boolean;
  adult?: boolean;
  status?: string;
  page?: number;
  perPage?: number;
  placementPath?: string;
};

export type PaginatedProfiles = {
  listings: Listing[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type CategoryFilters = {
  includeAdult?: boolean;
  adultOnly?: boolean;
  includeDraft?: boolean;
};

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? value as JsonRecord : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function maybeText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mediaUrl(value: unknown, fallback = ""): string {
  const url = text(value, fallback).trim();
  if (!url) return fallback;
  if (url.startsWith("/uploads/") || url.startsWith("/api/uploads/")) {
    return `${getApiBase().replace(/\/$/, "")}${url}`;
  }
  return url;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [value];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCategory(value: unknown, includeDraft = false): Category | undefined {
  const category = asRecord(value);
  const slug = text(category.slug);
  if (!slug) return undefined;
  const status = text(category.status, "ACTIVE").toUpperCase();
  if (!includeDraft && status !== "ACTIVE") return undefined;
  const counts = asRecord(category._count);
  const isAdult = boolValue(category.isAdult);

  return {
    slug,
    name: text(category.name, titleFromSlug(slug)),
    count: numberValue(category.count ?? counts.profiles),
    description: text(category.description, `Browse approved ${titleFromSlug(slug).toLowerCase()} listings.`),
    iconName: text(category.iconName, "Home"),
    isAdult,
    adultLevel: maybeText(category.adultLevel),
    minimumAge: numberValue(category.minimumAge, isAdult ? 18 : 0),
    showOnHomepage: boolValue(category.showOnHomepage, !isAdult),
    indexable: boolValue(category.indexable, true)
  };
}

function filterCategories(items: Category[], filters: CategoryFilters = {}) {
  return items.filter((category) => (
    filters.adultOnly ? category.isAdult : filters.includeAdult ? true : !category.isAdult
  ));
}

export function withCategoryCounts(categorySource: Category[], listingPool: Listing[]) {
  return categorySource.map((category) => ({
    ...category,
    count: listingPool.filter((listing) => listing.categorySlug === category.slug).length
  }));
}

export function getApiBase() {
  const publicApi = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (typeof window !== "undefined") return publicApi;
  return (process.env.BACKEND_API_URL ||
    publicApi ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:4000").replace(/\/$/, "");
}

export async function getPublicCategories(filters: CategoryFilters = {}) {
  const payload = await fetchPayload("/api/categories");
  if (Array.isArray(payload?.data)) {
    return filterCategories(
      payload.data.map((item) => normalizeCategory(item, filters.includeDraft)).filter(Boolean) as Category[],
      filters
    );
  }

  return filterCategories(fallbackCategories, filters);
}

export async function getPublicCategory(slug: string) {
  const categories = await getPublicCategories({ includeAdult: true });
  return categories.find((category) => category.slug === slug);
}

export function toListingStatus(value: unknown): ListingStatus {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "DRAFT" || normalized === "UNSUBMITTED") return "draft";
  if (normalized === "APPROVED" || normalized === "PUBLISHED" || normalized === "ACTIVE") return "approved";
  if (normalized === "REJECTED") return "rejected";
  if (normalized === "SUSPENDED") return "suspended";
  return "pending";
}

export function toApiStatus(status: ListingStatus | string) {
  const normalized = String(status).toLowerCase();
  if (normalized === "draft") return "DRAFT";
  if (normalized === "approved") return "APPROVED";
  if (normalized === "rejected") return "REJECTED";
  if (normalized === "suspended") return "SUSPENDED";
  return "PENDING";
}

export function normalizeGalleryImage(value: unknown): ProfileGalleryImage {
  const image = asRecord(value);
  return {
    id: text(image.id, `gallery-${text(image.imageUrl, "image")}`),
    profileId: maybeText(image.profileId),
    imageUrl: mediaUrl(image.imageUrl),
    title: maybeText(image.title),
    altText: maybeText(image.altText) || maybeText(image.title),
    category: maybeText(image.category),
    sortOrder: numberValue(image.sortOrder),
    isActive: boolValue(image.isActive, true)
  };
}

export function normalizeVerificationDocument(value: unknown): ProfileVerificationDocument {
  const document = asRecord(value);
  return {
    id: maybeText(document.id),
    profileId: maybeText(document.profileId),
    type: text(document.type, "GOV_ID"),
    fileUrl: mediaUrl(document.fileUrl),
    originalName: maybeText(document.originalName),
    status: maybeText(document.status) || "PENDING",
    adminNotes: maybeText(document.adminNotes),
    createdAt: maybeText(document.createdAt),
    updatedAt: maybeText(document.updatedAt)
  };
}

export function normalizeFeaturedPlacementRequest(value: unknown): FeaturedPlacementRequest {
  const request = asRecord(value);
  const campaigns = Array.isArray(request.campaigns)
    ? request.campaigns.map(normalizeFeaturedPlacementCampaign)
    : undefined;
  const payment = request.payment ? normalizeFeaturedPayment(request.payment) : undefined;
  return {
    id: maybeText(request.id),
    profileId: maybeText(request.profileId),
    ownerUserId: maybeText(request.ownerUserId),
    requestedDays: numberValue(request.requestedDays, 30),
    requestedPage: text(request.requestedPage, "ALL"),
    requestedPagePath: text(request.requestedPagePath, "/listings"),
    status: text(request.status, "PENDING"),
    adminNote: maybeText(request.adminNote),
    placementKey: maybeText(request.placementKey),
    placementLabel: maybeText(request.placementLabel),
    priceAmount: optionalNumber(request.priceAmount),
    currency: maybeText(request.currency),
    paymentStatus: maybeText(request.paymentStatus),
    paymentProvider: maybeText(request.paymentProvider),
    payment,
    reviewedAt: maybeText(request.reviewedAt),
    createdAt: maybeText(request.createdAt),
    updatedAt: maybeText(request.updatedAt),
    campaigns
  };
}

export function normalizeFeaturedPlacementCampaign(value: unknown): FeaturedPlacementCampaign {
  const campaign = asRecord(value);
  return {
    id: maybeText(campaign.id),
    profileId: maybeText(campaign.profileId),
    ownerUserId: maybeText(campaign.ownerUserId),
    requestId: maybeText(campaign.requestId),
    pageType: text(campaign.pageType, "ALL"),
    pagePath: text(campaign.pagePath, "ALL"),
    slot: maybeText(campaign.slot),
    status: text(campaign.status, "ACTIVE"),
    startsAt: maybeText(campaign.startsAt),
    endsAt: maybeText(campaign.endsAt),
    approvedAt: maybeText(campaign.approvedAt),
    cancelledAt: maybeText(campaign.cancelledAt),
    adminNote: maybeText(campaign.adminNote),
    source: maybeText(campaign.source),
    placementKey: maybeText(campaign.placementKey),
    placementLabel: maybeText(campaign.placementLabel),
    priceAmount: optionalNumber(campaign.priceAmount),
    currency: maybeText(campaign.currency),
    paymentStatus: maybeText(campaign.paymentStatus),
    paymentProvider: maybeText(campaign.paymentProvider),
    createdAt: maybeText(campaign.createdAt),
    updatedAt: maybeText(campaign.updatedAt)
  };
}

export function normalizeFeaturedPayment(value: unknown) {
  const payment = asRecord(value);
  return {
    id: maybeText(payment.id),
    requestId: maybeText(payment.requestId),
    profileId: maybeText(payment.profileId),
    ownerUserId: maybeText(payment.ownerUserId),
    provider: text(payment.provider, "WALLET"),
    status: text(payment.status, "PENDING"),
    amount: numberValue(payment.amount, 0),
    currency: text(payment.currency, "INR"),
    razorpayOrderId: maybeText(payment.razorpayOrderId),
    razorpayPaymentId: maybeText(payment.razorpayPaymentId),
    walletTransactionId: maybeText(payment.walletTransactionId),
    createdAt: maybeText(payment.createdAt),
    updatedAt: maybeText(payment.updatedAt)
  };
}

export function normalizeProfile(value: unknown): Listing {
  const profile = asRecord(value);
  const city = asRecord(profile.city);
  const category = asRecord(profile.category);
  const country = asRecord(profile.country);
  const status = toListingStatus(profile.status);
  const categorySlug = text(profile.categoryId ?? profile.categorySlug ?? category.slug, "astrologer");
  const citySlug = text(profile.citySlug ?? city.slug, "delhi");
  const countryCode = text(profile.countryId ?? profile.countryCode ?? country.code, "in").toLowerCase();
  const coverImage = mediaUrl(profile.coverImage ?? profile.image, "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80");
  const ownerEmail = maybeText(profile.ownerEmail ?? profile.email);
  const gallery = Array.isArray(profile.gallery) ? profile.gallery.map(normalizeGalleryImage) : undefined;
  const verificationDocuments = Array.isArray(profile.verificationDocuments)
    ? profile.verificationDocuments.map(normalizeVerificationDocument)
    : undefined;
  const featuredPlacementRequests = Array.isArray(profile.featuredPlacementRequests)
    ? profile.featuredPlacementRequests.map(normalizeFeaturedPlacementRequest)
    : undefined;
  const featuredPlacementCampaigns = Array.isArray(profile.featuredPlacementCampaigns)
    ? profile.featuredPlacementCampaigns.map(normalizeFeaturedPlacementCampaign)
    : undefined;
  const featured = boolValue(profile.isFeatured ?? profile.featured);
  const featuredUntil = maybeText(profile.featuredUntil);
  const isAdult = boolValue(profile.isAdult);
  const verificationStatus = effectiveVerificationStatus({
    profileStatus: maybeText(profile.verificationStatus),
    documents: verificationDocuments,
    isAdult
  });
  const idVerified = verificationStatus.toUpperCase() === "VERIFIED";

  return {
    id: maybeText(profile.id),
    slug: text(profile.slug),
    name: text(profile.name, "Untitled Listing"),
    ownerName: text(profile.ownerName, text(profile.name, "Business Owner")),
    ownerEmail,
    categorySlug,
    category: text(profile.categoryName ?? category.name, categorySlug),
    country: countryCode,
    city: citySlug,
    cityName: text(profile.cityName ?? city.name, citySlug),
    status,
    rating: numberValue(profile.rating),
    reviews: numberValue(profile.reviewCount ?? profile.reviews),
    viewCount: numberValue(profile.viewCount),
    verified: idVerified,
    featured,
    featuredUntil,
    featuredActive: isFeaturedActive({ featured, featuredUntil, featuredPlacementCampaigns }),
    featuredExpired: isFeaturedExpired({ featured, featuredUntil }),
    featuredDaysLeft: featuredDaysRemaining({ featured, featuredUntil, featuredPlacementCampaigns }) ?? undefined,
    open: status === "approved",
    location: text(profile.address ?? profile.location ?? city.name, citySlug),
    address: maybeText(profile.address ?? profile.location),
    image: coverImage,
    coverImage,
    avatarImage: maybeText(mediaUrl(profile.avatarImage)),
    phone: text(profile.phone),
    whatsapp: maybeText(profile.whatsapp),
    email: text(ownerEmail ?? profile.email),
    website: text(profile.website),
    about: text(profile.description ?? profile.about),
    shortDescription: maybeText(profile.shortDescription),
    services: stringArray(profile.services),
    pricing: stringArray(profile.pricing),
    hours: stringArray(profile.businessHours ?? profile.hours),
    seoTitle: maybeText(profile.seoTitle),
    seoDescription: maybeText(profile.seoDescription ?? profile.seoDesc),
    rejectionReason: maybeText(profile.rejectionReason),
    adminNotes: maybeText(profile.adminNotes),
    createdAt: maybeText(profile.createdAt),
    updatedAt: maybeText(profile.updatedAt),
    gallery,
    isAdult,
    ageRestricted: boolValue(profile.ageRestricted),
    adultLevel: maybeText(profile.adultLevel),
    adultDisclaimerAcceptedAt: maybeText(profile.adultDisclaimerAcceptedAt),
    verificationStatus,
    verificationNotes: maybeText(profile.verificationNotes),
    verificationDocuments,
    featuredPlacementRequests,
    featuredPlacementCampaigns
  };
}

function queryString(filters: ProfileFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * How long a public directory read may be served from the Next data cache.
 *
 * The frontend and the API are separate Hostinger sites, so every call is a
 * public-internet HTTPS round trip (~800ms measured) and the home page makes
 * three of them. Caching public reads takes that off the request path; the
 * window is short enough that a newly approved listing shows up promptly.
 * Anything carrying a token is per-user and is never cached.
 */
export const PUBLIC_READ_REVALIDATE_SECONDS = 60;

async function fetchPayload(path: string, token?: string): Promise<{ data?: unknown; meta?: unknown } | undefined> {
  try {
    const response = await fetch(`${getApiBase()}${path}`, token
      ? { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }
      : { next: { revalidate: PUBLIC_READ_REVALIDATE_SECONDS } });
    if (!response.ok) return undefined;
    return await response.json() as { data?: unknown; meta?: unknown };
  } catch {
    return undefined;
  }
}

async function fetchData(path: string, token?: string): Promise<unknown | undefined> {
  const payload = await fetchPayload(path, token);
  return payload?.data;
}

export async function getPublicProfiles(filters: ProfileFilters = {}) {
  const data = await fetchData(`/api/profiles${queryString(filters)}`);
  if (Array.isArray(data)) return sortByFeaturedVisibility(data.map(normalizeProfile).filter((listing) => listing.status === "approved"), filters.placementPath);

  const tokens = (filters.search || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  const includeAdult = filters.adult === false ? false : true;
  const fallback = getApprovedListings({ includeAdult }).filter((listing) => (
    (!filters.country || listing.country === filters.country) &&
    (!filters.city || listing.city === filters.city) &&
    (!filters.category || listing.categorySlug === filters.category) &&
    (filters.featured === undefined || isFeaturedActive(listing) === filters.featured) &&
    (filters.adult === undefined || Boolean(listing.isAdult) === filters.adult) &&
    (!tokens.length || tokens.every((token) => [
      listing.name,
      listing.slug,
      listing.ownerName,
      listing.cityName,
      listing.city,
      listing.country,
      listing.category,
      listing.categorySlug,
      listing.email,
      listing.phone,
      listing.website,
      listing.location,
      listing.about,
      listing.services.join(" ")
    ].join(" ").toLowerCase().includes(token)))
  ));
  return sortByFeaturedVisibility(fallback, filters.placementPath);
}

export async function getPaginatedPublicProfiles(filters: ProfileFilters = {}): Promise<PaginatedProfiles> {
  const page = Math.max(Number(filters.page || 1), 1);
  const perPage = Math.min(Math.max(Number(filters.perPage || 12), 1), 48);
  const payload = await fetchPayload(`/api/profiles${queryString({ ...filters, page, perPage })}`);
  const data = Array.isArray(payload?.data) ? payload.data.map(normalizeProfile).filter((listing) => listing.status === "approved") : undefined;
  const meta = asRecord(payload?.meta);

  if (data) {
    return {
      listings: data,
      page: numberValue(meta.page, page),
      perPage: numberValue(meta.perPage, perPage),
      total: numberValue(meta.total, data.length),
      totalPages: numberValue(meta.totalPages, Math.max(Math.ceil(data.length / perPage), 1))
    };
  }

  const fallback = await getPublicProfiles(filters);
  const start = (page - 1) * perPage;
  const listings = fallback.slice(start, start + perPage);
  return {
    listings,
    page,
    perPage,
    total: fallback.length,
    totalPages: Math.max(Math.ceil(fallback.length / perPage), 1)
  };
}

export async function getPublicProfileByPath(country: string, city: string, category: string, profile: string) {
  const data = await fetchData(`/api/profiles/${country}/${city}/${category}/${profile}`);
  if (data) {
    const listing = normalizeProfile(data);
    return listing.status === "approved" ? listing : undefined;
  }
  return getListingByPath(profile, country, city, category);
}

export async function getProfileGallery(profileIdOrSlug: string) {
  const data = await fetchData(`/api/profiles/${profileIdOrSlug}/gallery`);
  if (Array.isArray(data)) return data.map(normalizeGalleryImage).filter((image) => image.isActive);
  return getGalleryByProfileSlug(profileIdOrSlug);
}

export async function getAdminListings(filters: ProfileFilters = {}, token?: string) {
  const data = await fetchData(`/api/admin/listings${queryString(filters)}`, token);
  if (Array.isArray(data)) return data.map(normalizeProfile);
  return listings;
}

export async function getAdminListing(idOrSlug: string, token?: string) {
  const data = await fetchData(`/api/admin/listings/${idOrSlug}`, token);
  if (data) return normalizeProfile(data);
  return getListing(idOrSlug);
}

export async function getDashboardListing(idOrSlug: string, token?: string) {
  const data = await fetchData(`/api/dashboard/listings/${idOrSlug}`, token);
  if (data) return normalizeProfile(data);
  return undefined;
}
