import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { isValidSeoSlug, slugify } from '../utils/helpers.js';
import { galleryPayload, normalizeStatus, profilePayload } from '../utils/listing-payload.js';
import { countsFromGroups, profileInsightSummary } from '../utils/insights.js';
import { adultDocumentPayloads } from '../utils/adult-verification.js';
import { breakdownBy, leadQualitySummary, statusTimestampData } from '../utils/lead-quality.js';
import { assertGallerySlotAvailable } from '../utils/gallery-limit.js';
import { publicMailStatus, sendFeaturedRequestEmail } from '../utils/mailer.js';
import { FEATURED_DURATIONS, pricedPlacementOptions, resolvePlacementSelection } from '../utils/featured-pricing.js';
import { withComputedVerificationStatus } from '../utils/verification-status.js';
import {
  createRazorpayOrder,
  getFeaturedPaymentSettings,
  getOrCreateWallet,
  holdWalletAmount,
  normalizeAmount,
  paymentMethodAllowed,
  publicPaymentSettings,
  verifyRazorpayPaymentSignature,
  walletAvailable
} from '../utils/billing.js';

const router = Router();

const ownerInclude = {
  country: true,
  city: true,
  category: true,
  gallery: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  verificationDocuments: { orderBy: [{ type: 'asc' }, { createdAt: 'desc' }] },
  featuredPlacementRequests: { orderBy: { createdAt: 'desc' }, take: 3, include: { payment: true } },
  featuredPlacementCampaigns: { orderBy: [{ status: 'asc' }, { startsAt: 'desc' }], take: 10 },
  _count: { select: { reviews: true, gallery: true } }
};

const publicProfileInclude = {
  country: true,
  city: true,
  category: true,
  gallery: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  }
};

const leadInclude = {
  profile: {
    include: {
      country: true,
      city: true,
      category: true
    }
  }
};

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'LOST', 'SPAM'];
const VERIFICATION_DOCUMENT_TYPES = ['GOV_ID', 'AGE_SELFIE', 'BUSINESS_LICENSE', 'CERTIFICATE', 'ADDRESS_PROOF', 'OTHER'];
function normalizeLeadStatus(value, fallback = undefined) {
  if (!value) return fallback;
  const normalized = String(value).trim().toUpperCase();
  return LEAD_STATUSES.includes(normalized) ? normalized : fallback;
}

function normalizeVerificationDocumentType(value) {
  const normalized = String(value || 'OTHER').trim().toUpperCase().replace(/[-\s]+/g, '_');
  return VERIFICATION_DOCUMENT_TYPES.includes(normalized) ? normalized : 'OTHER';
}

function normalizePrivateDocumentUrl(value) {
  const url = String(value || '').trim();
  if (url.startsWith('/api/uploads/private/')) return url;
  const marker = '/api/uploads/private/';
  const markerIndex = url.indexOf(marker);
  return markerIndex >= 0 ? url.slice(markerIndex) : '';
}

function ownerWhere(req) {
  if (req.authUser.role === 'ADMIN') return {};
  if (req.authUser.role !== 'OWNER') {
    const error = new Error('Only owner accounts can manage listings.');
    error.statusCode = 403;
    throw error;
  }
  if (!req.authUser.emailVerified) {
    const error = new Error('Please verify your email before managing listings.');
    error.statusCode = 403;
    throw error;
  }
  return { ownerUserId: req.authUser.id };
}

async function findApprovedProfile(idOrSlug) {
  return prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      OR: [{ id: idOrSlug }, { slug: slugify(idOrSlug) }]
    },
    include: publicProfileInclude
  });
}

async function findOwnerListing(req, idOrSlug) {
  return prisma.profile.findFirst({
    where: {
      ...ownerWhere(req),
      OR: [{ id: idOrSlug }, { slug: slugify(idOrSlug) }]
    },
    include: ownerInclude
  });
}

