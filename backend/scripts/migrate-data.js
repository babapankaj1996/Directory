import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const sourceUrl = String(process.env.SOURCE_DATABASE_URL || '').trim();
const targetUrl = String(process.env.DATABASE_URL || '').trim();

if (!sourceUrl || !targetUrl) {
  throw new Error('SOURCE_DATABASE_URL and DATABASE_URL are required.');
}
if (sourceUrl === targetUrl) {
  throw new Error('Source and target database URLs must be different.');
}

const source = new PrismaClient({ datasourceUrl: sourceUrl });
const target = new PrismaClient({ datasourceUrl: targetUrl });
const demoEmails = new Set(['admin@example.com', 'owner@example.com', 'reviewer@example.com']);

const models = [
  'country',
  'city',
  'category',
  'user',
  'featuredPlacementPrice',
  'appSetting',
  'blogPost',
  'seoMeta',
  'profile',
  'profileVerificationDocument',
  'profileLead',
  'profileReview',
  'profileGallery',
  'profileStatusHistory',
  'profileInsightEvent',
  'profileSave',
  'featuredPlacementRequest',
  'featuredPlacementCampaign',
  'userWallet',
  'walletTransaction',
  'featuredPayment'
];

async function main() {
  let existingRecords = 0;
  for (const model of models) {
    existingRecords += await target[model].count();
  }
  if (existingRecords > 0) {
    throw new Error(`Target database is not empty (${existingRecords} application records found).`);
  }

  const records = new Map();
  for (const model of models) {
    records.set(model, await source[model].findMany());
  }

  const replacementPasswordHash = await bcrypt.hash(randomBytes(48).toString('base64url'), 12);
  const disabledDemoAccounts = records.get('user').filter((user) => demoEmails.has(user.email.toLowerCase())).length;
  records.set(
    'user',
    records.get('user').map((user) => {
      if (!demoEmails.has(user.email.toLowerCase())) return user;
      return {
        ...user,
        passwordHash: replacementPasswordHash,
        status: 'DISABLED',
        emailVerified: false,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null
      };
    })
  );

  await target.$transaction(
    async (transaction) => {
      for (const model of models) {
        const data = records.get(model);
        if (data.length > 0) await transaction[model].createMany({ data });
      }
    },
    { maxWait: 20_000, timeout: 120_000 }
  );

  const summary = Object.fromEntries(models.map((model) => [model, records.get(model).length]));
  console.log(JSON.stringify({ migrated: summary, disabledDemoAccounts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([source.$disconnect(), target.$disconnect()]);
  });
