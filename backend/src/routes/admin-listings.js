import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { slugify, toBool } from '../utils/helpers.js';
import { galleryPayload, normalizeStatus, profilePayload } from '../utils/listing-payload.js';
import { adultDocumentPayloads, documentStatus, profileVerificationData, validateAdultSubmission } from '../utils/adult-verification.js';
import { activeGalleryPayloads, assertGallerySlotAvailable, enforceGalleryBatchLimit } from '../utils/gallery-limit.js';
import { activeFeaturedWhere, defaultFeaturedUntil, expiredFeaturedWhere, inactiveFeaturedWhere, normalizePlacementPath } from '../utils/featured.js';
import { computedVerificationStatus, withComputedVerificationStatus } from '../utils/verification-status.js';
import {
  FEATURED_DURATIONS,
  FEATURED_PAGE_TYPES,
  defaultFeaturedPrice,
  normalizeCurrency,
  normalizeFeaturedDays,
  normalizePricingScope
} from '../utils/featured-pricing.js';
import { captureWalletHold, getFeaturedPaymentSettings, releaseWalletHold } from '../utils/billing.js';

const router = Router();
const verificationDocumentTypes = ['GOV_ID', 'AGE_SELFIE', 'BUSINESS_LICENSE', 'CERTIFICATE', 'ADDRESS_PROOF', 'OTHER'];

const listingInclude = {
  country: true,
  city: true,
  category: true,
  gallery: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  verificationDocuments: { orderBy: [{ type: 'asc' }, { createdAt: 'desc' }] },
  featuredPlacementRequests: { orderBy: { createdAt: 'desc' }, take: 5, include: { payment: true } },
  featuredPlacementCampaigns: { orderBy: [{ status: 'asc' }, { startsAt: 'desc' }], take: 10 },
  statusHistory: { orderBy: { createdAt: 'desc' } }
};

const verificationDocumentInclude = {
  profile: {
    include: {
      country: true,
      city: true,
      category: true
    }
  }
};

const FEATURED_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const featuredRequestInclude = {
  profile: {
    include: listingInclude
  },
  payment: true,
  campaigns: {
    orderBy: [{ status: 'asc' }, { startsAt: 'desc' }]
  },
  ownerUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
};

function listWhere(query) {
  const and = [];
  const status = query.status ? String(query.status).toUpperCase() : undefined;

  if (status && status !== 'ALL') {
    if (status === 'FEATURED') {
      and.push(activeFeaturedWhere());
    } else if (status === 'EXPIRED_FEATURED') {
      and.push(expiredFeaturedWhere());
    } else {
      const normalized = normalizeStatus(status);
      if (normalized) and.push({ status: normalized });
    }
  }

  if (query.featured !== undefined) and.push(toBool(query.featured) ? activeFeaturedWhere() : inactiveFeaturedWhere());
  if (query.adult !== undefined) and.push({ isAdult: toBool(query.adult) });
  if (query.verificationStatus) and.push({ verificationStatus: String(query.verificationStatus).toUpperCase() });

  if (query.city) {
    const city = String(query.city);
    and.push({ OR: [{ cityId: city }, { city: { slug: slugify(city) } }, { city: { name: { contains: city, mode: 'insensitive' } } }] });
  }

  if (query.category) {
    const category = String(query.category);
    and.push({ OR: [{ categoryId: slugify(category) }, { category: { name: { contains: category, mode: 'insensitive' } } }] });
  }

  if (query.search) {
    const tokens = String(query.search).trim().split(/\s+/).filter(Boolean);
    tokens.forEach((token) => {
      and.push({
        OR: [
          { name: { contains: token, mode: 'insensitive' } },
          { slug: { contains: token, mode: 'insensitive' } },
          { ownerName: { contains: token, mode: 'insensitive' } },
          { ownerEmail: { contains: token, mode: 'insensitive' } },
          { phone: { contains: token, mode: 'insensitive' } },
          { whatsapp: { contains: token, mode: 'insensitive' } },
          { website: { contains: token, mode: 'insensitive' } },
          { address: { contains: token, mode: 'insensitive' } },
          { description: { contains: token, mode: 'insensitive' } },
          { shortDescription: { contains: token, mode: 'insensitive' } },
          { city: { name: { contains: token, mode: 'insensitive' } } },
          { city: { slug: { contains: token, mode: 'insensitive' } } },
          { category: { name: { contains: token, mode: 'insensitive' } } },
          { category: { slug: { contains: token, mode: 'insensitive' } } }
        ]
      });
    });
  }

  return and.length ? { AND: and } : {};
}

