# VS Code Setup Guide — Luxury Directory Next.js Website

This guide explains every step to run this project in VS Code.

---

## 1. What is included

This is a responsive, SEO-friendly directory website starter built with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide Icons
- Light luxury glassmorphism UI
- Public directory pages
- Admin management section

---

## 2. Final URL structure

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

/dashboard/add-profile                 Public add profile page
/dashboard/edit-profile                Public edit profile page

/admin                                 Admin overview
/admin/countries                       Manage countries
/admin/cities                          Manage cities
/admin/categories                      Manage categories
/admin/profiles                        Manage profiles
/admin/profiles/new                    Add new profile from admin
/admin/profiles/aditya-pareek/edit     Edit profile from admin
/admin/blog                            Manage blog posts
/admin/seo                             Manage SEO metadata
/admin/settings                        Global website settings
```

Important SEO profile URL:

```txt
/in/delhi/astrologer/aditya-pareek
```

---

## 3. Install required software

### A. Install VS Code

Download and install Visual Studio Code.

### B. Install Node.js

Install Node.js LTS version.

Recommended:

```txt
Node.js 20 LTS or Node.js 22 LTS
```

After installing Node.js, restart VS Code.

### C. Check installation

Open terminal and run:

```bash
node -v
npm -v
```

You should see version numbers.

---

## 4. Extract and open the project

1. Extract the ZIP file.
2. Open VS Code.
3. Click **File > Open Folder**.
4. Select the folder named:

```txt
luxury-directory-nextjs
```

Do not open the parent ZIP folder. Open the actual project folder where `package.json` exists.

---

## 5. Install project packages

In VS Code terminal, run:

```bash
npm install
```

This will install Next.js, React, Tailwind CSS, Lucide icons and TypeScript.

---

## 6. Run the website locally

After installation, run:

```bash
npm run dev
```

Then open this in browser:

```txt
http://localhost:3000
```

---

## 7. Test important pages

Open these URLs one by one:

```txt
http://localhost:3000/
http://localhost:3000/login
http://localhost:3000/signup
http://localhost:3000/forgot-password

http://localhost:3000/in
http://localhost:3000/in/delhi
http://localhost:3000/in/delhi/astrologer
http://localhost:3000/in/delhi/astrologer/aditya-pareek

http://localhost:3000/categories
http://localhost:3000/blog
http://localhost:3000/blog/best-astrologer-in-delhi

http://localhost:3000/admin
http://localhost:3000/admin/countries
http://localhost:3000/admin/cities
http://localhost:3000/admin/categories
http://localhost:3000/admin/profiles
http://localhost:3000/admin/profiles/new
http://localhost:3000/admin/profiles/aditya-pareek/edit
http://localhost:3000/admin/blog
http://localhost:3000/admin/seo
http://localhost:3000/admin/settings
```

---

## 8. Run TypeScript check

Use this command:

```bash
npm run type-check
```

If it shows no errors, TypeScript is okay.

---

## 9. Run production build

Before deployment, run:

```bash
npm run build
```

Then run production server:

```bash
npm run start
```

Open:

```txt
http://localhost:3000
```

---

## 10. Where to edit data

All demo data is inside:

```txt
lib/data.ts
```

Edit this file for:

- Categories
- Profiles
- Countries
- Cities
- Blog posts
- Admin demo data

Profile URL is generated from:

```txt
country + city + categorySlug + profile slug
```

Example:

```txt
country: in
city: delhi
categorySlug: astrologer
slug: aditya-pareek

Final URL:
/in/delhi/astrologer/aditya-pareek
```

---

## 11. Important route files

Category page route:

```txt
app/[country]/[city]/[category]/page.tsx
```

Profile page route:

```txt
app/[country]/[city]/[category]/[profile]/page.tsx
```

Admin layout:

```txt
app/admin/layout.tsx
```

Admin pages:

```txt
app/admin/page.tsx
app/admin/countries/page.tsx
app/admin/cities/page.tsx
app/admin/categories/page.tsx
app/admin/profiles/page.tsx
app/admin/profiles/new/page.tsx
app/admin/profiles/[profile]/edit/page.tsx
app/admin/blog/page.tsx
app/admin/seo/page.tsx
app/admin/settings/page.tsx
```

---

## 12. SEO files

Sitemap file:

```txt
app/sitemap.ts
```

Robots file:

```txt
app/robots.ts
```

Admin pages are blocked from indexing in `robots.ts` and admin layout metadata.

Change this demo domain before launch:

```txt
https://example.com
```

Update it in:

```txt
app/layout.tsx
app/sitemap.ts
app/robots.ts
```

---

## 13. How to change design colors

Open:

```txt
tailwind.config.ts
```

Main colors:

```txt
champagne
ink
muted
cloud
pearl
```

Global glass effect CSS:

```txt
app/globals.css
```

---

## 14. Common errors and fixes

### Error: npm is not recognized

Restart your computer after installing Node.js.

### Error: port 3000 already in use

Run:

```bash
npm run dev -- -p 3001
```

Then open:

```txt
http://localhost:3001
```

### Error after editing code

Stop the server with:

```bash
Ctrl + C
```

Then run again:

```bash
npm run dev
```

### Delete cache if build behaves strangely

```bash
rm -rf .next
npm run dev
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

---

## 15. Backend note

This project currently includes complete frontend UI and route structure. The admin buttons and forms are ready for backend connection.

For real database/admin functionality, connect later with:

- Node.js / NestJS backend
- PostgreSQL database
- Prisma ORM
- Auth.js / NextAuth or custom JWT login
- Cloudinary / S3 for image upload

