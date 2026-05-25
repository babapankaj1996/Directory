import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { slugify } from '../utils/helpers.js';
import { requireAdmin } from '../utils/auth.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const posts = await prisma.blogPost.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json({ data: posts });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
  if (!post) return res.status(404).json({ error: 'Blog post not found' });
  res.json({ data: post });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const title = req.body.title;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const post = await prisma.blogPost.create({
    data: {
      slug: req.body.slug ? slugify(req.body.slug) : slugify(title),
      title,
      excerpt: req.body.excerpt || '',
      content: req.body.content || '',
      image: req.body.image,
      status: req.body.status || 'PUBLISHED',
      seoTitle: req.body.seoTitle || title,
      seoDesc: req.body.seoDesc || req.body.excerpt || ''
    }
  });
  res.status(201).json({ data: post });
}));

router.put('/:slug', requireAdmin, asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.update({
    where: { slug: req.params.slug },
    data: {
      slug: req.body.slug ? slugify(req.body.slug) : undefined,
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      image: req.body.image,
      status: req.body.status,
      seoTitle: req.body.seoTitle,
      seoDesc: req.body.seoDesc
    }
  });
  res.json({ data: post });
}));

router.delete('/:slug', requireAdmin, asyncHandler(async (req, res) => {
  await prisma.blogPost.delete({ where: { slug: req.params.slug } });
  res.json({ message: 'Blog post deleted' });
}));

export default router;