router.get('/listings', asyncHandler(async (req, res) => {
  const listings = await prisma.profile.findMany({
    where: ownerWhere(req),
    orderBy: { createdAt: 'desc' },
    include: ownerInclude
  });
  res.json({ data: listings.map((listing) => withComputedVerificationStatus(listing)) });
}));

router.get('/wallet', asyncHandler(async (req, res) => {
  const settings = publicPaymentSettings(await getFeaturedPaymentSettings(prisma));
  if (req.authUser.role === 'USER') {
    return res.json({ data: { wallet: null, transactions: [], paymentSettings: settings } });
  }
  const wallet = await getOrCreateWallet(prisma, req.authUser.id, settings.currency);
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: req.authUser.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  res.json({
    data: {
      wallet: {
        ...wallet,
        availableBalance: walletAvailable(wallet)
      },
      transactions,
      paymentSettings: settings
    }
  });
}));

router.post('/wallet/topups', asyncHandler(async (req, res) => {
  if (req.authUser.role !== 'OWNER') return res.status(403).json({ error: 'Only owner accounts can add wallet balance.' });
  const settings = publicPaymentSettings(await getFeaturedPaymentSettings(prisma));
  const amount = normalizeAmount(req.body.amount);
  if (amount <= 0) return res.status(400).json({ error: 'Top-up amount must be greater than zero.' });
  const reason = String(req.body.reason || '').trim() || 'Owner wallet top-up request';

  const transaction = await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, req.authUser.id, settings.currency);
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: req.authUser.id,
        type: 'TOPUP_REQUEST',
        amount,
        currency: settings.currency,
        status: 'PENDING',
        reason,
        referenceType: 'WALLET_TOPUP_REQUEST',
        metadata: {
          ownerEmail: req.authUser.email,
          requestedBy: req.authUser.id
        }
      }
    });
  });

  res.status(201).json({
    message: 'Wallet top-up request sent to admin.',
    data: { transaction }
  });
}));

router.post('/wallet/topups/razorpay-order', asyncHandler(async (req, res) => {
  if (req.authUser.role !== 'OWNER') return res.status(403).json({ error: 'Only owner accounts can add wallet balance.' });
  const settings = publicPaymentSettings(await getFeaturedPaymentSettings(prisma));
  if (!settings.razorpayEnabled) {
    return res.status(400).json({ error: 'Razorpay wallet top-up is not enabled. Use admin approval request instead.' });
  }
  const amount = normalizeAmount(req.body.amount);
  if (amount <= 0) return res.status(400).json({ error: 'Top-up amount must be greater than zero.' });

  const order = await createRazorpayOrder({
    amount,
    currency: settings.currency,
    keyId: settings.razorpayKeyId,
    receipt: `wallet_${Date.now()}`,
    notes: {
      ownerUserId: req.authUser.id,
      ownerEmail: req.authUser.email,
      purpose: 'wallet_topup'
    }
  });

  const transaction = await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, req.authUser.id, settings.currency);
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: req.authUser.id,
        type: 'RAZORPAY_TOPUP',
        amount,
        currency: settings.currency,
        status: 'PENDING',
        reason: 'Razorpay wallet top-up',
        referenceType: 'RAZORPAY_WALLET_TOPUP',
        referenceId: order.id,
        metadata: {
          razorpayOrderId: order.id,
          ownerEmail: req.authUser.email
        }
      }
    });
  });

  res.json({
    message: 'Razorpay wallet top-up order created.',
    data: {
      transaction,
      razorpay: {
        keyId: settings.razorpayKeyId,
        orderId: order.id,
        amount,
        currency: settings.currency,
        name: 'Wallet top-up',
        description: `Add ${settings.currency} ${amount} to wallet`
      }
    }
  });
}));

