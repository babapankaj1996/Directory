# Backend API Endpoints

Base URL:

```txt
http://localhost:4000/api
```

## Health

```http
GET /health
```

## Auth

```http
POST /auth/login
```

Body:

```json
{
  "email": "admin@example.com",
  "password": "Admin@12345"
}
```

## Countries

```http
GET /countries
GET /countries/:code
POST /countries
PUT /countries/:code
DELETE /countries/:code
POST /countries/:code/cities
```

## Cities

```http
GET /cities
GET /cities?countryCode=in
GET /cities/:id
POST /cities
PUT /cities/:id
DELETE /cities/:id
```

## Categories

```http
GET /categories
GET /categories/:slug
POST /categories
PUT /categories/:slug
DELETE /categories/:slug
```

## Profiles

```http
GET /profiles
GET /profiles?country=in&city=delhi&category=astrologer
GET /profiles/:idOrSlug
GET /profiles/path/:country/:city/:category/:profile
GET /profiles/:profileId/gallery
GET /profiles/:profileId/reviews
POST /profiles/:profileId/view
POST /profiles/:profileId/insights
POST /profiles
PUT /profiles/:idOrSlug
DELETE /profiles/:idOrSlug
```

Correct SEO profile URL data endpoint:

```txt
http://localhost:4000/api/profiles/path/in/delhi/astrologer/aditya-pareek
```

Insight body:

```json
{
  "type": "WHATSAPP_CLICK"
}
```

Allowed contact insight types:

```txt
WHATSAPP_CLICK
PHONE_CLICK
WEBSITE_CLICK
CONTACT_CLICK
```

## Uploads

```http
POST /uploads/image
```

Multipart form data:

```txt
file=<image file>
type=cover | avatar | gallery | certificate | document
```

Requires an owner or admin bearer token.

## Admin

```http
GET /admin/listings
GET /admin/listings/:id
PATCH /admin/listings/:id/status
PATCH /admin/listings/:id/featured
GET /admin/listings/featured-requests
PATCH /admin/listings/featured-requests/:requestId/status
GET /admin/listings/:id/gallery
POST /admin/listings/:id/gallery
PUT /admin/gallery/:galleryId
DELETE /admin/gallery/:galleryId
GET /admin/reviews
PATCH /admin/reviews/:id/status
GET /admin/insights
```

## Owner Dashboard

```http
GET /dashboard/listings
GET /dashboard/insights
PUT /dashboard/listings/:id
POST /dashboard/listings/:id/gallery
```

## Review User Dashboard

```http
GET /dashboard/reviews
GET /dashboard/saved-profiles
GET /dashboard/saved-profiles/:profileId/status
POST /dashboard/saved-profiles/:profileId
DELETE /dashboard/saved-profiles/:profileId
```

## Blog

```http
GET /blog
GET /blog/:slug
POST /blog
PUT /blog/:slug
DELETE /blog/:slug
```

## SEO Metadata

```http
GET /seo
GET /seo?path=/in/delhi/astrologer
POST /seo
PUT /seo/:id
DELETE /seo/:id
```
