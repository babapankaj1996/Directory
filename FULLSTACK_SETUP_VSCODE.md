# Full-Stack Directory Website Setup in VS Code

This project includes:

- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma
- Admin: `/admin`, `/admin/listings`, `/admin/countries`, `/admin/cities`, `/admin/categories`, `/admin/settings`

## 1. Required software

Install these before starting:

1. VS Code
2. Node.js LTS
3. Docker Desktop
4. Git, optional but recommended

Check installation:

```bash
node -v
npm -v
docker -v
```

## 2. Extract and open project

1. Extract the ZIP file.
2. Open VS Code.
3. Go to **File > Open Folder**.
4. Select the extracted folder: `luxury-directory-fullstack-postgres-prisma`.
5. Open VS Code terminal: **Terminal > New Terminal**.

## 3. Start PostgreSQL database

Run this from the root folder:

```bash
docker compose up -d postgres
```

Check container:

```bash
docker ps
```

PostgreSQL will run on:

```txt
localhost:5433
```

Database credentials:

```txt
Database: luxury_directory
Username: postgres
Password: postgres
Port: 5433
```

## 4. Install frontend dependencies

Run this in the root folder:

```bash
npm install
```

## 5. Install backend dependencies

Run:

```bash
npm run backend:install
```

## 6. Setup Prisma database

Run:

```bash
npm run backend:setup
```

This command does three things:

```txt
1. Generates Prisma Client
2. Creates PostgreSQL tables
3. Adds seed demo data
```

Seeded admin login:

```txt
Email: admin@example.com
Password: Admin@12345
```

Seeded business owner login:

```txt
Email: owner@example.com
Password: Owner@12345
```

Seeded review user login:

```txt
Email: reviewer@example.com
Password: Review@12345
```

Email verification and forgot-password links use SMTP when configured in `backend/.env`. In local development without SMTP, the backend writes the link to `backend-dev.out.log` and the auth screen shows a local link.

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="smtp-user"
SMTP_PASS="smtp-password"
SMTP_FROM="Directory <no-reply@example.com>"
```

## 7. Start backend API

Open terminal 1 and run:

```bash
npm run backend:dev
```

Backend API should run here:

```txt
http://localhost:4000/api/health
```

Open this URL in browser. You should see:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## 8. Start frontend

Open terminal 2 and run:

```bash
npm run dev
```

Frontend will run here:

```txt
http://localhost:3000
```

## 9. Test important URLs

```txt
Homepage:
http://localhost:3000

Login:
http://localhost:3000/login

Signup:
http://localhost:3000/signup

Forgot Password:
http://localhost:3000/forgot-password

Country Page:
http://localhost:3000/in

City Page:
http://localhost:3000/in/delhi

Category Page:
http://localhost:3000/in/delhi/astrologer

Profile Page:
http://localhost:3000/in/delhi/astrologer/aditya-pareek

Categories:
http://localhost:3000/categories

Blog:
http://localhost:3000/blog

Blog Detail:
http://localhost:3000/blog/best-astrologer-in-delhi

Admin:
http://localhost:3000/admin

Owner Dashboard:
http://localhost:3000/dashboard

Latest Listings:
http://localhost:3000/listings
```

## 10. Test backend APIs

```txt
Health:
http://localhost:4000/api/health

Countries:
http://localhost:4000/api/countries

Cities:
http://localhost:4000/api/cities

Categories:
http://localhost:4000/api/categories

Profiles:
http://localhost:4000/api/profiles

Profile by SEO Path:
http://localhost:4000/api/profiles/path/in/delhi/astrologer/aditya-pareek

Blog:
http://localhost:4000/api/blog

SEO:
http://localhost:4000/api/seo
```

## 11. Admin and owner workflows

Admin users manage listings, countries, cities, categories, SEO, blog, and settings from the admin sidebar.
Listing status changes, featured flags, rejection reasons, admin notes, and gallery images are managed from the listing pages.

Business owners can submit and manage one business profile from:

```txt
http://localhost:3000/dashboard
```

Owners can save an incomplete add-profile form as a draft. Draft listings stay hidden from public SEO pages, appear in the owner dashboard, and can be resumed later before submitting for admin review.

Review users can log in to post reviews on approved profile pages.
Review users also get a dashboard with saved profiles, the profiles they reviewed, review status, and quick links back to those public profile pages.
Owner country, city, category and slug fields are locked after the first submission so SEO URLs stay stable.

The owner add/edit flow changes its suggestions by category. Doctors can add consultation pricing, real estate agents can add commission/brokerage pricing, makeup artists can add event packages, and 18+ service categories can require age-gated booking and verification fields. The final services, pricing and business hours fields remain editable.

Local uploads are available for cover images, avatars/logos, gallery images and certificates. The upload fields show an in-place preview before saving. Uploaded files are optimized to WebP/AVIF and served by the backend from:

```txt
http://localhost:4000/uploads/images/...
```

Profile pages include direct WhatsApp links. Views, WhatsApp clicks, phone clicks and website clicks are tracked in insights:

```txt
Admin insights:
http://localhost:3000/admin

Owner insights:
http://localhost:3000/dashboard

Review user dashboard:
http://localhost:3000/dashboard
```

Profile pages also include a Request Quote form. New requests are saved as leads, emailed to the owner when SMTP is configured, and shown in the owner dashboard lead inbox:

```txt
POST /api/profiles/:profileId/leads
GET  /api/dashboard/leads
```

## 12. Run checks

Frontend type check:

```bash
npm run type-check
```

Frontend production build:

```bash
npm run build
```

Backend API smoke tests:

```bash
npm run test:api
```

Desktop and mobile browser smoke tests:

```bash
npm run test:smoke
```

Full site route, SEO, broken-link and responsive audit:

```bash
npm run test:site-audit
```

Dependency security audit:

```bash
npm audit --audit-level=moderate
npm audit --prefix backend --audit-level=moderate
```

## 13. Prisma Studio

To view and edit database tables visually:

```bash
npm run backend:studio
```

Then open Prisma Studio URL shown in terminal.

## 14. Common errors and fixes

### Error: Docker is not running

Open Docker Desktop and wait until it says Docker is running.

### Error: port 5433 already used

Change this line in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"
```

Example:

```yaml
ports:
  - "5434:5432"
```

Then update `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/luxury_directory?schema=public"
```

### Error: Prisma cannot connect

Run:

```bash
docker compose up -d postgres
npm run backend:setup
```

### Error: frontend cannot connect to backend

Check backend is running:

```txt
http://localhost:4000/api/health
```

## 15. Production notes

Before live launch:

1. Replace localhost URLs with the real production domain.
2. Configure durable image upload storage such as S3 or Cloudinary.
3. Set secure production values for `JWT_SECRET`, database credentials, and CORS origins.
4. Run Prisma migrations and seed only the production-safe baseline data.
5. Connect analytics, Search Console, and error monitoring.
6. Add payment gateway integration if featured listings are paid.
