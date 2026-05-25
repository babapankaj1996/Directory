import { slugify, toArrayJson, toBool, toNumber } from './helpers.js';

export const PROFILE_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export function normalizeStatus(value, fallback = undefined) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toUpperCase();
  const mapped = {
    PUBLISHED: 'APPROVED',
    ACTIVE: 'APPROVED',
    FEATURED: 'APPROVED',
    DRAFT: 'DRAFT',
    UNSUBMITTED: 'DRAFT'
  }[normalized] || normalized;
  return PROFILE_STATUSES.includes(mapped) ? mapped : fallback;
}

export function cleanUndefined(data) {
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
}

function optionalDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveCityId(prisma, body, countryId, partial) {
  if (body.cityId) return String(body.cityId);
  const citySlug = body.citySlug || body.city;
  if (!citySlug) return undefined;
  if (!countryId && !body.countryCode && !body.country) {
    if (partial) return undefined;
    const error = new Error('countryId is required when citySlug is provided');
    error.statusCode = 400;
    throw error;
  }
  const city = await prisma.city.findFirst({
    where: {
      countryCode: String(countryId || body.countryCode || body.country).toLowerCase(),
      slug: slugify(citySlug)
    }
  });
  if (!city && !partial) {
    const error = new Error('City not found for the provided country/city slugs');
    error.statusCode = 400;
    throw error;
  }
  return city?.id;
}

export async function profilePayload(prisma, body, options = {}) {
  const partial = Boolean(options.partial);
  const name = body.name;
  const description = body.description ?? body.about;
  const countryId = body.countryId ? String(body.countryId).toLowerCase() : body.countryCode ? String(body.countryCode).toLowerCase() : body.country ? String(body.country).toLowerCase() : undefined;
  const cityId = await resolveCityId(prisma, body, countryId, partial);
  const categoryId = body.categoryId ? slugify(body.categoryId) : body.categorySlug ? slugify(body.categorySlug) : body.category ? slugify(body.category) : undefined;
  const category = categoryId ? await prisma.category.findUnique({
    where: { slug: categoryId },
    select: { isAdult: true, adultLevel: true, minimumAge: true }
  }) : null;
  const isAdult = body.isAdult === undefined ? category?.isAdult : toBool(body.isAdult);
  const ageRestricted = body.ageRestricted === undefined ? Boolean(isAdult) : toBool(body.ageRestricted);
  const adultDisclaimerAcceptedAt = body.adultDisclaimerAcceptedAt === true
    ? new Date()
    : optionalDate(body.adultDisclaimerAcceptedAt);

  const data = cleanUndefined({
    slug: body.slug ? slugify(body.slug) : !partial && name ? slugify(name) : undefined,
    name,
    description,
    shortDescription: body.shortDescription ?? (description && !partial ? String(description).slice(0, 180) : undefined),
    ownerName: body.ownerName ?? (!partial ? name : undefined),
    ownerEmail: body.ownerEmail ?? body.email,
    phone: body.phone,
    whatsapp: body.whatsapp,
    website: body.website,
    address: body.address ?? body.location,
    countryId,
    cityId,
    categoryId,
    status: normalizeStatus(body.status, partial ? undefined : options.defaultStatus || 'PENDING'),
    isFeatured: body.isFeatured === undefined ? (body.featured === undefined ? undefined : toBool(body.featured)) : toBool(body.isFeatured),
    featuredUntil: optionalDate(body.featuredUntil),
    rejectionReason: body.rejectionReason,
    adminNotes: body.adminNotes,
    coverImage: body.coverImage ?? body.image,
    avatarImage: body.avatarImage,
    rating: body.rating === undefined ? undefined : toNumber(body.rating),
    reviewCount: body.reviewCount === undefined && body.reviews === undefined ? undefined : toNumber(body.reviewCount ?? body.reviews),
    viewCount: body.viewCount === undefined ? undefined : toNumber(body.viewCount),
    services: body.services === undefined ? undefined : toArrayJson(body.services),
    pricing: body.pricing === undefined ? undefined : toArrayJson(body.pricing),
    businessHours: body.businessHours === undefined && body.hours === undefined ? undefined : toArrayJson(body.businessHours ?? body.hours),
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription ?? body.seoDesc,
    ownerUserId: body.ownerUserId,
    isAdult,
    ageRestricted,
    adultLevel: body.adultLevel ?? (isAdult ? category?.adultLevel || 'AGE_RESTRICTED' : 'NONE'),
    adultDisclaimerAcceptedAt,
    verificationStatus: body.verificationStatus,
    verificationNotes: body.verificationNotes
  });

  if (!partial) {
    const required = data.status === 'DRAFT'
      ? ['slug', 'name', 'ownerName', 'countryId', 'cityId', 'categoryId']
      : ['slug', 'name', 'description', 'ownerName', 'countryId', 'cityId', 'categoryId'];
    const missing = required.filter((key) => !data[key]);
    if (missing.length) {
      const error = new Error(`Missing required fields: ${missing.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    data.services = data.services || [];
    data.pricing = data.pricing || [];
    data.businessHours = data.businessHours || [];
    data.rating = data.rating ?? 0;
    data.reviewCount = data.reviewCount ?? 0;
    data.isFeatured = data.isFeatured ?? false;
    data.isAdult = data.isAdult ?? false;
    data.ageRestricted = data.ageRestricted ?? false;
    data.adultLevel = data.adultLevel || 'NONE';
    data.verificationStatus = data.verificationStatus || (data.isAdult ? 'PENDING' : 'NOT_REQUIRED');
  }

  return data;
}

export function galleryPayload(body, partial = false) {
  const data = cleanUndefined({
    imageUrl: body.imageUrl,
    title: body.title,
    altText: body.altText,
    category: body.category,
    sortOrder: body.sortOrder === undefined ? undefined : toNumber(body.sortOrder),
    isActive: body.isActive === undefined ? undefined : toBool(body.isActive)
  });

  if (!partial && !data.imageUrl) {
    const error = new Error('imageUrl is required');
    error.statusCode = 400;
    throw error;
  }

  return data;
}
