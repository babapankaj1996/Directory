import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { isValidSeoSlug, slugify, toBool } from '../utils/helpers.js';
import { galleryPayload, normalizeStatus, profilePayload } from '../utils/listing-payload.js';
import { optionalAuth, requireAdmin, requireAuth } from '../utils/auth.js';
import { rateLimit } from '../utils/rate-limit.js';
import { hashSignal, insightPayload, normalizeInsightType } from '../utils/insights.js';
import { sendLeadNotificationEmail } from '../utils/mailer.js';
import { adultDocumentPayloads, profileVerificationData, validateAdultSubmission } from '../utils/adult-verification.js';
import { scoreLead } from '../utils/lead-quality.js';
import { activeGalleryPayloads, enforceGalleryBatchLimit } from '../utils/gallery-limit.js';
import { isActiveFeatured, sortProfilesByFeatured } from '../utils/featured.js';
import { withComputedVerificationStatus } from '../utils/verification-status.js';

const router = Router();
const reviewLimiter = rateLimit({ scope: 'profile-review', windowMs: 10 * 60 * 1000, max: 8 });
const leadLimiter = rateLimit({ scope: 'profile-lead', windowMs: 10 * 60 * 1000, max: 6 });
const searchSynonyms = {
  nyc: ['new york', 'new york city', 'manhattan'],
  gurgaon: ['gurugram'],
  jyotish: ['astrologer', 'astrology'],
  vastu: ['astrologer'],
  doctor: ['doctors', 'clinic', 'physician'],
  lawyer: ['lawyers', 'legal', 'advocate'],
  tutor: ['home tutors', 'tuition', 'classes'],
  makeup: ['makeup artists', 'bridal'],
  property: ['real estate agents', 'broker'],
  mechanic: ['car mechanics', 'garage'],
  escort: ['female escorts', 'male escorts', 'trans escorts', 'companions'],
  girlfriend: ['rent a girlfriend', 'dating companions'],
  boyfriend: ['rent a boyfriend', 'dating companions'],
  massage: ['massage services', 'adult massage services']
};

const publicInclude = {
  country: true,
  city: true,
  category: true,
  gallery: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  },
  verificationDocuments: {
    select: { type: true, status: true, createdAt: true, updatedAt: true },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }]
  },
  featuredPlacementCampaigns: { orderBy: [{ status: 'asc' }, { startsAt: 'desc' }], take: 10 }
};

function publicReviewInclude() {
  return {
    user: {
      select: {
        id: true,
        name: true,
        role: true
      }
    }
  };
}

function expandedTokens(search) {
  const tokens = String(search || '').trim().split(/\s+/).filter(Boolean);
  return tokens.flatMap((token) => [token, ...(searchSynonyms[token.toLowerCase()] || [])]);
}

function publicWhereFromQuery(query) {
  const and = [
    { status: 'APPROVED' },
    { country: { status: 'ACTIVE' } },
    { city: { status: 'ACTIVE' } }
  ];

  if (query.country) and.push({ countryId: String(query.country).toLowerCase() });
  if (query.city) and.push({ city: { slug: slugify(query.city) } });
  if (query.category) and.push({ categoryId: slugify(query.category) });
  if (query.adult !== undefined) {
    and.push({ isAdult: toBool(query.adult) });
  }

  if (query.search) {
    const tokens = expandedTokens(query.search);
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
          { description: { contains: token, mode: 'insensitive' } },
          { shortDescription: { contains: token, mode: 'insensitive' } },
          { address: { contains: token, mode: 'insensitive' } },
          { city: { name: { contains: token, mode: 'insensitive' } } },
          { city: { slug: { contains: token, mode: 'insensitive' } } },
          { category: { name: { contains: token, mode: 'insensitive' } } },
          { category: { slug: { contains: token, mode: 'insensitive' } } }
        ]
      });
    });
  }

  return { AND: and };
}

async function findProfileByIdOrSlug(idOrSlug, include = publicInclude) {
  const query = {
    where: { OR: [{ id: idOrSlug }, { slug: slugify(idOrSlug) }] },
  };
  if (include) query.include = include;
  return prisma.profile.findFirst(query);
}

