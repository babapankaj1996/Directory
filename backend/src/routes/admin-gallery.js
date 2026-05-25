import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { galleryPayload } from '../utils/listing-payload.js';

const router = Router();

router.put('/:galleryId', asyncHandler(async (req, res) => {
  const image = await prisma.profileGallery.update({
    where: { id: req.params.galleryId },
    data: galleryPayload(req.body, true)
  });
  res.json({ data: image });
}));

router.delete('/:galleryId', asyncHandler(async (req, res) => {
  await prisma.profileGallery.delete({ where: { id: req.params.galleryId } });
  res.json({ message: 'Gallery image deleted' });
}));

export default router;
