import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { slugify } from '../utils/helpers.js';
import { requireAdmin } from '../utils/auth.js';

const router = Router();
const validStatuses = new Set(['ACTIVE', 'DRAFT']);

function normalizeStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  return validStatuses.has(status) ? status : '';
}

router.get('/', asyncHandler(async (req, res) => {
  const and = [];
  if (req.query.status && String(req.query.status).toUpperCase() !== 'ALL') {
    and.push({ status: String(req.query.status).toUpperCase() });
  }
  if (req.query.search) {
    String(req.query.search).trim().split(/\s+/).filter(Boolean).forEach((token) => {
      and.push({
        OR: [
          { code: { contains: token, mode: 'insensitive' } },
          { name: { contains: token, mode: 'insensitive' } },
          { seoTitle: { contains: token, mode: 'insensitive' } },
          { seoDesc: { contains: token, mode: 'insensitive' } }
        ]
      });
    });
  }
  const countries = await prisma.country.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: { name: 'asc' },
    include: { _count: { select: { cities: true, profiles: true } } }
  });
  res.json({ data: countries });
}));

router.patch('/status', requireAdmin, asyncHandler(async (req, res) => {
  const codes = Array.isArray(req.body.codes)
    ? req.body.codes.map((code) => String(code || '').toLowerCase().trim()).filter(Boolean)
    : [];
  const status = normalizeStatus(req.body.status);
  if (!codes.length || !status) return res.status(400).json({ error: 'codes and valid status are required' });

  await prisma.country.updateMany({
    where: { code: { in: codes } },
    data: { status }
  });
  const countries = await prisma.country.findMany({
    where: { code: { in: codes } },
    orderBy: { name: 'asc' },
    include: { _count: { select: { cities: true, profiles: true } } }
  });
  res.json({ data: countries, updated: countries.length });
}));

router.get('/:code', asyncHandler(async (req, res) => {
  const country = await prisma.country.findUnique({
    where: { code: req.params.code.toLowerCase() },
    include: { cities: true, _count: { select: { profiles: true } } }
  });
  if (!country) return res.status(404).json({ error: 'Country not found' });
  res.json({ data: country });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').toLowerCase().trim();
  if (!code || !req.body.name) return res.status(400).json({ error: 'code and name are required' });
  const country = await prisma.country.create({
    data: {
      code,
      name: req.body.name,
      status: req.body.status || 'ACTIVE',
      seoTitle: req.body.seoTitle || `${req.body.name} Directory`,
      seoDesc: req.body.seoDesc || `Find trusted profiles in ${req.body.name}.`
    }
  });
  res.status(201).json({ data: country });
}));

router.put('/:code', requireAdmin, asyncHandler(async (req, res) => {
  const country = await prisma.country.update({
    where: { code: req.params.code.toLowerCase() },
    data: {
      name: req.body.name,
      status: req.body.status,
      seoTitle: req.body.seoTitle,
      seoDesc: req.body.seoDesc
    }
  });
  res.json({ data: country });
}));

router.delete('/:code', requireAdmin, asyncHandler(async (req, res) => {
  await prisma.country.delete({ where: { code: req.params.code.toLowerCase() } });
  res.json({ message: 'Country deleted' });
}));

router.post('/:code/cities', requireAdmin, asyncHandler(async (req, res) => {
  const countryCode = req.params.code.toLowerCase();
  const name = req.body.name;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const city = await prisma.city.create({
    data: {
      name,
      slug: req.body.slug ? slugify(req.body.slug) : slugify(name),
      countryCode,
      status: req.body.status || 'ACTIVE',
      seoTitle: req.body.seoTitle || `${name} Directory`,
      seoDesc: req.body.seoDesc || `Find trusted service providers in ${name}.`
    }
  });
  res.status(201).json({ data: city });
}));

export default router;