async function findApprovedProfileByIdOrSlug(idOrSlug, select = { id: true, ownerUserId: true }) {
  return prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      country: { status: 'ACTIVE' },
      city: { status: 'ACTIVE' },
      OR: [{ id: idOrSlug }, { slug: slugify(idOrSlug) }]
    },
    select
  });
}

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const perPage = Math.min(Math.max(Number(req.query.perPage || req.query.limit || 0), 0), 48);
  const pagination = perPage ? { skip: (page - 1) * perPage, take: perPage } : {};
  const where = publicWhereFromQuery(req.query);
  const allProfiles = await prisma.profile.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }, { rating: 'desc' }],
    include: publicInclude
  });
  const placementPath = String(req.query.placementPath || '').trim();
  const computedProfiles = allProfiles.map((profile) => withComputedVerificationStatus(profile, { stripDocuments: true }));
  const filteredProfiles = req.query.featured !== undefined
    ? computedProfiles.filter((profile) => isActiveFeatured(profile, placementPath) === toBool(req.query.featured))
    : computedProfiles;
  const sortedProfiles = sortProfilesByFeatured(filteredProfiles, placementPath);
  const profiles = perPage ? sortedProfiles.slice(pagination.skip, pagination.skip + pagination.take) : sortedProfiles;
  const total = sortedProfiles.length;
  res.json({
    data: profiles,
    meta: perPage ? { page, perPage, total, totalPages: Math.max(Math.ceil(total / perPage), 1) } : undefined
  });
}));

function optionalLeadDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function adminLeadRecipients(ownerEmail) {
  const raw = process.env.ADMIN_LEAD_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER || '';
  const owner = String(ownerEmail || '').trim().toLowerCase();
  return [...new Set(raw.split(/[,\s]+/).map((email) => email.trim().toLowerCase()).filter(Boolean))]
    .filter((email) => email && email !== owner);
}

router.post('/:profileId/leads', leadLimiter, optionalAuth, asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      country: { status: 'ACTIVE' },
      city: { status: 'ACTIVE' },
      OR: [{ id: req.params.profileId }, { slug: slugify(req.params.profileId) }]
    },
    include: { country: true, city: true, category: true }
  });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const whatsapp = String(req.body.whatsapp || '').trim();
  const serviceNeeded = String(req.body.serviceNeeded || req.body.service || '').trim();
  const budget = String(req.body.budget || '').trim();
  const timeline = String(req.body.timeline || '').trim();
  const contactPreference = String(req.body.contactPreference || '').trim();
  const preferredTime = String(req.body.preferredTime || '').trim();
  const message = String(req.body.message || '').trim();
  const sourcePath = String(req.body.sourcePath || req.get('referer') || req.get('referrer') || '').trim().slice(0, 300);
  const preferredDate = optionalLeadDate(req.body.preferredDate);

  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' });
  if (phone.replace(/\D/g, '').length < 7) return res.status(400).json({ error: 'Valid phone number is required.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email is required.' });
  if (message.length > 1200) return res.status(400).json({ error: 'Message must be 1200 characters or less.' });

  const ipHash = hashSignal(req.ip || req.socket?.remoteAddress);
  const userAgentHash = hashSignal(req.get('user-agent'));
  const quality = scoreLead({
    email,
    phone,
    whatsapp,
    serviceNeeded,
    preferredDate,
    preferredTime,
    message,
    budget,
    timeline,
    contactPreference,
    userId: req.authUser?.id
  });
  const recentLeadCount = ipHash ? await prisma.profileLead.count({
    where: {
      profileId: profile.id,
      ipHash,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  }) : 0;
  if (recentLeadCount >= 3) return res.status(429).json({ error: 'Too many quote requests for this profile today.' });

  const lead = await prisma.$transaction(async (tx) => {
    const saved = await tx.profileLead.create({
      data: {
        profileId: profile.id,
        userId: req.authUser?.id || null,
        name,
        email: email || null,
        phone,
        whatsapp: whatsapp || null,
        serviceNeeded: serviceNeeded || null,
        budget: budget || null,
        timeline: timeline || null,
        contactPreference: contactPreference || null,
        preferredDate,
        preferredTime: preferredTime || null,
        message: message || null,
        source: String(req.body.source || 'PROFILE_QUOTE').trim().slice(0, 80) || 'PROFILE_QUOTE',
        sourcePath: sourcePath || null,
        leadScore: quality.leadScore,
        leadQuality: quality.leadQuality,
        ipHash,
        userAgentHash
      },
      include: {
        profile: {
          include: { country: true, city: true, category: true }
        }
      }
    });
    await tx.profileInsightEvent.create({
      data: insightPayload(req, 'LEAD_SUBMITTED', profile.id)
    });
    return saved;
  });

  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const dashboardUrl = `${frontendBase}/dashboard`;
  const adminQuotesUrl = `${frontendBase}/admin/quotes`;
  const ownerEmail = profile.ownerEmail;
  const notificationLead = {
    ...lead,
    preferredDate: lead.preferredDate ? lead.preferredDate.toISOString().slice(0, 10) : undefined
  };
  const sends = [];
  if (ownerEmail) {
    sends.push(sendLeadNotificationEmail({
      to: ownerEmail,
      profileName: profile.name,
      lead: notificationLead,
      dashboardUrl
    }));
  }
  adminLeadRecipients(ownerEmail).forEach((to) => {
    sends.push(sendLeadNotificationEmail({
      to,
      profileName: profile.name,
      lead: notificationLead,
      dashboardUrl: adminQuotesUrl
    }));
  });
  if (sends.length) Promise.allSettled(sends).catch(() => undefined);

  res.status(201).json({
    data: {
      id: lead.id,
      status: lead.status,
      leadScore: lead.leadScore,
      leadQuality: lead.leadQuality,
      createdAt: lead.createdAt,
      profileId: profile.id
    },
    message: 'Request sent. The business owner can contact you from their lead inbox.'
  });
}));

