import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const include = {
  user: { select: { id: true, name: true, email: true, role: true } },
  profile: {
    select: {
      id: true,
      name: true,
      slug: true,
      countryId: true,
      categoryId: true,
      city: { select: { slug: true, name: true } }
    }
  }
};

function normalizeStatus(value, fallback = 'PENDING') {
  const status = String(value || fallback).trim().toUpperCase();
  return REVIEW_STATUSES.includes(status) ? status : fallback;
}

async function refreshAggregate(tx, profileId) {
  const aggregate = await tx.profileReview.aggregate({
    where: { profileId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true }
  });
  await tx.profile.update({
    where: { id: profileId },
    data: {
      rating: Number((aggregate._avg.rating || 0).toFixed(1)),
      reviewCount: aggregate._count._all
    }
  });
}

router.get('/', asyncHandler(async (req, res) => {
  const status = req.query.status ? normalizeStatus(req.query.status, '') : '';
  const search = String(req.query.search || '').trim();
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { comment: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { profile: { name: { contains: search, mode: 'insensitive' } } },
      { profile: { slug: { contains: search, mode: 'insensitive' } } }
    ];
  }
  const reviews = await prisma.profileReview.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include
  });
  res.json({ data: reviews });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const review = await prisma.profileReview.findUnique({ where: { id: req.params.id } });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  const status = normalizeStatus(req.body.status);
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.profileReview.update({
      where: { id: review.id },
      data: {
        status,
        moderationNote: req.body.moderationNote || req.body.note || null
      },
      include
    });
    await refreshAggregate(tx, review.profileId);
    return saved;
  });
  res.json({ data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const review = await prisma.profileReview.findUnique({ where: { id: req.params.id } });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  await prisma.$transaction(async (tx) => {
    await tx.profileReview.delete({ where: { id: review.id } });
    await refreshAggregate(tx, review.profileId);
  });
  res.json({ message: 'Review deleted' });
}));

export default router;
