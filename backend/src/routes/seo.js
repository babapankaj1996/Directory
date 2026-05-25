import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { requireAdmin } from '../utils/auth.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  if (req.query.path) {
    const meta = await prisma.seoMeta.findUnique({ where: { path: String(req.query.path) } });
    if (!meta) return res.status(404).json({ error: 'SEO metadata not found' });
    return res.json({ data: meta });
  }
  const meta = await prisma.seoMeta.findMany({ orderBy: { path: 'asc' } });
  res.json({ data: meta });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { path, title, description, canonical, noIndex } = req.body;
  if (!path || !title || !description) return res.status(400).json({ error: 'path, title and description are required' });
  const meta = await prisma.seoMeta.upsert({
    where: { path },
    create: { path, title, description, canonical, noIndex: Boolean(noIndex) },
    update: { title, description, canonical, noIndex: Boolean(noIndex) }
  });
  res.status(201).json({ data: meta });
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const meta = await prisma.seoMeta.update({
    where: { id: req.params.id },
    data: {
      path: req.body.path,
      title: req.body.title,
      description: req.body.description,
      canonical: req.body.canonical,
      noIndex: req.body.noIndex
    }
  });
  res.json({ data: meta });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await prisma.seoMeta.delete({ where: { id: req.params.id } });
  res.json({ message: 'SEO metadata deleted' });
}));

export default router;