router.post('/wallet/topups/razorpay-verify', asyncHandler(async (req, res) => {
  if (req.authUser.role !== 'OWNER') return res.status(403).json({ error: 'Only owner accounts can verify wallet top-ups.' });
  const orderId = String(req.body.razorpay_order_id || req.body.orderId || '').trim();
  const paymentId = String(req.body.razorpay_payment_id || req.body.paymentId || '').trim();
  const signature = String(req.body.razorpay_signature || req.body.signature || '').trim();
  if (!orderId || !paymentId || !signature) return res.status(400).json({ error: 'Razorpay payment details are required.' });
  if (!verifyRazorpayPaymentSignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ error: 'Razorpay payment signature could not be verified.' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const pending = await tx.walletTransaction.findFirst({
      where: {
        userId: req.authUser.id,
        referenceType: 'RAZORPAY_WALLET_TOPUP',
        referenceId: orderId,
        status: 'PENDING'
      }
    });
    if (!pending) {
      const error = new Error('Pending Razorpay wallet top-up not found.');
      error.statusCode = 404;
      throw error;
    }
    const wallet = await tx.userWallet.update({
      where: { id: pending.walletId },
      data: { balance: { increment: pending.amount } }
    });
    const transaction = await tx.walletTransaction.update({
      where: { id: pending.id },
      data: {
        status: 'COMPLETED',
        metadata: {
          ...(pending.metadata && typeof pending.metadata === 'object' ? pending.metadata : {}),
          razorpayPaymentId: paymentId,
          verifiedAt: new Date().toISOString()
        }
      }
    });
    return { wallet, transaction };
  });

  res.json({
    message: 'Wallet balance added successfully.',
    data: {
      wallet: {
        ...result.wallet,
        availableBalance: walletAvailable(result.wallet)
      },
      transaction: result.transaction
    }
  });
}));

router.get('/insights', asyncHandler(async (req, res) => {
  const profiles = await prisma.profile.findMany({
    where: ownerWhere(req),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      isFeatured: true,
      viewCount: true,
      reviewCount: true
    }
  });
  const profileIds = profiles.map((profile) => profile.id);
  const summary = await profileInsightSummary(prisma, profileIds, 30);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const profileGroups = profileIds.length ? await prisma.profileInsightEvent.groupBy({
    by: ['profileId', 'type'],
    where: {
      profileId: { in: profileIds },
      createdAt: { gte: since }
    },
    _count: { _all: true }
  }) : [];

  res.json({
    data: {
      days: 30,
      summary: {
        ...summary,
        TOTAL_VIEW_COUNT: profiles.reduce((sum, profile) => sum + profile.viewCount, 0),
        TOTAL_REVIEWS: profiles.reduce((sum, profile) => sum + profile.reviewCount, 0)
      },
      profiles: profiles.map((profile) => ({
        ...profile,
        insights: countsFromGroups(profileGroups.filter((group) => group.profileId === profile.id))
      }))
    }
  });
}));

router.get('/reviews', asyncHandler(async (req, res) => {
  const reviews = await prisma.profileReview.findMany({
    where: { userId: req.authUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      profile: {
        include: publicProfileInclude
      }
    }
  });
  res.json({ data: reviews.filter((review) => review.profile?.status === 'APPROVED') });
}));

router.get('/quote-requests', asyncHandler(async (req, res) => {
  const take = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
  const leads = await prisma.profileLead.findMany({
    where: { userId: req.authUser.id },
    orderBy: { createdAt: 'desc' },
    take,
    include: leadInclude
  });
  res.json({ data: leads });
}));

router.get('/saved-profiles', asyncHandler(async (req, res) => {
  const saved = await prisma.profileSave.findMany({
    where: { userId: req.authUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      profile: {
        include: publicProfileInclude
      }
    }
  });
  res.json({ data: saved.filter((item) => item.profile?.status === 'APPROVED') });
}));