async function resolveListing(idOrSlug) {
  return prisma.profile.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: slugify(idOrSlug) }] },
    include: listingInclude
  });
}

function verificationDocumentType(value) {
  const normalized = String(value || 'OTHER').trim().toUpperCase().replace(/[-\s]+/g, '_');
  return verificationDocumentTypes.includes(normalized) ? normalized : 'OTHER';
}

function verificationDocumentPayload(body, partial = false) {
  const data = {
    type: body.type === undefined ? undefined : verificationDocumentType(body.type),
    fileUrl: body.fileUrl === undefined ? undefined : String(body.fileUrl || '').trim(),
    originalName: body.originalName === undefined ? undefined : String(body.originalName || '').trim() || null,
    status: body.status === undefined ? undefined : documentStatus(body.status),
    adminNotes: body.adminNotes === undefined ? undefined : String(body.adminNotes || '').trim() || null
  };
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

  if (!partial && !data.fileUrl) {
    const error = new Error('fileUrl is required');
    error.statusCode = 400;
    throw error;
  }
  if (!partial) {
    data.type = data.type || 'OTHER';
    data.status = data.status || 'PENDING';
  }

  return data;
}

function featuredRequestStatus(value, fallback = undefined) {
  const normalized = String(value || '').trim().toUpperCase();
  return FEATURED_REQUEST_STATUSES.includes(normalized) ? normalized : fallback;
}

function campaignPagePath(request) {
  const requestedPage = String(request?.requestedPage || 'ALL').trim().toUpperCase();
  if (requestedPage === 'ALL') return 'ALL';
  return normalizePlacementPath(request?.requestedPagePath || '/listings') || '/listings';
}

function optionalInt(value, fallback = undefined) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(Math.round(number), 0) : fallback;
}

function optionalDate(value, fallback = undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function refreshProfileVerification(tx, profileId, verificationNotes) {
  const profile = await tx.profile.findUnique({
    where: { id: profileId },
    include: { verificationDocuments: true }
  });
  if (!profile) return null;
  return tx.profile.update({
    where: { id: profileId },
    data: {
      verificationStatus: computedVerificationStatus(profile),
      verificationNotes: verificationNotes === undefined ? undefined : verificationNotes || null
    }
  });
}

router.get('/', asyncHandler(async (req, res) => {
  const listings = await prisma.profile.findMany({
    where: listWhere(req.query),
    orderBy: [{ status: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
    include: {
      country: true,
      city: true,
      category: true,
      verificationDocuments: { orderBy: [{ type: 'asc' }, { createdAt: 'desc' }] },
      featuredPlacementRequests: { orderBy: { createdAt: 'desc' }, take: 3 },
      featuredPlacementCampaigns: { orderBy: [{ status: 'asc' }, { startsAt: 'desc' }], take: 10 },
      _count: { select: { gallery: true, statusHistory: true } }
    }
  });
  res.json({ data: listings.map((listing) => withComputedVerificationStatus(listing)) });
}));

router.get('/verification-documents', asyncHandler(async (req, res) => {
  const status = req.query.status ? documentStatus(req.query.status, '') : '';
  const type = req.query.type ? verificationDocumentType(req.query.type) : '';
  const search = String(req.query.search || '').trim();
  const where = {};

  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { type: { contains: search, mode: 'insensitive' } },
      { originalName: { contains: search, mode: 'insensitive' } },
      { adminNotes: { contains: search, mode: 'insensitive' } },
      { profile: { name: { contains: search, mode: 'insensitive' } } },
      { profile: { slug: { contains: search, mode: 'insensitive' } } },
      { profile: { ownerName: { contains: search, mode: 'insensitive' } } },
      { profile: { ownerEmail: { contains: search, mode: 'insensitive' } } },
      { profile: { phone: { contains: search, mode: 'insensitive' } } },
      { profile: { city: { name: { contains: search, mode: 'insensitive' } } } },
      { profile: { category: { name: { contains: search, mode: 'insensitive' } } } }
    ];
  }

  const documents = await prisma.profileVerificationDocument.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
    include: verificationDocumentInclude
  });
  res.json({ data: documents });
}));

