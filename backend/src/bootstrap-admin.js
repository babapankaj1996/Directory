import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';

const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '');
const name = String(process.env.ADMIN_BOOTSTRAP_NAME || 'Directory Admin').trim().slice(0, 100);
const rotatePassword = String(process.env.ADMIN_BOOTSTRAP_ROTATE_PASSWORD || '').toLowerCase() === 'true';

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value) {
  return value.length >= 14 && value.length <= 128 && /[a-z]/i.test(value) && /\d/.test(value);
}

async function main() {
  if (!email && !password) return;
  if (!email || !password) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be configured together.');
  }
  if (!validEmail(email)) throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email address.');
  if (!validPassword(password)) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be 14-128 characters and contain letters and numbers.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: name || 'Directory Admin',
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true
      }
    });
    console.log(`Created the initial admin account for ${email}. Remove ADMIN_BOOTSTRAP_PASSWORD after deployment.`);
    return;
  }

  if (existing.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true
      }
    });
    console.log(`Promoted the configured bootstrap account ${email} to admin. Remove ADMIN_BOOTSTRAP_PASSWORD after deployment.`);
    return;
  }

  if (rotatePassword || existing.status !== 'ACTIVE') {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        passwordHash: await bcrypt.hash(password, 12),
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null
      }
    });
    console.log(`Activated the configured admin account for ${email}. Remove ADMIN_BOOTSTRAP_PASSWORD and ADMIN_BOOTSTRAP_ROTATE_PASSWORD after deployment.`);
    return;
  }

  console.log(`Admin account ${email} already exists; its password was not changed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
