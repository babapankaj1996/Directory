# Luxury Directory Full-Stack Website

A responsive SEO-friendly directory website with a luxury light glassmorphism UI.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Node.js + Express
- PostgreSQL
- Prisma ORM
- Docker Compose

## Correct SEO URL Structure

```txt
/                                      Homepage
/login                                 Login
/signup                                Signup
/forgot-password                       Forgot Password
/in                                    Country page
/in/delhi                              City page
/in/delhi/astrologer                   Category page
/in/delhi/astrologer/aditya-pareek     Profile page
/categories                            All categories
/blog                                  Blog listing
/blog/best-astrologer-in-delhi         Blog detail
/admin                                 Admin panel
/admin/listings                        Listing approval and gallery manager
/admin/listings/aditya-pareek          Listing review detail
/admin/quotes                          Admin quote request inbox
```

## Start Quickly

```bash
docker compose up -d postgres
npm install
npm run backend:install
npm run backend:setup
npm run backend:dev
```

Open a second terminal:

```bash
npm run dev
```

Frontend:

```txt
http://localhost:3000
```

Backend:

```txt
http://localhost:4000/api/health
```

## Import Countries And Cities

The normal seed keeps the demo data small. To import the maintained `country-state-city` location dataset into the database, run:

```bash
npm run backend:locations:import
```

New countries and cities are created as `DRAFT` by default, while existing statuses are preserved. This keeps thousands of empty public city/category URLs out of the sitemap until an admin activates the needed locations. Useful options:

```bash
npm run backend:locations:import --dry-run
npm run backend:locations:import -- --countries=IN,US
npm run backend:locations:import -- --country-status=ACTIVE --city-status=DRAFT
```

Admin Listing Manager:

```txt
http://localhost:3000/admin/listings
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

Set the same `ADMIN_JWT_SECRET` in `backend/.env` and root `.env.local` before running outside local development. Admin pages verify the `admin_token` cookie in middleware, and protected backend write APIs require `Authorization: Bearer <token>`.

## Verification Email

Signup, resend verification and forgot-password now send real email when SMTP is configured in `backend/.env`:

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="smtp-user"
SMTP_PASS="smtp-password"
SMTP_FROM="Directory <no-reply@example.com>"
```

For local development, if SMTP is not configured, the backend logs the verification/reset URL in `backend-dev.out.log` and the auth screen shows a local link. Use `MAIL_DELIVERY=log` to force console-only delivery while testing.

## Registered User Profile Submission

`/dashboard/add-profile` is protected. Anonymous visitors who click Add Profile are sent to the clean `/signup` page. A short-lived signup intent cookie preselects Business Owner and returns them to the listing flow after signup.

```txt
/signup                 Create a Review User or Business Owner account
/login                  Login as user or admin
/dashboard/add-profile  Step-by-step registered user listing submission
/dashboard              Listing poster dashboard
```

Review User accounts can post reviews on approved profiles, save profiles with the heart button, send quote requests, and manage their shortlist/review/quote history from `/dashboard`. Business Owner accounts can submit one business profile and manage that profile from `/dashboard`. Owners can save an incomplete listing as `DRAFT`, resume it later, and submit it as `PENDING` when complete. Draft and pending profiles stay hidden from public SEO pages until an admin approves them. Country, city, category and slug are locked after submission to keep SEO URLs stable.

The add/edit profile flow is category-aware. After a category is selected, the details step shows matching service chips, pricing modes, and timing presets. Examples:

```txt
Beauty & Spa      fixed service, hourly spa, package pricing
Real Estate       brokerage/commission, fixed advisory, management packages
Healthcare        consultation, health package, therapy hourly pricing
Restaurants       meal-for-two, per-person, event package pricing
Consultants       hourly, session, retainer, project pricing
```

Owners can still edit the final services, pricing and business hours text manually before saving. 18+ categories keep the same Add Profile flow, but the details step switches to adult-specific fields for age, availability, booking type, minimum duration, orientation, height, body type, ethnicity, languages and rates/donation rows.

## Listing Approval Workflow

New completed listings are created as `PENDING` by default. Incomplete owner submissions can be saved as `DRAFT`. Public profile/category APIs only return `APPROVED` listings, so draft, pending, rejected and suspended submissions are hidden from SEO pages.

Admin review pages:

```txt
/admin/listings
/admin/listings?status=DRAFT
/admin/listings?status=PENDING
/admin/listings?status=APPROVED
/admin/listings/[slug]
```

Admin actions include approve, reject with reason, suspend, mark featured, remove featured and delete. Featured listings use `isFeatured` separately from approval status and include `featuredUntil` expiry. Public pages only promote listings while the featured campaign is active; expired featured listings automatically return to normal ranking.

## Featured Listing Placement

Featured listings are treated as a visibility product, not a separate SEO URL. The same profile URL stays canonical.

```txt
Admin: review featured requests, approve/reject requests, mark featured, set expiry date, extend placement, remove featured
Owner: view featured status, expiry, views, quote requests, and request featured placement for 7, 15 or 30 days
Public: active featured listings appear first on listing, city and category pages
```

When admin marks a listing featured without a date, the backend defaults the campaign to 30 days. Owners can request featured placement from `/dashboard`, choose the requested duration and choose the preferred page (`/listings`, city page, category page, or all current featured surfaces). The request is stored for admin review on existing listing pages and is also emailed/logged depending on SMTP configuration. Set `ADMIN_FEATURED_EMAIL` for featured placement request recipients, otherwise the backend falls back to `ADMIN_EMAIL` and then `SMTP_USER`.