router.get('/:id/gallery', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const gallery = await prisma.profileGallery.findMany({
    where: { profileId: listing.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  });
  res.json({ data: gallery });
}));

router.post('/:id/gallery', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  await assertGallerySlotAvailable(prisma, listing.id);
  const image = await prisma.profileGallery.create({
    data: { ...galleryPayload(req.body), profileId: listing.id }
  });
  res.status(201).json({ data: image });
}));

router.post('/:id/verification-documents', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const document = await prisma.$transaction(async (tx) => {
    const saved = await tx.profileVerificationDocument.create({
      data: { ...verificationDocumentPayload(req.body), profileId: listing.id },
      include: verificationDocumentInclude
    });
    await tx.profile.update({
      where: { id: listing.id },
      data: { verificationStatus: 'PENDING', verificationNotes: null }
    });
    return saved;
  });
  res.status(201).json({ data: document });
}));

router.put('/gallery/:galleryId', asyncHandler(async (req, res) => {
  const image = await prisma.profileGallery.update({
    where: { id: req.params.galleryId },
    data: galleryPayload(req.body, true)
  });
  res.json({ data: image });
}));

router.delete('/gallery/:galleryId', asyncHandler(async (req, res) => {
  await prisma.profileGallery.delete({ where: { id: req.params.galleryId } });
  res.json({ message: 'Gallery image deleted' });
}));

router.put('/verification-documents/:documentId', asyncHandler(async (req, res) => {
  const existing = await prisma.profileVerificationDocument.findUnique({ where: { id: req.params.documentId } });
  if (!existing) return res.status(404).json({ error: 'Verification document not found' });
  const document = await prisma.$transaction(async (tx) => {
    const saved = await tx.profileVerificationDocument.update({
      where: { id: req.params.documentId },
      data: verificationDocumentPayload(req.body, true)
    });
    await refreshProfileVerification(tx, saved.profileId, req.body.adminNotes);
    return tx.profileVerificationDocument.findUnique({
      where: { id: saved.id },
      include: verificationDocumentInclude
    });
  });
  res.json({ data: document });
}));

router.patch('/verification-documents/:documentId/status', asyncHandler(async (req, res) => {
  const existing = await prisma.profileVerificationDocument.findUnique({ where: { id: req.params.documentId } });
  if (!existing) return res.status(404).json({ error: 'Verification document not found' });
  const status = documentStatus(req.body.status);
  const adminNotes = req.body.adminNotes === undefined ? existing.adminNotes : String(req.body.adminNotes || '').trim() || null;
  const document = await prisma.$transaction(async (tx) => {
    const saved = await tx.profileVerificationDocument.update({
      where: { id: existing.id },
      data: { status, adminNotes }
    });
    await refreshProfileVerification(tx, saved.profileId, adminNotes);
    return tx.profileVerificationDocument.findUnique({
      where: { id: saved.id },
      include: verificationDocumentInclude
    });
  });
  res.json({ data: document });
}));

router.delete('/verification-documents/:documentId', asyncHandler(async (req, res) => {
  const existing = await prisma.profileVerificationDocument.findUnique({ where: { id: req.params.documentId } });
  if (!existing) return res.status(404).json({ error: 'Verification document not found' });
  await prisma.$transaction(async (tx) => {
    await tx.profileVerificationDocument.delete({ where: { id: existing.id } });
    await refreshProfileVerification(tx, existing.profileId, undefined);
  });
  res.json({ message: 'Verification document deleted' });
}));

router.get('/featured-prices', asyncHandler(async (_req, res) => {
  const prices = await prisma.featuredPlacementPrice.findMany({
    orderBy: [{ pageType: 'asc' }, { scopeKey: 'asc' }, { durationDays: 'asc' }]
  });
  res.json({
    data: prices,
    meta: {
      durations: FEATURED_DURATIONS,
      pageTypes: FEATURED_PAGE_TYPES,
      defaults: FEATURED_PAGE_TYPES.flatMap((pageType) => FEATURED_DURATIONS.map((durationDays) => ({
        pageType,
        durationDays,
        priceAmount: defaultFeaturedPrice(pageType, durationDays),
        currency: 'INR'
      })))
    }
  });
}));

