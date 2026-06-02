import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { slugify } from '../utils/helpers.js';
import { requireAdmin } from '../utils/auth.js';

const router = Router();
const defaultPageSize = 200;
const maxPageSize = 500;
const validStatuses = new Set(['ACTIVE', 'DRAFT']);

function normalizeStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  return validStatuses.has(status) ? status : '';
}

function pageNumber(value) {
  const parsed = Number.parseInt(String(value || '1'), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function pageSize(value) {
  const parsed = Number.parseInt(String(value || defaultPageSize), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return defaultPageSize;
  return Math.min(parsed, maxPageSize);
}

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
  const page = pageNumber(req.query.page);
  const perPage = pageSize(req.query.limit || req.query.perPage);
  const [cities, total] = await prisma.$transaction([
    prisma.city.findMany({
      where,
      orderBy: [{ countryCode: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: { country: true, _count: { select: { profiles: true } } }
    }),
    prisma.city.count({ where })
  ]);
  res.json({
    data: cities,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(Math.ceil(total / perPage), 1)
    }
  });
}));

router.patch('/status', requireAdmin, asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids)
    ? req.body.ids.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  const status = normalizeStatus(req.body.status);
  if (!ids.length || !status) return res.status(400).json({ error: 'ids and valid status are required' });

  await prisma.city.updateMany({
    where: { id: { in: ids } },
    data: { status }
  });
  const cities = await prisma.city.findMany({
    where: { id: { in: ids } },
    orderBy: [{ countryCode: 'asc' }, { name: 'asc' }],
    include: { country: true, _count: { select: { profiles: true } } }
  });
  res.json({ data: cities, updated: cities.length });
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
