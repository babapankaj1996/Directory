import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createSessionToken, optionalAuth } from '../utils/auth.js';
import { rateLimit } from '../utils/rate-limit.js';
import { publicMailStatus, sendPasswordResetEmail, sendVerificationEmail } from '../utils/mailer.js';

const router = Router();
const loginLimiter = rateLimit({ scope: 'auth-login', windowMs: 15 * 60 * 1000, max: 20 });
const signupLimiter = rateLimit({ scope: 'auth-signup', windowMs: 60 * 60 * 1000, max: 8 });
const passwordLimiter = rateLimit({ scope: 'auth-password', windowMs: 60 * 60 * 1000, max: 6 });
const SESSION_COOKIE = 'session_token';
const ADMIN_COOKIE = 'admin_token';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified
  };
}

function token() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenExpiry(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function includeDevLink(mailResult, url) {
  if (process.env.NODE_ENV === 'production') return undefined;
  if (mailResult?.delivered) return undefined;
  return mailResult?.actionUrl || url;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS
  };
}

function clearCookieOptions() {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  return options;
}

function cookieOnly(req) {
  return String(req.get('x-auth-mode') || '').toLowerCase() === 'cookie';
}

function setSessionCookies(res, user, sessionToken) {
  const options = sessionCookieOptions();
  res.cookie(SESSION_COOKIE, sessionToken, options);
  if (user.role === 'ADMIN') {
    res.cookie(ADMIN_COOKIE, sessionToken, options);
  } else {
    res.clearCookie(ADMIN_COOKIE, clearCookieOptions());
  }
}

function clearSessionCookies(res) {
  const options = clearCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
  res.clearCookie(ADMIN_COOKIE, options);
}

function authResponse(req, res, user, extras = {}) {
  const sessionToken = createSessionToken(user);
  setSessionCookies(res, user, sessionToken);
  return {
    data: publicUser(user),
    ...(cookieOnly(req) ? {} : { token: sessionToken }),
    ...extras
  };
}

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
  if (user.status !== 'ACTIVE') return res.status(403).json({ error: 'Account access denied' });

  res.json(authResponse(req, res, user));
}));

router.post('/signup', signupLimiter, asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const requestedRole = String(req.body.role || 'USER').trim().toUpperCase();
  const role = requestedRole === 'OWNER' ? 'OWNER' : 'USER';

  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const emailVerifyToken = token();
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      status: 'ACTIVE',
      emailVerified: false,
      emailVerifyToken,
      emailVerifyTokenExpiresAt: tokenExpiry(24)
    }
  });
  const verifyUrl = `${frontendUrl()}/login?verify=${emailVerifyToken}`;
  const mailResult = await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });

  res.status(201).json(authResponse(req, res, user, {
    verificationRequired: true,
    verificationLink: includeDevLink(mailResult, verifyUrl),
    mail: publicMailStatus(mailResult)
  }));
}));

router.post('/forgot-password', passwordLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email is required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const passwordResetToken = token();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetTokenExpiresAt: tokenExpiry(2)
      }
    });
    const resetUrl = `${frontendUrl()}/forgot-password?token=${passwordResetToken}`;
    const mailResult = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    if (!mailResult.delivered && process.env.NODE_ENV !== 'production') {
      return res.json({
        message: 'Password reset link generated. Email is in local log mode or SMTP failed.',
        resetLink: mailResult.actionUrl || resetUrl,
        mail: publicMailStatus(mailResult)
      });
    }
  }
  res.json({ message: 'If that email exists, reset instructions have been sent.' });
}));

router.post('/reset-password', passwordLimiter, asyncHandler(async (req, res) => {
  const resetToken = String(req.body.token || '').trim();
  const password = String(req.body.password || '');
  if (!resetToken || password.length < 8) return res.status(400).json({ error: 'Valid token and password with at least 8 characters are required.' });

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: resetToken,
      passwordResetTokenExpiresAt: { gt: new Date() }
    }
  });
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token.' });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null
    }
  });
  res.json({ message: 'Password updated.' });
}));

router.post('/verify-email', asyncHandler(async (req, res) => {
  const verifyToken = String(req.body.token || req.query.token || '').trim();
  if (!verifyToken) return res.status(400).json({ error: 'Verification token is required.' });
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: verifyToken,
      emailVerifyTokenExpiresAt: { gt: new Date() }
    }
  });
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token.' });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null
    }
  });
  res.json({ data: publicUser(updated), message: 'Email verified.' });
}));

router.post('/resend-verification', passwordLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required to resend verification.' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) {
    return res.json({ message: 'If that account needs verification, a new email has been sent.' });
  }

  const emailVerifyToken = token();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyToken,
      emailVerifyTokenExpiresAt: tokenExpiry(24)
    }
  });
  const verifyUrl = `${frontendUrl()}/login?verify=${emailVerifyToken}`;
  const mailResult = await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
  res.json({
    message: mailResult.delivered ? 'Verification email sent.' : 'Verification link generated. Email is in local log mode or SMTP failed.',
    verificationLink: includeDevLink(mailResult, verifyUrl),
    mail: publicMailStatus(mailResult)
  });
}));

router.get('/me', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.authUser) return res.json({ data: null, authenticated: false });
  res.json({ data: req.authUser, authenticated: true });
}));

router.post('/logout', (_req, res) => {
  clearSessionCookies(res);
  res.json({ message: 'Logged out.' });
});

export default router;
