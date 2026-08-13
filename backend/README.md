# Directory Backend

Standalone Express and Prisma API for the Directory frontend.

## Requirements

- Node.js 22
- PostgreSQL or Supabase Postgres
- A matching `ADMIN_JWT_SECRET` in the frontend deployment

## Local Setup

```bash
npm ci
cp .env.example .env
npm run prisma:migrate:deploy
npm start
```

The API listens on `PORT` and defaults to `4000` locally. Check readiness at:

```text
http://127.0.0.1:4000/api/health
```

## Required Environment

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public&sslmode=require
APP_PUBLIC_URL=https://lightskyblue-ferret-333236.hostingersite.com
FRONTEND_URL=https://lightskyblue-ferret-333236.hostingersite.com
CORS_ORIGINS=https://lightskyblue-ferret-333236.hostingersite.com
BACKEND_PUBLIC_URL=https://peachpuff-donkey-924736.hostingersite.com
ADMIN_JWT_SECRET=replace-with-a-long-random-secret
```

Use `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` for durable public and private upload storage. Never expose the service-role key through a `NEXT_PUBLIC_` variable.

## Hostinger

```text
Repository: babapankaj1996/Backend-Directory
Branch: main
Root directory: ./
Framework: Express
Node version: 22.x
Entry file: scripts/start-production.js
Build command: empty
Output directory: empty
```

`postinstall` generates Prisma Client and applies committed migrations with retry handling. The runtime entry calls `listen()` immediately to satisfy Hostinger's LiteSpeed launcher.

## Checks

```bash
npm run syntax-check
npm audit --omit=dev
API_BASE=http://127.0.0.1:4000 npm run test:api
TEST_BASE_URL=https://your-frontend.example npm run test:security
```

The production security and browser tests create temporary database records and delete them afterward. See [API_ENDPOINTS.md](API_ENDPOINTS.md) for the route reference.
