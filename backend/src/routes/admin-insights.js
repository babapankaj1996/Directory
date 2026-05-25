import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { countsFromGroups } from '../utils/insights.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [profiles, groups, topProfiles] = await Promise.all([
    prisma.profile.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        isFeatured: true,
        viewCount: true,
        reviewCount: true
      }
    }),
    prisma.profileInsightEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: { _all: true }
    }),
    prisma.profile.findMany({
      orderBy: { viewCount: 'desc' },
      take: 8,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        viewCount: true,
        reviewCount: true,
        city: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        country: { select: { code: true, name: true } }
      }
    })
  ]);

  res.json({
    data: {
      days,
      summary: {
        ...countsFromGroups(groups),
        TOTAL_VIEW_COUNT: profiles.reduce((sum, profile) => sum + profile.viewCount, 0),
        TOTAL_REVIEWS: profiles.reduce((sum, profile) => sum + profile.reviewCount, 0),
        TOTAL_LISTINGS: profiles.length
      },
      topProfiles
    }
  });
}));

export default router;

