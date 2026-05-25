import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { slugify, toBool, toNumber } from '../utils/helpers.js';
import { requireAdmin } from '../utils/auth.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { profiles: true } } }
  });
  res.json({ data: categories });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { slug: req.params.slug },
    include: { _count: { select: { profiles: true } } }
  });
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json({ data: category });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const name = req.body.name;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(name);
  const category = await prisma.category.create({
    data: {
      slug,
      name,
      description: req.body.description || '',
      iconName: req.body.iconName || 'BadgeCheck',
      status: req.body.status || 'ACTIVE',
      isAdult: toBool(req.body.isAdult) || false,
      adultLevel: req.body.adultLevel || (toBool(req.body.isAdult) ? 'AGE_RESTRICTED' : 'NONE'),
      minimumAge: req.body.minimumAge === undefined ? (toBool(req.body.isAdult) ? 18 : 0) : toNumber(req.body.minimumAge),
      showOnHomepage: req.body.showOnHomepage === undefined ? !toBool(req.body.isAdult) : toBool(req.body.showOnHomepage),
      indexable: req.body.indexable === undefined ? true : toBool(req.body.indexable),
      seoTitle: req.body.seoTitle || `${name} Directory`,
      seoDesc: req.body.seoDesc || `Find trusted ${name} profiles near you.`
    }
  });
  res.status(201).json({ data: category });
}));

router.put('/:slug', requireAdmin, asyncHandler(async (req, res) => {
  const category = await prisma.category.update({
    where: { slug: req.params.slug },
    data: {
      slug: req.body.slug ? slugify(req.body.slug) : undefined,
      name: req.body.name,
      description: req.body.description,
      iconName: req.body.iconName,
      status: req.body.status,
      isAdult: req.body.isAdult === undefined ? undefined : toBool(req.body.isAdult),
      adultLevel: req.body.adultLevel,
      minimumAge: req.body.minimumAge === undefined ? undefined : toNumber(req.body.minimumAge),
      showOnHomepage: req.body.showOnHomepage === undefined ? undefined : toBool(req.body.showOnHomepage),
      indexable: req.body.indexable === undefined ? undefined : toBool(req.body.indexable),
      seoTitle: req.body.seoTitle,
      seoDesc: req.body.seoDesc
    }
  });
  res.json({ data: category });
}));

router.delete('/:slug', requireAdmin, asyncHandler(async (req, res) => {
  const slug = slugify(req.params.slug);
  const existing = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { profiles: true } } }
  });
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const deletedProfiles = await prisma.$transaction(async (tx) => {
    const profileCount = await tx.profile.count({ where: { categoryId: slug } });
    await tx.profile.deleteMany({ where: { categoryId: slug } });
    await tx.category.delete({ where: { slug } });
    return profileCount;
  });

  res.json({ message: 'Category deleted', deletedProfiles });
}));

export default router;
