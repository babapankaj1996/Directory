import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

const TOKEN_TTL_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_JWT_SECRET or JWT_SECRET must be configured in production.');
  }
  return 'local-development-admin-secret';
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64url(input) {
  const padded = `${input}${'='.repeat((4 - input.length % 4) % 4)}`;
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function signPayload(encodedPayload) {
  return crypto.createHmac('sha256', secret()).update(encodedPayload).digest('base64url');
}

export function createSessionToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function createAdminToken(user) {
  return createSessionToken(user);
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(fromBase64url(encodedPayload));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.status !== 'ACTIVE') return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAdminToken(token) {
  const payload = verifySessionToken(token);
  if (!payload || payload.role !== 'ADMIN') return null;
  return payload;
}

function parseCookies(header = '') {
  return String(header || '').split(';').reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName || rawValue.length === 0) return cookies;
    try {
      cookies[rawName] = decodeURIComponent(rawValue.join('='));
    } catch {
      cookies[rawName] = rawValue.join('=');
    }
    return cookies;
  }, {});
}

function bearerToken(req) {
  const header = req.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  const cookies = parseCookies(req.get('cookie'));
  return req.get('x-admin-token') ||
    req.get('x-session-token') ||
    cookies.admin_token ||
    cookies.session_token;
}

function sessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified
  };
}

export async function optionalAuth(req, _res, next) {
  try {
    const payload = verifySessionToken(bearerToken(req));
    if (!payload) return next();

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.status === 'ACTIVE') {
      req.authUser = sessionUser(user);
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function requireAuth(req, res, next) {
  try {
    const payload = verifySessionToken(bearerToken(req));
    if (!payload) return res.status(401).json({ error: 'Authentication required' });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account access denied' });
    }

    req.authUser = sessionUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(req, res, next) {
  return requireAuth(req, res, (error) => {
    if (error) return next(error);
    if (!req.authUser || req.authUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    req.adminUser = req.authUser;
    return next();
  });
}