router.get('/saved-profiles/:profileId/status', asyncHandler(async (req, res) => {
  const profile = await findApprovedProfile(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  const saved = await prisma.profileSave.findUnique({
    where: {
      profileId_userId: {
        profileId: profile.id,
        userId: req.authUser.id
      }
    }
  });
  res.json({ data: { profileId: profile.id, saved: Boolean(saved) } });
}));

router.get('/leads', asyncHandler(async (req, res) => {
  const where = ownerWhere(req);
  const status = normalizeLeadStatus(req.query.status);
  const search = String(req.query.search || '').trim();
  const take = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
  const and = [];

  if (Object.keys(where).length) and.push({ profile: where });
  if (status) and.push({ status });
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
        { serviceNeeded: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { profile: { name: { contains: search, mode: 'insensitive' } } }
      ]
    });
  }

  const leads = await prisma.profileLead.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: { createdAt: 'desc' },
    take,
    include: leadInclude
  });
  res.json({ data: leads });
}));

router.get('/leads/quality', asyncHandler(async (req, res) => {
  const where = ownerWhere(req);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const profileWhere = Object.keys(where).length ? where : {};
  const profiles = await prisma.profile.findMany({
    where: profileWhere,
    select: {
      id: true,
      slug: true,
      name: true,
      viewCount: true,
      city: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } }
    }
  });
  const profileIds = profiles.map((profile) => profile.id);
  const leads = profileIds.length ? await prisma.profileLead.findMany({
    where: {
      profileId: { in: profileIds },
      createdAt: { gte: since }
    },
    include: leadInclude,
    orderBy: { createdAt: 'desc' }
  }) : [];
  const insights = await profileInsightSummary(prisma, profileIds, 30);
  const summary = leadQualitySummary(leads, {
    ...insights,
    TOTAL_VIEW_COUNT: profiles.reduce((sum, profile) => sum + profile.viewCount, 0)
  });

  res.json({
    data: {
      days: 30,
      summary,
      byProfile: breakdownBy(leads, (lead) => lead.profile?.name).slice(0, 8),
      byCategory: breakdownBy(leads, (lead) => lead.profile?.category?.name).slice(0, 8),
      byCity: breakdownBy(leads, (lead) => lead.profile?.city?.name).slice(0, 8),
      bySource: breakdownBy(leads, (lead) => lead.sourcePath || lead.source).slice(0, 8)
    }
  });
}));

