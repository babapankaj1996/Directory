import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { slugify } from '../utils/helpers.js';
import { requireAdmin } from '../utils/auth.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const and = [];
  if (req.query.countryCode && String(req.query.countryCode).toUpperCase() !== 'ALL') {
    and.push({ countryCode: String(req.query.countryCode).toLowerCase() });
  }
  if (req.query.status && String(req.query.status).toUpperCase() !== 'ALL') {
    and.push({ status: String(req.query.status).toUpperCase() });
  }
  if (req.query.search) {
    String(req.query.search).trim().split(/\s+/).filter(Boolean).forEach((token) => {
      and.push({
        OR: [
          { slug: { contains: token, mode: 'insensitive' } },
          { name: { contains: token, mode: 'insensitive' } },
          { countryCode: { contains: token, mode: 'insensitive' } },
          { seoTitle: { contains: token, mode: 'insensitive' } },
          { seoDesc: { contains: token, mode: 'insensitive' } },
          { country: { name: { contains: token, mode: 'insensitive' } } }
        ]
      });
    });
  }
  const where = and.length ? { AND: and } : {};
  const cities = await prisma.city.findMany({
    where,
    orderBy: [{ countryCode: 'asc' }, { name: 'asc' }],
    include: { country: true, _count: { select: { profiles: true } } }
  });
  res.json({ data: cities });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const city = await prisma.city.findUnique({ where: { id: req.params.id }, include: { country: true } });
  if (!city) return res.status(404).json({ error: 'City not found' });
  res.json({ data: city });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const name = req.body.name;
  const countryCode = String(req.body.countryCode || '').toLowerCase();
  if (!name || !countryCode) return res.status(400).json({ error: 'name and countryCode are required' });
  const city = await prisma.city.create({
    data: {
      name,
      countryCode,
      slug: req.body.slug ? slugify(req.body.slug) : slugify(name),
      status: req.body.status || 'ACTIVE',
      seoTitle: req.body.seoTitle || `${name} Directory`,
      seoDesc: req.body.seoDesc || `Find trusted service providers in ${name}.`
    }
  });
  res.status(201).json({ data: city });
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const city = await prisma.city.update({
    where: { id: req.params.id },
    data: {
      name: req.body.name,
      slug: req.body.slug ? slugify(req.body.slug) : undefined,
      countryCode: req.body.countryCode ? String(req.body.countryCode).toLowerCase() : undefined,
      status: req.body.status,
      seoTitle: req.body.seoTitle,
      seoDesc: req.body.seoDesc
    }
  });
  res.json({ data: city });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await prisma.city.delete({ where: { id: req.params.id } });
  res.json({ message: 'City deleted' });
}));

export default router;