## 18+ Age-Restricted Categories

18+ services use the same SEO URL structure as normal categories and profiles, but they are isolated from normal discovery until a visitor confirms age.

```txt
/in/delhi/rent-a-girlfriend
/in/delhi/rent-a-girlfriend/delhi-social-companions
```

Normal homepage/search/category discovery excludes 18+ categories by default. The homepage and category explorer show an `18+ Services` box; after the visitor confirms they are 18 or older, adult categories such as female escorts, male escorts, trans escorts, rent a girlfriend, rent a boyfriend and massage services are revealed. Direct adult category/profile URLs remain indexable, use canonical metadata, are included in the sitemap when approved/indexable, and include the adult rating meta tag.

Owner submission rules for 18+ categories:

```txt
Legal 18+ confirmation is required
Government ID upload is required
Latest photo holding DOB paper is required
Listing status stays PENDING until admin review
Verification status starts as PENDING
```

Verification uploads use the private endpoint below and are not served from public gallery paths:

```txt
POST /api/uploads/verification-document
GET  /api/uploads/private/:fileName    Admin only
```

Admin manages 18+ categories from `/admin/categories` and 18+ listings from `/admin/listings` using the Adult and Verification Pending filters. On `/admin/listings/[slug]`, admins can review private documents, mark each document pending/verified/rejected, and set the listing verification status. Approved but unverified 18+ profiles stay public and indexable, but show a clear public note: `Not ID verified`.

## Gallery Management

Each profile can have gallery media in these categories:

```txt
All, Gallery, Videos, Interior, Office, Team, Certificates, Work Photos
```

Public profile pages show the cover image, avatar/logo, categorized gallery grid and lightbox. Each profile can have up to 10 public gallery media items total. Business owners can add gallery/certificate images or gallery videos from the add/edit profile flow until the limit is reached; admins can add, edit and delete gallery media from `/admin/listings/[slug]`.

Backend gallery endpoints:

```txt
GET    /api/profiles/:profileId/gallery
GET    /api/admin/listings/:id/gallery
POST   /api/admin/listings/:id/gallery
PUT    /api/admin/gallery/:galleryId
DELETE /api/admin/gallery/:galleryId
```

## Uploads, WhatsApp and Insights

Owners and admins can upload local images for cover, avatar/logo, gallery photos and certificates. Gallery uploads also accept MP4, WebM and MOV video files. Upload fields show an immediate in-place preview, then switch to the backend URL after upload. The backend stores optimized local WebP/AVIF assets under `backend/uploads/images`, gallery videos under `backend/uploads/videos`, and serves both from `/uploads`.

```txt
POST /api/uploads/image
```

Public profile pages include direct Call, WhatsApp and Website actions. WhatsApp opens a prefilled `wa.me` message, and profile views/contact actions are tracked as insight events.

## Lead / Request Quote System

Approved public profile pages include a Request Quote form. Visitors can submit name, phone, optional email/WhatsApp, service needed, budget, timeline, preferred contact method, preferred date/time and message. Leads are scored as `HOT`, `WARM`, or `COLD`, rate-limited, stored against the profile, hidden from public pages, and emailed to the listing owner when SMTP is configured. If the visitor is logged in as a review user, the request is also linked to their account so they can track the latest status from `/dashboard`.

```txt
POST  /api/profiles/:profileId/leads
GET   /api/dashboard/quote-requests
GET   /api/dashboard/leads
GET   /api/dashboard/leads/quality
PATCH /api/dashboard/leads/:id/status
GET   /api/admin/quotes
GET   /api/admin/quotes/quality
PATCH /api/admin/quotes/:id/status
```

Owner lead statuses:

```txt
NEW
CONTACTED
CONVERTED
LOST
SPAM
```

Owners manage quote requests and the 30-day lead quality dashboard from `/dashboard`. Admins can view every quote request from `/admin/quotes`, filter/search the inbox, see lead score, source page, response time, conversion rate and view-to-lead rate, and update request status. New quote request emails are sent to the listing owner and copied to `ADMIN_LEAD_EMAIL`; if that variable is not set, the backend falls back to `ADMIN_EMAIL` and then `SMTP_USER`.

Insight dashboards:

```txt
/admin                      Admin sees total views, 30-day views, WhatsApp, call and website clicks
/dashboard                  Business owner sees their own views, WhatsApp, call and website clicks
/dashboard                  Review user sees saved profiles, review moderation history and sent quote requests
GET /api/admin/insights     Admin insight summary
GET /api/dashboard/insights Owner insight summary
POST /api/profiles/:id/insights
```

Reviewer dashboard endpoints:

```txt
GET    /api/dashboard/reviews
GET    /api/dashboard/quote-requests
GET    /api/dashboard/saved-profiles
GET    /api/dashboard/saved-profiles/:profileId/status
POST   /api/dashboard/saved-profiles/:profileId
DELETE /api/dashboard/saved-profiles/:profileId
```

Important public SEO routes remain unchanged:

```txt
/in/delhi/astrologer
/in/delhi/astrologer/aditya-pareek
```

Full setup guide:

```txt
FULLSTACK_SETUP_VSCODE.md
```

## Verification Commands

```bash
npm run type-check
npm run build
npm run test:api
npm run test:smoke
npm run test:site-audit
npm audit --audit-level=moderate
npm audit --prefix backend --audit-level=moderate
```

`test:site-audit` crawls sitemap/public pages plus admin and owner pages on desktop and mobile. It checks broken internal links, HTTP failures, console/page errors, duplicate canonical tags, canonical origin mismatch, protected route redirects, and horizontal overflow.
