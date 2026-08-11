import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import path from 'path';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import countryRoutes from './routes/countries.js';
import cityRoutes from './routes/cities.js';
import categoryRoutes from './routes/categories.js';
import profileRoutes from './routes/profiles.js';
import dashboardRoutes from './routes/dashboard.js';
import adminListingRoutes from './routes/admin-listings.js';
import adminGalleryRoutes from './routes/admin-gallery.js';
import adminReviewRoutes from './routes/admin-reviews.js';
import adminInsightRoutes from './routes/admin-insights.js';
import adminQuoteRoutes from './routes/admin-quotes.js';
import adminBillingRoutes from './routes/admin-billing.js';
import uploadRoutes from './routes/uploads.js';
import blogRoutes from './routes/blog.js';
import seoRoutes from './routes/seo.js';
import { optionalAuth, requireAdmin, requireAuth } from './utils/auth.js';
import { asyncHandler } from './utils/async-handler.js';
import { slugify } from './utils/helpers.js';
import { rateLimit } from './utils/rate-limit.js';

function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.APP_PUBLIC_URL && !process.env.FRONTEND_URL) missing.push('APP_PUBLIC_URL');
  const authSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || '';
  if (!authSecret) missing.push('ADMIN_JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  if (authSecret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET must contain at least 32 characters in production.');
  }
  const supabaseStorageUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && !supabaseStorageUrl) {
    throw new Error('SUPABASE_URL is required when SUPABASE_SERVICE_ROLE_KEY is configured.');
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && new URL(supabaseStorageUrl).protocol !== 'https:') {
    throw new Error('SUPABASE_URL must use HTTPS when durable upload storage is enabled.');
  }

  const publicUrl = new URL(process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(publicUrl.hostname);
  if (publicUrl.protocol !== 'https:' && !loopback) {
    throw new Error('APP_PUBLIC_URL must use HTTPS in production.');
  }
}

assertProductionConfiguration();

const app = express();
const port = Number(process.env.PORT || 4000);
const appPublicUrl = process.env.APP_PUBLIC_URL || '';
const frontendUrl = process.env.FRONTEND_URL || appPublicUrl || 'http://localhost:3000';
const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
const corsOrigins = new Set([
  frontendUrl,
  'http://127.0.0.1:3000',
  ...String(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
]);
if (process.env.NODE_ENV !== 'production') {
  corsOrigins.add('http://localhost:3001');
  corsOrigins.add('http://127.0.0.1:3001');
}

app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors({ origin: [...corsOrigins], credentials: true }));
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !corsOrigins.has(origin)) {
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }
  return next();
});
app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  if (req.is('application/json') && (req.body === null || Array.isArray(req.body) || typeof req.body !== 'object')) {
    return res.status(400).json({ error: 'JSON request body must be an object.' });
  }
  return next();
});
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadsDir));
app.use('/api', rateLimit({ scope: 'api-global', windowMs: 60 * 1000, max: 300 }));

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'not connected', message: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/profiles', profileRoutes);
app.get('/api/dashboard/saved-profiles/:profileId/status', optionalAuth, asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findFirst({
    where: {
      status: 'APPROVED',
      OR: [{ id: req.params.profileId }, { slug: slugify(req.params.profileId) }]
    },
    select: { id: true }
  });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (!req.authUser) {
    return res.json({ data: { profileId: profile.id, saved: false, authenticated: false } });
  }

  const saved = await prisma.profileSave.findUnique({
    where: {
      profileId_userId: {
        profileId: profile.id,
        userId: req.authUser.id
      }
    }
  });
  res.json({ data: { profileId: profile.id, saved: Boolean(saved), authenticated: true } });
}));
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/admin/listings', requireAdmin, adminListingRoutes);
app.use('/api/admin/gallery', requireAdmin, adminGalleryRoutes);
app.use('/api/admin/reviews', requireAdmin, adminReviewRoutes);
app.use('/api/admin/insights', requireAdmin, adminInsightRoutes);
app.use('/api/admin/quotes', requireAdmin, adminQuoteRoutes);
app.use('/api/admin/billing', requireAdmin, adminBillingRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/seo', seoRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.use((error, _req, res, _next) => {
  const rawStatus = Number(error.statusCode || error.status || 500);
  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  if (status >= 500) {
    console.error(error);
  } else {
    console.warn(`[request:${status}] ${error.message}`);
  }
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : error.message,
    detail: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Backend API running at http://localhost:${port}`);
});

async function shutdown() {
  console.log('Shutting down backend...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
