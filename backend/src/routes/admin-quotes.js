import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { breakdownBy, leadQualitySummary, statusTimestampData } from '../utils/lead-quality.js';

const router = Router();
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'LOST', 'SPAM'];

const include = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  },
  profile: {
    include: {
      country: true,
      city: true,
      category: true
    }
  }
};

function normalizeLeadStatus(value, fallback = undefined) {
  if (!value) return fallback;
  const normalized = String(value).trim().toUpperCase();
  return LEAD_STATUSES.includes(normalized) ? normalized : fallback;
}

function listWhere(query) {
  const and = [];
  const status = normalizeLeadStatus(query.status);
  const search = String(query.search || '').trim();

  if (status) and.push({ status });
  if (query.quality) and.push({ leadQuality: String(query.quality).trim().toUpperCase() });
  if (query.city) and.push({ profile: { city: { slug: String(query.city).trim().toLowerCase() } } });
  if (query.category) and.push({ profile: { categoryId: String(query.category).trim().toLowerCase() } });
  if (query.profile) {
    const profile = String(query.profile).trim();
    and.push({
      profile: {
        OR: [
          { id: profile },
          { slug: profile.toLowerCase() },
          { name: { contains: profile, mode: 'insensitive' } }
        ]
      }
    });
  }

  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
        { serviceNeeded: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { ownerNote: { contains: search, mode: 'insensitive' } },
        { adminNote: { contains: search, mode: 'insensitive' } },
        { profile: { name: { contains: search, mode: 'insensitive' } } },
        { profile: { slug: { contains: search, mode: 'insensitive' } } },
        { profile: { ownerName: { contains: search, mode: 'insensitive' } } },
        { profile: { ownerEmail: { contains: search, mode: 'insensitive' } } },
        { profile: { city: { name: { contains: search, mode: 'insensitive' } } } },
        { profile: { category: { name: { contains: search, mode: 'insensitive' } } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    });
  }

  return and.length ? { AND: and } : {};
}

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const perPage = Math.min(Math.max(Number(req.query.perPage || req.query.limit || 50), 1), 100);
  const where = listWhere(req.query);
  const [leads, total] = await Promise.all([
    prisma.profileLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include
    }),
    prisma.profileLead.count({ where })
  ]);

  res.json({
    data: leads,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(Math.ceil(total / perPage), 1)
    }
  });
}));

router.get('/quality', asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const leads = await prisma.profileLead.findMany({
    where: { createdAt: { gte: since } },
    include,
    orderBy: { createdAt: 'desc' }
  });
  const totalViews = await prisma.profileInsightEvent.count({
    where: {
      type: 'PROFILE_VIEW',
      createdAt: { gte: since }
    }
  });

  res.json({
    data: {
      days,
      summary: leadQualitySummary(leads, { PROFILE_VIEW: totalViews }),
      byProfile: breakdownBy(leads, (lead) => lead.profile?.name).slice(0, 10),
      byCategory: breakdownBy(leads, (lead) => lead.profile?.category?.name).slice(0, 10),
      byCity: breakdownBy(leads, (lead) => lead.profile?.city?.name).slice(0, 10),
      bySource: breakdownBy(leads, (lead) => lead.sourcePath || lead.source).slice(0, 10)
    }
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const lead = await prisma.profileLead.findUnique({
    where: { id: req.params.id },
    include
  });
  if (!lead) return res.status(404).json({ error: 'Quote request not found' });
  res.json({ data: lead });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const status = normalizeLeadStatus(req.body.status);
  if (!status) return res.status(400).json({ error: 'Valid quote status is required.' });

  const lead = await prisma.profileLead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: 'Quote request not found' });

  const updated = await prisma.profileLead.update({
    where: { id: lead.id },
    data: {
      status,
      ...statusTimestampData(lead, status),
      adminNote: req.body.adminNote === undefined ? undefined : String(req.body.adminNote || '').trim() || null
    },
    include
  });
  res.json({ data: updated });
}));

export default router;