router.put('/featured-prices', asyncHandler(async (req, res) => {
  const durationDays = normalizeFeaturedDays(req.body.durationDays || req.body.requestedDays);
  const priceAmount = optionalInt(req.body.priceAmount);
  if (priceAmount === undefined) return res.status(400).json({ error: 'Valid price amount is required.' });
  const currency = normalizeCurrency(req.body.currency);
  const scope = normalizePricingScope(req.body);

  const price = await prisma.featuredPlacementPrice.upsert({
    where: {
      scopeKey_durationDays_currency: {
        scopeKey: scope.scopeKey,
        durationDays,
        currency
      }
    },
    update: {
      pageType: scope.pageType,
      countryId: scope.countryId,
      citySlug: scope.citySlug,
      categoryId: scope.categoryId,
      priceAmount,
      isActive: req.body.isActive === undefined ? true : toBool(req.body.isActive)
    },
    create: {
      scopeKey: scope.scopeKey,
      pageType: scope.pageType,
      countryId: scope.countryId,
      citySlug: scope.citySlug,
      categoryId: scope.categoryId,
      durationDays,
      priceAmount,
      currency,
      isActive: req.body.isActive === undefined ? true : toBool(req.body.isActive)
    }
  });

  res.json({ data: price, meta: { pagePath: scope.pagePath } });
}));

router.get('/featured-requests', asyncHandler(async (req, res) => {
  const status = featuredRequestStatus(req.query.status);
  const requests = await prisma.featuredPlacementRequest.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: featuredRequestInclude
  });
  res.json({ data: requests });
}));

