# Directory Frontend

Next.js frontend for the Directory platform. The Express and Prisma API is maintained separately in [Backend-Directory](https://github.com/babapankaj1996/Backend-Directory).

## Local Setup

```bash
npm ci
```

Create `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
APP_PUBLIC_URL=http://127.0.0.1:3000
BACKEND_API_URL=http://127.0.0.1:4000
ADMIN_JWT_SECRET=the-same-secret-used-by-the-backend
```

Start the standalone backend first, then run:

```bash
npm run dev
```

Browser requests use same-origin `/api` and `/uploads` routes. Next.js proxies those requests to the server-only `BACKEND_API_URL`, so the backend address is not exposed as a public frontend configuration variable.

## Hostinger

```text
Repository: babapankaj1996/Directory
Branch: main
Root directory: ./
Framework: Next.js
Node version: 22.x
Build command: npm run build
Start command: npm start
```

Required frontend environment variables:

```env
NEXT_PUBLIC_APP_URL=https://lightskyblue-ferret-333236.hostingersite.com
APP_PUBLIC_URL=https://lightskyblue-ferret-333236.hostingersite.com
BACKEND_API_URL=https://peachpuff-donkey-924736.hostingersite.com
ADMIN_JWT_SECRET=the-same-long-random-secret-used-by-the-backend
```

Do not configure `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKEND_PORT`, `EMBEDDED_BACKEND`, or `NEXT_PUBLIC_BACKEND_API_URL` in this frontend application.

## Checks

```bash
npm run type-check
npm run lint
npm run build
npm run test:smoke
npm audit --omit=dev
```

`test:site-audit` can crawl a running production build using `SITE_AUDIT_BASE_URL`.