router.patch('/leads/:id/status', asyncHandler(async (req, res) => {
  const where = ownerWhere(req);
  const status = normalizeLeadStatus(req.body.status);
  if (!status) return res.status(400).json({ error: 'Valid lead status is required.' });

  const lead = await prisma.profileLead.findFirst({
    where: {
      id: req.params.id,
      ...(Object.keys(where).length ? { profile: where } : {})
    },
    include: leadInclude
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const updated = await prisma.profileLead.update({
    where: { id: lead.id },
    data: {
      status,
      ...statusTimestampData(lead, status),
      ownerNote: req.body.ownerNote,
      adminNote: req.authUser.role === 'ADMIN' ? req.body.adminNote : undefined
    },
    include: leadInclude
  });
  res.json({ data: updated });
}));

router.post('/saved-profiles/:profileId', asyncHandler(async (req, res) => {
  if (!req.authUser.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email before saving profiles.' });
  }
  const profile = await findApprovedProfile(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  const saved = await prisma.profileSave.upsert({
    where: {
      profileId_userId: {
        profileId: profile.id,
        userId: req.authUser.id
      }
    },
    create: {
      profileId: profile.id,
      userId: req.authUser.id
    },
    update: {},
    include: {
      profile: {
        include: publicProfileInclude
      }
    }
  });
  res.status(201).json({ data: saved });
}));

router.delete('/saved-profiles/:profileId', asyncHandler(async (req, res) => {
  const profile = await findApprovedProfile(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  await prisma.profileSave.deleteMany({
    where: {
      profileId: profile.id,
      userId: req.authUser.id
    }
  });
  res.json({ data: { profileId: profile.id, saved: false } });
}));

router.get('/listings/:id', asyncHandler(async (req, res) => {
  const listing = await findOwnerListing(req, req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json({ data: withComputedVerificationStatus(listing) });
}));

router.get('/listings/:id/featured-options', asyncHandler(async (req, res) => {
  const listing = await findOwnerListing(req, req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'APPROVED') {
    return res.json({
      data: {
        durations: FEATURED_DURATIONS,
        currency: 'INR',
        options: [],
        message: 'Featured placement options are available after profile approval.'
      }
    });
  }
  const options = await pricedPlacementOptions(prisma, listing, req.query.currency);
  res.json({ data: { durations: FEATURED_DURATIONS, currency: 'INR', options } });
}));

router.post('/listings/:id/gallery', asyncHandler(async (req, res) => {
  const listing = await findOwnerListing(req, req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  await assertGallerySlotAvailable(prisma, listing.id);
  const image = await prisma.profileGallery.create({
    data: {
      ...galleryPayload(req.body),
      profileId: listing.id,
      isActive: true
    }
  });
  res.status(201).json({ data: image });
}));

router.post('/listings/:id/verification-documents', asyncHandler(async (req, res) => {
  const listing = await findOwnerListing(req, req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const fileUrl = normalizePrivateDocumentUrl(req.body.fileUrl || req.body.url);
  if (!fileUrl) return res.status(400).json({ error: 'Private verification document upload is required.' });

  const document = await prisma.$transaction(async (tx) => {
    const saved = await tx.profileVerificationDocument.create({
      data: {
        profileId: listing.id,
        type: normalizeVerificationDocumentType(req.body.type),
        fileUrl,
        originalName: String(req.body.originalName || '').trim() || null,
        status: 'PENDING',
        adminNotes: null
      }
    });
    await tx.profile.update({
      where: { id: listing.id },
      data: {
        verificationStatus: 'PENDING',
        verificationNotes: null
      }
    });
    return saved;
  });

  res.status(201).json({ data: document });
}));

router.post('/listings/:id/featured-request', asyncHandler(async (req, res) => {
  const listing = await findOwnerListing(req, req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'APPROVED') return res.status(400).json({ error: 'Only approved listings can request featured placement.' });

  const placement = await resolvePlacementSelection(prisma, listing, req.body);
  const rawPaymentMethod = String(req.body.paymentMethod || '').trim().toUpperCase();
  const paymentSettings = publicPaymentSettings(await getFeaturedPaymentSettings(prisma));
  const paymentMethod = rawPaymentMethod || '';
  if (paymentMethod && !paymentMethodAllowed(paymentSettings.mode, paymentMethod)) {
    return res.status(400).json({ error: `${paymentMethod} is not enabled for featured placements.` });
  }
  if (paymentMethod === 'RAZORPAY' && !paymentSettings.razorpayEnabled) {
    return res.status(400).json({ error: 'Razorpay is not configured. Ask admin to enable Razorpay keys or use wallet.' });
  }
  const requestedDays = placement.requestedDays;
  const requestedPage = placement.pageType;
  const requestedPagePath = placement.pagePath;
  const frontendBase = (process.env.FRONTEND_URL || process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  const profileUrl = `${frontendBase}/${listing.countryId}/${listing.city.slug}/${listing.categoryId}/${listing.slug}`;
  const adminUrl = `${frontendBase}/admin/featured-requests`;
  const recipients = [
    process.env.ADMIN_FEATURED_EMAIL,
    process.env.ADMIN_EMAIL,
    process.env.SMTP_USER
  ].join(',').split(/[,\s]+/).map((email) => email.trim()).filter(Boolean);

  const uniqueRecipients = [...new Set(recipients)];
  const razorpayOrder = paymentMethod === 'RAZORPAY'
    ? await createRazorpayOrder({
        amount: placement.priceAmount,
        currency: placement.currency,
        keyId: paymentSettings.razorpayKeyId,
        receipt: `feat_${Date.now()}`,
        notes: {
          profileId: listing.id,
          profileSlug: listing.slug,
          ownerUserId: req.authUser.id,
          placementKey: placement.scopeKey,
          requestedDays
        }
      })
    : null;
  const request = await prisma.$transaction(async (tx) => {
    const existing = await tx.featuredPlacementRequest.findFirst({
      where: { profileId: listing.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { payment: true }
    });
    if (existing && ['WALLET_HOLD', 'RAZORPAY_PAID'].includes(String(existing.paymentStatus || '').toUpperCase())) {
      const error = new Error('A paid featured request is already waiting for admin review.');
      error.statusCode = 409;
      throw error;
    }
    const data = {
      ownerUserId: req.authUser.id,
      requestedDays,
      requestedPage,
      requestedPagePath,
      placementKey: placement.scopeKey,
      placementLabel: placement.label,
      priceAmount: placement.priceAmount,
      currency: placement.currency,
      paymentStatus: paymentMethod === 'WALLET'
        ? 'WALLET_HOLD'
        : paymentMethod === 'RAZORPAY'
          ? 'RAZORPAY_ORDER_CREATED'
          : 'UNPAID',
      paymentProvider: paymentMethod || null,
      adminNote: null
    };
    const savedRequest = existing
      ? tx.featuredPlacementRequest.update({ where: { id: existing.id }, data })
      : tx.featuredPlacementRequest.create({ data: { ...data, profileId: listing.id } });
    const saved = await savedRequest;
    if (paymentMethod === 'WALLET') {
      const hold = await holdWalletAmount(tx, {
        userId: req.authUser.id,
        amount: placement.priceAmount,
        currency: placement.currency,
        reason: `Featured placement: ${placement.label}`,
        referenceType: 'FEATURED_PLACEMENT_REQUEST',
        referenceId: saved.id,
        metadata: {
          profileId: listing.id,
          placementKey: placement.scopeKey,
          requestedDays
        }
      });
      await tx.featuredPayment.upsert({
        where: { requestId: saved.id },
        update: {
          profileId: listing.id,
          ownerUserId: req.authUser.id,
          provider: 'WALLET',
          status: 'HELD',
          amount: placement.priceAmount,
          currency: placement.currency,
          walletTransactionId: hold.transaction.id,
          metadata: { placementKey: placement.scopeKey, requestedDays }
        },
        create: {
          requestId: saved.id,
          profileId: listing.id,
          ownerUserId: req.authUser.id,
          provider: 'WALLET',
          status: 'HELD',
          amount: placement.priceAmount,
          currency: placement.currency,
          walletTransactionId: hold.transaction.id,
          metadata: { placementKey: placement.scopeKey, requestedDays }
        }
      });
    } else if (paymentMethod === 'RAZORPAY') {
      await tx.featuredPayment.upsert({
        where: { requestId: saved.id },
        update: {
          profileId: listing.id,
          ownerUserId: req.authUser.id,
          provider: 'RAZORPAY',
          status: 'ORDER_CREATED',
          amount: placement.priceAmount,
          currency: placement.currency,
          razorpayOrderId: razorpayOrder.id,
          metadata: { placementKey: placement.scopeKey, requestedDays }
        },
        create: {
          requestId: saved.id,
          profileId: listing.id,
          ownerUserId: req.authUser.id,
          provider: 'RAZORPAY',
          status: 'ORDER_CREATED',
          amount: placement.priceAmount,
          currency: placement.currency,
          razorpayOrderId: razorpayOrder.id,
          metadata: { placementKey: placement.scopeKey, requestedDays }
        }
      });
    }
    return tx.featuredPlacementRequest.findUnique({
      where: { id: saved.id },
      include: { payment: true, campaigns: true }
    });
  });

  const shouldNotifyAdmin = paymentMethod !== 'RAZORPAY';
  const mailResults = shouldNotifyAdmin ? await Promise.all(uniqueRecipients.map((to) => sendFeaturedRequestEmail({
    to,
    ownerName: req.authUser.name,
    ownerEmail: req.authUser.email,
    profile: listing,
    profileUrl,
    adminUrl,
    requestedDays,
    requestedPage,
    requestedPagePath
  }))) : [];

  res.json({
    message: paymentMethod === 'RAZORPAY'
      ? 'Razorpay order created. Complete payment to send this request for admin approval.'
      : uniqueRecipients.length ? 'Featured placement request sent to admin.' : 'Featured request noted, but admin email is not configured.',
    data: {
      request,
      listingId: listing.id,
      profileUrl,
      adminUrl,
      placement,
      payment: paymentMethod ? {
        method: paymentMethod,
        settings: paymentSettings,
        razorpay: razorpayOrder ? {
          keyId: paymentSettings.razorpayKeyId,
          orderId: razorpayOrder.id,
          amount: placement.priceAmount,
          currency: placement.currency,
          name: 'Featured placement',
          description: `${placement.label} for ${requestedDays} days`
        } : null
      } : null,
      mail: publicMailStatus(mailResults[0])
    }
  });
}));

router.post('/featured-requests/:requestId/razorpay/verify', asyncHandler(async (req, res) => {
  const request = await prisma.featuredPlacementRequest.findUnique({
    where: { id: req.params.requestId },
    include: { profile: true, payment: true }
  });
  if (!request) return res.status(404).json({ error: 'Featured request not found.' });
  if (req.authUser.role !== 'ADMIN' && request.ownerUserId !== req.authUser.id && request.profile.ownerUserId !== req.authUser.id) {
    return res.status(403).json({ error: 'You cannot verify payment for this request.' });
  }
  if (!request.payment || request.payment.provider !== 'RAZORPAY') {
    return res.status(400).json({ error: 'This featured request does not have a Razorpay payment.' });
  }

  const orderId = String(req.body.razorpay_order_id || req.body.orderId || '').trim();
  const paymentId = String(req.body.razorpay_payment_id || req.body.paymentId || '').trim();
  const signature = String(req.body.razorpay_signature || req.body.signature || '').trim();
  if (orderId !== request.payment.razorpayOrderId) return res.status(400).json({ error: 'Razorpay order mismatch.' });
  if (!verifyRazorpayPaymentSignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ error: 'Razorpay payment signature could not be verified.' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.featuredPayment.update({
      where: { id: request.payment.id },
      data: {
        status: 'PAID',
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      }
    });
    return tx.featuredPlacementRequest.update({
      where: { id: request.id },
      data: { paymentStatus: 'RAZORPAY_PAID', paymentProvider: 'RAZORPAY' },
      include: { payment: true, campaigns: true }
    });
  });

  res.json({ message: 'Razorpay payment verified. The request is ready for admin review.', data: { request: updated } });
}));

router.put('/listings/:id', asyncHandler(async (req, res) => {
  const listing = await findOwnerListing(req, req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const requestedStatus = normalizeStatus(req.body.status);
  const saveMode = String(req.body.saveMode || '').trim().toUpperCase();
  const isDraftSave = saveMode === 'DRAFT' || requestedStatus === 'DRAFT';
  const nextStatus = listing.status === 'DRAFT' && isDraftSave ? 'DRAFT' : 'PENDING';
  const nextCategorySlug = listing.status === 'DRAFT'
    ? slugify(req.body.categoryId || req.body.categorySlug || req.body.category || listing.categoryId)
    : listing.categoryId;
  const nextCategory = nextCategorySlug ? await prisma.category.findUnique({ where: { slug: nextCategorySlug }, select: { isAdult: true } }) : null;
  const nextIsAdult = nextCategory?.isAdult ?? listing.isAdult;
  if (nextStatus === 'PENDING') {
    const submittedSlug = listing.status === 'DRAFT' ? slugify(req.body.slug || listing.slug) : listing.slug;
    const missing = [
      !String(req.body.name || listing.name || '').trim() && 'Business name',
      listing.status === 'DRAFT' && !String(req.body.slug || '').trim() && 'SEO URL slug',
      !String(req.body.ownerName || listing.ownerName || '').trim() && 'Owner name',
      !String(req.body.phone || listing.phone || '').trim() && 'Phone',
      listing.status === 'DRAFT' && !String(req.body.countryId || req.body.country || listing.countryId || '').trim() && 'Country',
      listing.status === 'DRAFT' && !String(req.body.citySlug || req.body.city || listing.city?.slug || '').trim() && 'City',
      listing.status === 'DRAFT' && !String(req.body.categoryId || req.body.category || listing.categoryId || '').trim() && 'Category',
      !String(req.body.address || listing.address || '').trim() && 'Address',
      !String(req.body.description || req.body.about || listing.description || '').trim() && 'Description'
    ].filter(Boolean);
    if (missing.length) {
      return res.status(400).json({ error: `Complete these fields before submitting for review: ${missing.join(', ')}` });
    }
    if (listing.status === 'DRAFT' && !isValidSeoSlug(submittedSlug)) {
      return res.status(400).json({ error: 'SEO URL slug can use lowercase letters, numbers and hyphens only. Example: saloni-apte or saloniapte123.' });
    }
    if (nextIsAdult) {
      const docs = [...(listing.verificationDocuments || []), ...adultDocumentPayloads(req.body)];
      const docTypes = new Set(docs.map((doc) => doc.type));
      const docMissing = [
        !docTypes.has('GOV_ID') && 'government ID',
        !docTypes.has('AGE_SELFIE') && 'latest photo holding DOB paper'
      ].filter(Boolean);
      if (!req.body.adultDisclaimerAcceptedAt && !req.body.adultLegalConfirmed && !listing.adultDisclaimerAcceptedAt) {
        return res.status(400).json({ error: '18+ listings require legal responsibility confirmation before submission.' });
      }
      if (docMissing.length) {
        return res.status(400).json({ error: `18+ listings require verification document(s): ${docMissing.join(', ')}.` });
      }
    }
  }

  const lockedPayload = {
    ...req.body,
    name: isDraftSave ? (req.body.name ?? listing.name) : req.body.name,
    description: isDraftSave ? (req.body.description ?? req.body.about ?? listing.description) : req.body.description,
    ownerName: isDraftSave ? (req.body.ownerName ?? listing.ownerName) : req.body.ownerName,
    slug: listing.status === 'DRAFT' ? req.body.slug : undefined,
    countryId: listing.status === 'DRAFT' ? req.body.countryId : undefined,
    countryCode: listing.status === 'DRAFT' ? req.body.countryCode : undefined,
    country: listing.status === 'DRAFT' ? req.body.country : undefined,
    cityId: listing.status === 'DRAFT' ? req.body.cityId : undefined,
    citySlug: listing.status === 'DRAFT' ? req.body.citySlug : undefined,
    city: listing.status === 'DRAFT' ? req.body.city : undefined,
    categoryId: listing.status === 'DRAFT' ? req.body.categoryId : undefined,
    categorySlug: listing.status === 'DRAFT' ? req.body.categorySlug : undefined,
    category: listing.status === 'DRAFT' ? req.body.category : undefined,
    status: nextStatus,
    isFeatured: undefined,
    featured: undefined,
    ownerUserId: undefined,
    rejectionReason: undefined,
    adminNotes: undefined,
    rating: undefined,
    reviewCount: undefined,
    reviews: undefined,
    viewCount: undefined,
    isAdult: undefined,
    ageRestricted: undefined,
    adultLevel: undefined,
    verificationStatus: undefined,
    verificationNotes: undefined
  };

  const newDocuments = adultDocumentPayloads(req.body);
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.profile.update({
      where: { id: listing.id },
      data: {
        ...(await profilePayload(prisma, lockedPayload, { partial: true })),
        adultDisclaimerAcceptedAt: req.body.adultDisclaimerAcceptedAt || req.body.adultLegalConfirmed ? new Date() : undefined,
        verificationStatus: nextIsAdult && nextStatus === 'PENDING' ? 'PENDING' : undefined
      }
    });
    if (newDocuments.length) {
      await tx.profileVerificationDocument.createMany({
        data: newDocuments.map((item) => ({ ...item, profileId: listing.id }))
      });
    }
    return tx.profile.findUnique({ where: { id: saved.id }, include: ownerInclude });
  });
  res.json({ data: updated });
}));

export default router;