router.get('/:profileId/reviews', asyncHandler(async (req, res) => {
  const profile = await findApprovedProfileByIdOrSlug(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  const reviews = await prisma.profileReview.findMany({
    where: { profileId: profile.id, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    include: publicReviewInclude()
  });
  res.json({ data: reviews });
}));

router.post('/:profileId/reviews', reviewLimiter, requireAuth, asyncHandler(async (req, res) => {
  if (!req.authUser.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email before posting reviews.' });
  }
  if (req.authUser.role === 'OWNER') {
    return res.status(403).json({ error: 'Owner accounts are for posting listings. Please use a user account to review profiles.' });
  }

  const profile = await findApprovedProfileByIdOrSlug(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.ownerUserId && profile.ownerUserId === req.authUser.id) {
    return res.status(403).json({ error: 'You cannot review your own listing.' });
  }

  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  const title = String(req.body.title || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
  }
  if (comment.length < 10) return res.status(400).json({ error: 'Review comment must be at least 10 characters.' });
  const ipHash = hashSignal(req.ip || req.socket?.remoteAddress);
  const userAgentHash = hashSignal(req.get('user-agent'));

  const recentFromIp = ipHash ? await prisma.profileReview.count({
    where: {
      ipHash,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  }) : 0;
  if (recentFromIp > 10) return res.status(429).json({ error: 'Too many reviews from this network today.' });

  const review = await prisma.$transaction(async (tx) => {
    const saved = await tx.profileReview.upsert({
      where: { profileId_userId: { profileId: profile.id, userId: req.authUser.id } },
      create: {
        profileId: profile.id,
        userId: req.authUser.id,
        rating,
        title: title || null,
        comment,
        status: 'PENDING',
        ipHash,
        userAgentHash
      },
      update: {
        rating,
        title: title || null,
        comment,
        status: 'PENDING',
        ipHash,
        userAgentHash
      },
      include: publicReviewInclude()
    });
    const aggregate = await tx.profileReview.aggregate({
      where: { profileId: profile.id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true }
    });
    await tx.profile.update({
      where: { id: profile.id },
      data: {
        rating: Number((aggregate._avg.rating || 0).toFixed(1)),
        reviewCount: aggregate._count._all
      }
    });
    return saved;
  });

  res.status(201).json({ data: review });
}));

router.get('/:profileId/gallery', asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      country: { status: 'ACTIVE' },
      city: { status: 'ACTIVE' },
      OR: [{ id: req.params.profileId }, { slug: slugify(req.params.profileId) }]
    },
    select: {
      id: true,
      gallery: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      }
    }
  });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ data: profile.gallery });
}));

router.post('/:profileId/view', asyncHandler(async (req, res) => {
  const existing = await prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      country: { status: 'ACTIVE' },
      city: { status: 'ACTIVE' },
      OR: [{ id: req.params.profileId }, { slug: slugify(req.params.profileId) }]
    },
    select: { id: true }
  });
  if (!existing) return res.status(404).json({ error: 'Profile not found' });

  const profile = await prisma.$transaction(async (tx) => {
    await tx.profileInsightEvent.create({
      data: insightPayload(req, 'PROFILE_VIEW', existing.id)
    });
    return tx.profile.update({
      where: { id: existing.id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, slug: true, viewCount: true }
    });
  });
  res.json({ data: profile });
}));

router.post('/:profileId/insights', asyncHandler(async (req, res) => {
  const type = normalizeInsightType(req.body.type);
  if (!type || type === 'PROFILE_VIEW') return res.status(400).json({ error: 'Valid contact insight type is required' });
  const existing = await prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      country: { status: 'ACTIVE' },
      city: { status: 'ACTIVE' },
      OR: [{ id: req.params.profileId }, { slug: slugify(req.params.profileId) }]
    },
    select: { id: true, slug: true }
  });
  if (!existing) return res.status(404).json({ error: 'Profile not found' });
  await prisma.profileInsightEvent.create({
    data: insightPayload(req, type, existing.id)
  });
  res.json({ data: { profileId: existing.id, type } });
}));

async function publicProfileByPath(params) {
  return prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      countryId: params.country.toLowerCase(),
      country: { status: 'ACTIVE' },
      city: { slug: slugify(params.city), status: 'ACTIVE' },
      categoryId: slugify(params.category),
      slug: slugify(params.profile)
    },
    include: publicInclude
  });
}