router.patch('/featured-requests/:requestId/status', asyncHandler(async (req, res) => {
  const status = featuredRequestStatus(req.body.status);
  if (!status) return res.status(400).json({ error: 'Valid featured request status is required.' });

  const existing = await prisma.featuredPlacementRequest.findUnique({
    where: { id: req.params.requestId },
    include: { profile: true, payment: true }
  });
  if (!existing) return res.status(404).json({ error: 'Featured placement request not found' });
  if (status === 'APPROVED' && existing.paymentProvider === 'RAZORPAY' && existing.paymentStatus !== 'RAZORPAY_PAID') {
    return res.status(400).json({ error: 'Verify Razorpay payment before approving this featured request.' });
  }
  if (status === 'APPROVED' && !existing.paymentProvider && existing.paymentStatus === 'UNPAID') {
    const settings = await getFeaturedPaymentSettings(prisma);
    if (settings.allowUnpaidAdminApproval === false) {
      return res.status(400).json({ error: 'Manual unpaid featured approval is disabled in billing settings.' });
    }
  }

  const adminNote = req.body.adminNote === undefined ? existing.adminNote : String(req.body.adminNote || '').trim() || null;
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    let priceAmount = optionalInt(req.body.priceAmount, existing.priceAmount);
    const currency = normalizeCurrency(req.body.currency || existing.currency);
    const paymentProvider = String(req.body.paymentProvider || existing.paymentProvider || '').trim().toUpperCase() || null;
    let paymentStatus = String(req.body.paymentStatus || existing.paymentStatus || 'UNPAID').trim().toUpperCase();
    if (paymentProvider === 'WALLET' && paymentStatus === 'WALLET_HOLD') {
      priceAmount = optionalInt(existing.payment?.amount, existing.priceAmount ?? priceAmount);
    }
    const startsAt = optionalDate(req.body.startsAt, now);
    const featuredUntil = optionalDate(req.body.endsAt, defaultFeaturedUntil(existing.requestedDays || 30));

    if (status === 'APPROVED') {
      if (paymentProvider === 'WALLET' && paymentStatus === 'WALLET_HOLD' && existing.ownerUserId) {
        await captureWalletHold(tx, {
          userId: existing.ownerUserId,
          amount: priceAmount,
          currency,
          reason: `Featured placement approved: ${existing.placementLabel || existing.requestedPagePath}`,
          referenceType: 'FEATURED_PLACEMENT_REQUEST',
          referenceId: existing.id,
          metadata: { profileId: existing.profileId, placementKey: existing.placementKey }
        });
        paymentStatus = 'WALLET_CAPTURED';
        if (existing.payment?.id) {
          await tx.featuredPayment.update({
            where: { id: existing.payment.id },
            data: { status: 'CAPTURED', amount: priceAmount, currency }
          });
        }
      } else if (paymentProvider === 'RAZORPAY' && paymentStatus === 'RAZORPAY_PAID' && existing.payment?.id) {
        await tx.featuredPayment.update({
          where: { id: existing.payment.id },
          data: { status: 'APPROVED', amount: priceAmount, currency }
        });
      }
      await tx.profile.update({
        where: { id: existing.profileId },
        data: {
          isFeatured: true,
          featuredUntil
        },
        include: listingInclude
      });
      const campaignData = {
        profileId: existing.profileId,
        ownerUserId: existing.ownerUserId,
        requestId: existing.id,
        pageType: String(existing.requestedPage || 'ALL').toUpperCase(),
        pagePath: campaignPagePath(existing),
        slot: 'TOP',
        status: 'ACTIVE',
        startsAt,
        endsAt: featuredUntil,
        approvedAt: now,
        cancelledAt: null,
        adminNote,
        source: 'REQUEST',
        placementKey: existing.placementKey,
        placementLabel: existing.placementLabel,
        priceAmount,
        currency,
        paymentStatus,
        paymentProvider
      };
      const existingCampaign = await tx.featuredPlacementCampaign.findFirst({
        where: { requestId: existing.id },
        orderBy: { createdAt: 'desc' }
      });
      if (existingCampaign) {
        await tx.featuredPlacementCampaign.update({
          where: { id: existingCampaign.id },
          data: campaignData
        });
      } else {
        await tx.featuredPlacementCampaign.create({ data: campaignData });
      }
    } else if (status === 'REJECTED') {
      if (paymentProvider === 'WALLET' && paymentStatus === 'WALLET_HOLD' && existing.ownerUserId) {
        await releaseWalletHold(tx, {
          userId: existing.ownerUserId,
          amount: priceAmount,
          currency,
          reason: `Featured placement rejected: ${existing.placementLabel || existing.requestedPagePath}`,
          referenceType: 'FEATURED_PLACEMENT_REQUEST',
          referenceId: existing.id,
          metadata: { profileId: existing.profileId, placementKey: existing.placementKey }
        });
        paymentStatus = 'WALLET_RELEASED';
        if (existing.payment?.id) {
          await tx.featuredPayment.update({
            where: { id: existing.payment.id },
            data: { status: 'RELEASED', amount: priceAmount, currency }
          });
        }
      } else if (paymentProvider === 'RAZORPAY' && paymentStatus === 'RAZORPAY_PAID' && existing.payment?.id) {
        paymentStatus = 'REFUND_DUE';
        await tx.featuredPayment.update({
          where: { id: existing.payment.id },
          data: { status: 'REFUND_DUE', amount: priceAmount, currency }
        });
      } else if (existing.payment?.id) {
        await tx.featuredPayment.update({
          where: { id: existing.payment.id },
          data: { status: 'CANCELLED', amount: priceAmount, currency }
        });
      }
      await tx.featuredPlacementCampaign.updateMany({
        where: { requestId: existing.id, status: 'ACTIVE' },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          adminNote
        }
      });
    }

    const request = await tx.featuredPlacementRequest.update({
      where: { id: existing.id },
      data: {
        status,
        adminNote,
        priceAmount,
        currency,
        paymentStatus,
        paymentProvider,
        reviewedAt: new Date()
      },
      include: featuredRequestInclude
    });

    return {
      request,
      profile: await tx.profile.findUnique({ where: { id: existing.profileId }, include: listingInclude })
    };
  });

  res.json({ data: result.request, profile: result.profile });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json({ data: withComputedVerificationStatus(listing) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const profileData = await profilePayload(prisma, req.body, { defaultStatus: 'PENDING' });
  const isDraft = profileData.status === 'DRAFT';
  Object.assign(profileData, profileVerificationData(profileData, isDraft));
  validateAdultSubmission({ body: req.body, profileData, isDraft });
  const galleryItems = activeGalleryPayloads(req.body.gallery);
  enforceGalleryBatchLimit(galleryItems);
  const verificationDocuments = adultDocumentPayloads(req.body);
  if (verificationDocuments.length && profileData.verificationStatus === 'NOT_REQUIRED') {
    profileData.verificationStatus = 'PENDING';
  }
  const listing = await prisma.$transaction(async (tx) => {
    const created = await tx.profile.create({
      data: profileData,
      include: listingInclude
    });
    if (galleryItems.length) {
      await tx.profileGallery.createMany({
        data: galleryItems
          .map((item, index) => ({ ...galleryPayload(item), profileId: created.id, sortOrder: item.sortOrder ?? index + 1 }))
          .filter((item) => item.imageUrl)
      });
    }
    if (verificationDocuments.length) {
      await tx.profileVerificationDocument.createMany({
        data: verificationDocuments.map((item) => ({ ...item, profileId: created.id }))
      });
    }
    return tx.profile.findUnique({ where: { id: created.id }, include: listingInclude });
  });
  res.status(201).json({ data: listing });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const updated = await prisma.profile.update({
    where: { id: listing.id },
    data: await profilePayload(prisma, req.body, { partial: true }),
    include: listingInclude
  });
  res.json({ data: updated });
}));

