import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { asyncHandler } from '../utils/async-handler.js';
import { requireAuth } from '../utils/auth.js';
import { rateLimit } from '../utils/rate-limit.js';
import { downloadPrivateObject, uploadPrivateObject, uploadPublicObject, usesSupabaseStorage } from '../lib/storage.js';

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const videoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

const router = Router();
const uploadLimiter = rateLimit({ scope: 'media-upload', windowMs: 60 * 60 * 1000, max: 60 });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024) },
  fileFilter: (_req, file, cb) => {
    if (![...imageMimeTypes, ...videoMimeTypes].includes(file.mimetype)) {
      const error = new Error('Only JPG, PNG, WebP, AVIF, MP4, WebM and MOV media files are supported.');
      error.statusCode = 415;
      cb(error);
      return;
    }
    cb(null, true);
  }
});

function receiveUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      error.statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    }
    return next(error);
  });
}

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

function validVideoBuffer(mimeType, buffer) {
  if (mimeType === 'video/webm') {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
}

async function validatedImage(buffer) {
  try {
    const image = sharp(buffer, { failOn: 'warning', limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error('Image dimensions are missing.');
    return image;
  } catch {
    const error = new Error('The uploaded image is invalid or cannot be decoded safely.');
    error.statusCode = 400;
    throw error;
  }
}

function safeDocumentType(value) {
  const type = String(value || 'verification-document').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return ['gov-id', 'age-selfie', 'verification-document'].includes(type) ? type : 'verification-document';
}

router.post('/image', uploadLimiter, requireAuth, receiveUpload, asyncHandler(async (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(req.authUser.role)) {
    return res.status(403).json({ error: 'Only business owners and admins can upload listing media.' });
  }
  if (!req.authUser.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email before uploading listing media.' });
  }
  if (!req.file) return res.status(400).json({ error: 'image file is required.' });

  const type = safeType(req.body.type);
  const profile = imageProfiles[type];
  const supabaseStorage = usesSupabaseStorage();
  if (!supabaseStorage) await ensureUploadDirs();

  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const baseName = `${type}-${id}`;

  if (isVideoMime(req.file.mimetype)) {
    if (type !== 'gallery') return res.status(400).json({ error: 'Video uploads are supported for gallery media only.' });
    if (!validVideoBuffer(req.file.mimetype, req.file.buffer)) {
      return res.status(400).json({ error: 'The uploaded video does not match its declared file type.' });
    }
    const fileName = `${baseName}${videoExtension(req.file.mimetype)}`;
    let url;
    if (supabaseStorage) {
      url = await uploadPublicObject(`videos/${fileName}`, req.file.buffer, req.file.mimetype);
    } else {
      const filePath = path.join(videoRoot, fileName);
      await fs.writeFile(filePath, req.file.buffer);
      url = `${uploadBaseUrl(req)}/uploads/videos/${fileName}`;
    }
    return res.status(201).json({
      data: {
        storage: supabaseStorage ? 'supabase' : 'local',
        type,
        mediaType: 'video',
        mimeType: req.file.mimetype,
        url,
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

  const pipeline = (await validatedImage(req.file.buffer))
    .rotate()
    .resize({
      width: profile.width,
      height: profile.height,
      fit: profile.fit,
      withoutEnlargement: true
    });

  let webpInfo;
  let webpUrl;
  let avifUrl;
  try {
    if (supabaseStorage) {
      const [webpOutput, avifOutput] = await Promise.all([
        pipeline.clone().webp({ quality: 82, effort: 5 }).toBuffer({ resolveWithObject: true }),
        pipeline.clone().avif({ quality: 58, effort: 4 }).toBuffer({ resolveWithObject: true })
      ]);
      [webpUrl, avifUrl] = await Promise.all([
        uploadPublicObject(`images/${baseName}.webp`, webpOutput.data, 'image/webp'),
        uploadPublicObject(`images/${baseName}.avif`, avifOutput.data, 'image/avif')
      ]);
      webpInfo = webpOutput.info;
    } else {
      webpInfo = await pipeline.clone().webp({ quality: 82, effort: 5 }).toFile(webpPath);
      await pipeline.clone().avif({ quality: 58, effort: 4 }).toFile(avifPath);
      const baseUrl = uploadBaseUrl(req);
      webpUrl = `${baseUrl}/uploads/images/${baseName}.webp`;
      avifUrl = `${baseUrl}/uploads/images/${baseName}.avif`;
    }
  } catch (cause) {
    if (!supabaseStorage) {
      await Promise.all([
        fs.rm(webpPath, { force: true }),
        fs.rm(avifPath, { force: true })
      ]);
    }
    if (cause?.statusCode) throw cause;
    const error = new Error('The uploaded image could not be processed safely.');
    error.statusCode = 400;
    throw error;
  }

  res.status(201).json({
    data: {
      storage: supabaseStorage ? 'supabase' : 'local',
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

router.post('/verification-document', uploadLimiter, requireAuth, receiveUpload, asyncHandler(async (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(req.authUser.role)) {
    return res.status(403).json({ error: 'Only business owners and admins can upload verification documents.' });
  }
  if (!req.authUser.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email before uploading verification documents.' });
  }
  if (!req.file) return res.status(400).json({ error: 'image file is required.' });
  if (!isImageMime(req.file.mimetype)) return res.status(400).json({ error: 'Verification documents must be JPG, PNG, WebP or AVIF images.' });

  const supabaseStorage = usesSupabaseStorage();
  if (!supabaseStorage) await ensureUploadDirs();
  const type = safeDocumentType(req.body.type);
  const id = `${Date.now()}-${crypto.randomBytes(10).toString('hex')}`;
  const fileName = `${type}-${id}.webp`;
  const filePath = path.join(privateDocumentRoot, fileName);
  let info;
  try {
    const pipeline = (await validatedImage(req.file.buffer))
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, effort: 5 });
    if (supabaseStorage) {
      const output = await pipeline.toBuffer({ resolveWithObject: true });
      await uploadPrivateObject(`private-documents/${fileName}`, output.data, 'image/webp');
      info = output.info;
    } else {
      info = await pipeline.toFile(filePath);
    }
  } catch (cause) {
    if (!supabaseStorage) await fs.rm(filePath, { force: true });
    if (cause?.statusCode) throw cause;
    const error = new Error('The uploaded verification document could not be processed safely.');
    error.statusCode = 400;
    throw error;
  }

  res.status(201).json({
    data: {
      storage: supabaseStorage ? 'supabase-private' : 'local-private',
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
  if (usesSupabaseStorage()) {
    const stored = await downloadPrivateObject(`private-documents/${fileName}`);
    if (stored) {
      res.set('Cache-Control', 'private, no-store');
      res.type('image/webp');
      return res.send(stored);
    }
  }
  const filePath = path.join(privateDocumentRoot, fileName);
  const resolved = path.resolve(filePath);
  if (path.dirname(resolved) !== privateDocumentRoot) return res.status(400).json({ error: 'Invalid document path.' });
  res.set('Cache-Control', 'private, no-store');
  res.type('image/webp');
  res.sendFile(resolved);
}));

export default router;
