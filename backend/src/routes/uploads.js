import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { asyncHandler } from '../utils/async-handler.js';
import { requireAuth } from '../utils/auth.js';

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const videoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024) },
  fileFilter: (_req, file, cb) => {
    if (![...imageMimeTypes, ...videoMimeTypes].includes(file.mimetype)) {
      cb(new Error('Only JPG, PNG, WebP, AVIF, MP4, WebM and MOV media files are supported.'));
      return;
    }
    cb(null, true);
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../../uploads');
const imageRoot = path.join(uploadsRoot, 'images');
const videoRoot = path.join(uploadsRoot, 'videos');
const privateDocumentRoot = path.join(uploadsRoot, 'private-documents');

const imageProfiles = {
  cover: { width: 1600, height: 900, fit: 'cover' },
  avatar: { width: 512, height: 512, fit: 'cover' },
  gallery: { width: 1200, height: 1600, fit: 'cover' },
  certificate: { width: 1600, height: 1200, fit: 'inside' },
  document: { width: 1600, height: 1200, fit: 'inside' }
};

function uploadBaseUrl(req) {
  return (process.env.BACKEND_PUBLIC_URL || process.env.APP_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function safeType(value) {
  const type = String(value || 'gallery').toLowerCase();
  return imageProfiles[type] ? type : 'gallery';
}

async function ensureUploadDirs() {
  await fs.mkdir(imageRoot, { recursive: true });
  await fs.mkdir(videoRoot, { recursive: true });
  await fs.mkdir(privateDocumentRoot, { recursive: true });
}

function isImageMime(value) {
  return imageMimeTypes.includes(String(value || '').toLowerCase());
}

function isVideoMime(value) {
  return videoMimeTypes.includes(String(value || '').toLowerCase());
}

function videoExtension(value) {
  if (value === 'video/webm') return '.webm';
  if (value === 'video/quicktime') return '.mov';
  return '.mp4';
}

function safeDocumentType(value) {
  const type = String(value || 'verification-document').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return ['gov-id', 'age-selfie', 'verification-document'].includes(type) ? type : 'verification-document';
}

router.post('/image', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(req.authUser.role)) {
    return res.status(403).json({ error: 'Only business owners and admins can upload listing media.' });
  }
  if (!req.authUser.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email before uploading listing media.' });
  }
  if (!req.file) return res.status(400).json({ error: 'image file is required.' });

  const type = safeType(req.body.type);
  const profile = imageProfiles[type];
  await ensureUploadDirs();

  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const baseName = `${type}-${id}`;

  if (isVideoMime(req.file.mimetype)) {
    if (type !== 'gallery') return res.status(400).json({ error: 'Video uploads are supported for gallery media only.' });
    const fileName = `${baseName}${videoExtension(req.file.mimetype)}`;
    const filePath = path.join(videoRoot, fileName);
    await fs.writeFile(filePath, req.file.buffer);
    const baseUrl = uploadBaseUrl(req);
    return res.status(201).json({
      data: {
        storage: 'local',
        type,
        mediaType: 'video',
        mimeType: req.file.mimetype,
        url: `${baseUrl}/uploads/videos/${fileName}`,
        bytes: req.file.size,
        originalName: req.file.originalname
      }
    });
  }

  if (!isImageMime(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only supported image files can be optimized.' });
  }

  const webpPath = path.join(imageRoot, `${baseName}.webp`);
  const avifPath = path.join(imageRoot, `${baseName}.avif`);

  const pipeline = sharp(req.file.buffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: profile.width,
      height: profile.height,
      fit: profile.fit,
      withoutEnlargement: true
    });

  const webpInfo = await pipeline.clone().webp({ quality: 82, effort: 5 }).toFile(webpPath);
  await pipeline.clone().avif({ quality: 58, effort: 4 }).toFile(avifPath);

  const baseUrl = uploadBaseUrl(req);
  const webpUrl = `${baseUrl}/uploads/images/${baseName}.webp`;
  const avifUrl = `${baseUrl}/uploads/images/${baseName}.avif`;

  res.status(201).json({
    data: {
      storage: 'local',
      type,
      mediaType: 'image',
      mimeType: req.file.mimetype,
      url: webpUrl,
      webpUrl,
      avifUrl,
      width: webpInfo.width,
      height: webpInfo.height,
      bytes: webpInfo.size,
      originalName: req.file.originalname
    }
  });
}));

router.post('/verification-document', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(req.authUser.role)) {
    return res.status(403).json({ error: 'Only business owners and admins can upload verification documents.' });
  }
  if (!req.authUser.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email before uploading verification documents.' });
  }
  if (!req.file) return res.status(400).json({ error: 'image file is required.' });
  if (!isImageMime(req.file.mimetype)) return res.status(400).json({ error: 'Verification documents must be JPG, PNG, WebP or AVIF images.' });

  await ensureUploadDirs();
  const type = safeDocumentType(req.body.type);
  const id = `${Date.now()}-${crypto.randomBytes(10).toString('hex')}`;
  const fileName = `${type}-${id}.webp`;
  const filePath = path.join(privateDocumentRoot, fileName);
  const info = await sharp(req.file.buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 5 })
    .toFile(filePath);

  res.status(201).json({
    data: {
      storage: 'local-private',
      type,
      url: `/api/uploads/private/${fileName}`,
      width: info.width,
      height: info.height,
      bytes: info.size,
      originalName: req.file.originalname
    }
  });
}));

router.get('/private/:fileName', requireAuth, asyncHandler(async (req, res) => {
  if (req.authUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Verification document access denied.' });
  }
  const fileName = path.basename(String(req.params.fileName || ''));
  if (!/^[-a-z0-9]+-\d+-[a-f0-9]+\.webp$/i.test(fileName)) {
    return res.status(400).json({ error: 'Invalid document path.' });
  }
  const filePath = path.join(privateDocumentRoot, fileName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(privateDocumentRoot)) return res.status(400).json({ error: 'Invalid document path.' });
  res.type('image/webp');
  res.sendFile(resolved);
}));

export default router;