router.patch('/:id/verification', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const updates = Array.isArray(req.body.documents) ? req.body.documents : [];
  const updated = await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      if (!item?.id) continue;
      await tx.profileVerificationDocument.updateMany({
        where: { id: String(item.id), profileId: listing.id },
        data: {
          status: documentStatus(item.status),
          adminNotes: item.adminNotes === undefined ? undefined : String(item.adminNotes || '').trim() || null
        }
      });
    }
    await tx.profile.update({
      where: { id: listing.id },
      data: {
        verificationStatus: documentStatus(req.body.verificationStatus, listing.verificationStatus || 'PENDING'),
        verificationNotes: req.body.verificationNotes === undefined ? undefined : String(req.body.verificationNotes || '').trim() || null
      }
    });
    return tx.profile.findUnique({ where: { id: listing.id }, include: listingInclude });
  });

  res.json({ data: updated });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const newStatus = normalizeStatus(req.body.status);
  if (!newStatus) return res.status(400).json({ error: 'Valid status is required' });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { id: listing.id },
      data: {
        status: newStatus,
        rejectionReason: req.body.rejectionReason,
        adminNotes: req.body.adminNotes
      },
    });
    await tx.profileStatusHistory.create({
      data: {
        profileId: listing.id,
        oldStatus: listing.status,
        newStatus,
        reason: req.body.rejectionReason || req.body.reason,
        adminNote: req.body.adminNotes
      }
    });
    return tx.profile.findUnique({
      where: { id: listing.id },
      include: listingInclude
    });
  });

  res.json({ data: updated });
}));

router.patch('/:id/featured', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const featured = toBool(req.body.isFeatured) ?? false;
  const featuredUntil = featured ? (req.body.featuredUntil ? new Date(req.body.featuredUntil) : defaultFeaturedUntil(30)) : null;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { id: listing.id },
      data: {
        isFeatured: featured,
        featuredUntil
      }
    });

    if (featured) {
      const now = new Date();
      const campaignData = {
        profileId: listing.id,
        ownerUserId: listing.ownerUserId,
        pageType: 'ALL',
        pagePath: 'ALL',
        slot: 'TOP',
        status: 'ACTIVE',
        startsAt: now,
        endsAt: featuredUntil,
        approvedAt: now,
        cancelledAt: null,
        source: 'ADMIN_MANUAL'
      };
      const existingManualCampaign = await tx.featuredPlacementCampaign.findFirst({
        where: { profileId: listing.id, source: 'ADMIN_MANUAL', status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
      if (existingManualCampaign) {
        await tx.featuredPlacementCampaign.update({ where: { id: existingManualCampaign.id }, data: campaignData });
      } else {
        await tx.featuredPlacementCampaign.create({ data: campaignData });
      }
    } else {
      await tx.featuredPlacementCampaign.updateMany({
        where: { profileId: listing.id, status: 'ACTIVE' },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });
    }

    return tx.profile.findUnique({ where: { id: listing.id }, include: listingInclude });
  });
  res.json({ data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const listing = await resolveListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  await prisma.profile.delete({ where: { id: listing.id } });
  res.json({ message: 'Listing deleted' });
}));

export default router;
