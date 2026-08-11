import { PrismaClient } from '@prisma/client';

function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.hostname.endsWith('.pooler.supabase.com')) {
      if (!url.searchParams.has('connection_limit')) {
        const configuredLimit = Number(process.env.DB_CONNECTION_LIMIT || 5);
        url.searchParams.set('connection_limit', String(Math.min(Math.max(configuredLimit, 1), 10)));
      }
      if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma = new PrismaClient({
  datasourceUrl: databaseUrl(),
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