router.get('/path/:country/:city/:category/:profile', asyncHandler(async (req, res) => {
  const profile = await publicProfileByPath(req.params);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ data: withComputedVerificationStatus(profile, { stripDocuments: true }) });
}));

router.get('/:country/:city/:category/:profile', asyncHandler(async (req, res) => {
  const profile = await publicProfileByPath(req.params);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ data: withComputedVerificationStatus(profile, { stripDocuments: true }) });
}));

router.get('/:idOrSlug', asyncHandler(async (req, res) => {
  const profile = await findProfileByIdOrSlug(req.params.idOrSlug);
  if (!profile || profile.status !== 'APPROVED') return res.status(404).json({ error: 'Profile not found' });
  res.json({ data: withComputedVerificationStatus(profile, { stripDocuments: true }) });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  if (!req.authUser.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email before submitting a listing.' });
  }
  if (!['OWNER', 'ADMIN'].includes(req.authUser.role)) {
    return res.status(403).json({ error: 'Only owner accounts can submit listings. Create an owner account to post a profile.' });
  }
  if (req.authUser.role === 'OWNER') {
    const existingCount = await prisma.profile.count({ where: { ownerUserId: req.authUser.id } });
    if (existingCount > 0) {
      return res.status(409).json({ error: 'Each business owner account can post only one profile. Manage your existing profile from the dashboard.' });
    }
  }
  const requestedStatus = normalizeStatus(req.body.status);
  const saveMode = String(req.body.saveMode || '').trim().toUpperCase();
  const isDraft = requestedStatus === 'DRAFT' || saveMode === 'DRAFT';
  if (!isDraft && !String(req.body.slug || '').trim()) {
    return res.status(400).json({ error: 'SEO URL slug is required. Choose a username-style profile slug before submitting.' });
  }
  const requestedSlug = req.body.slug ? slugify(req.body.slug) : '';
  if (!isDraft && !isValidSeoSlug(requestedSlug)) {
    return res.status(400).json({ error: 'SEO URL slug can use lowercase letters, numbers and hyphens only. Example: saloni-apte or saloniapte123.' });
  }
  const fallbackSlug = req.body.slug || (req.body.name ? slugify(req.body.name) : `draft-${req.authUser.id.slice(0, 8)}-${Date.now()}`);
  const publicSubmission = {
    ...req.body,
    name: isDraft ? (req.body.name || 'Untitled draft') : req.body.name,
    slug: isDraft ? fallbackSlug : req.body.slug,
    description: isDraft ? (req.body.description ?? req.body.about ?? '') : req.body.description,
    ownerName: req.body.ownerName || req.authUser.name,
    ownerEmail: req.body.ownerEmail || req.authUser.email,
    ownerUserId: req.authUser.id,
    status: isDraft ? 'DRAFT' : 'PENDING',
    isFeatured: false,
    featured: false,
    featuredUntil: null,
    rejectionReason: undefined,
    adminNotes: undefined
  };
  const profileData = await profilePayload(prisma, publicSubmission, { defaultStatus: isDraft ? 'DRAFT' : 'PENDING' });
  Object.assign(profileData, profileVerificationData(profileData, isDraft));
  validateAdultSubmission({ body: req.body, profileData, isDraft });
  const galleryItems = activeGalleryPayloads(req.body.gallery);
  enforceGalleryBatchLimit(galleryItems);
  const verificationDocuments = adultDocumentPayloads(req.body);
  if (verificationDocuments.length && profileData.verificationStatus === 'NOT_REQUIRED') {
    profileData.verificationStatus = 'PENDING';
  }
  const profile = await prisma.$transaction(async (tx) => {
    const created = await tx.profile.create({
      data: profileData,
      include: publicInclude
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
    return tx.profile.findUnique({ where: { id: created.id }, include: publicInclude });
  });
  res.status(201).json({ data: profile });
}));

router.put('/:idOrSlug', requireAdmin, asyncHandler(async (req, res) => {
  const existing = await findProfileByIdOrSlug(req.params.idOrSlug, undefined);
  if (!existing) return res.status(404).json({ error: 'Profile not found' });
  const profile = await prisma.profile.update({
    where: { id: existing.id },
    data: await profilePayload(prisma, req.body, { partial: true }),
    include: publicInclude
  });
  res.json({ data: profile });
}));

router.delete('/:idOrSlug', requireAdmin, asyncHandler(async (req, res) => {
  const existing = await findProfileByIdOrSlug(req.params.idOrSlug, undefined);
  if (!existing) return res.status(404).json({ error: 'Profile not found' });
  await prisma.profile.delete({ where: { id: existing.id } });
  res.json({ message: 'Profile deleted' });
}));

export default router;
