import { chromium } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || "http://localhost:4000";
const base = new URL(BASE_URL);

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];

const publicExtraRoutes = [
  "/",
  "/categories",
  "/listings",
  "/login",
  "/signup",
  "/forgot-password",
  "/blog",
  "/blog/best-astrologer-in-delhi",
  "/blog/how-to-choose-premium-service-provider",
  "/in",
  "/in/delhi",
  "/in/delhi/astrologer",
  "/in/delhi/astrologer/aditya-pareek"
];

const adminRoutes = [
  "/admin",
  "/admin/featured-requests",
  "/admin/wallet",
  "/admin/listings",
  "/admin/listings/aditya-pareek",
  "/admin/quotes",
  "/admin/reviews",
  "/admin/verification",
  "/admin/categories",
  "/admin/countries",
  "/admin/cities",
  "/admin/blog",
  "/admin/seo",
  "/admin/settings",
  "/admin/profiles",
  "/admin/profiles/new",
  "/admin/profiles/aditya-pareek/edit"
];

const ownerRoutes = [
  "/dashboard",
  "/dashboard/profile/aditya-pareek",
  "/dashboard/add-profile",
  "/dashboard/edit-profile?listing=aditya-pareek"
];

const reviewerRoutes = [
  "/dashboard"
];

function routeUrl(route) {
  return new URL(route, BASE_URL).toString();
}

function normalizeInternalHref(href) {
  if (!href || href.startsWith("#")) return undefined;
  if (/^(mailto|tel|sms|javascript):/i.test(href)) return undefined;
  const url = new URL(href, BASE_URL);
  if (url.origin !== base.origin) return undefined;
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api")) return undefined;
  return `${url.pathname}${url.search}`;
}

function shouldIgnoreConsole(text) {
  return [
    "Download the React DevTools",
    "Open Next.js Dev Tools"
  ].some((needle) => text.includes(needle));
}

async function login(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok || !payload.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(payload)}`);
  return payload.token;
}

async function sitemapRoutes() {
  const response = await fetch(routeUrl("/sitemap.xml"));
  if (!response.ok) throw new Error(`Sitemap failed: ${response.status}`);
  const xml = await response.text();
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const duplicates = locations.filter((item, index) => locations.indexOf(item) !== index);
  if (duplicates.length) throw new Error(`Duplicate sitemap URLs: ${[...new Set(duplicates)].join(", ")}`);
  return locations
    .map((location) => normalizeInternalHref(location))
    .filter(Boolean);
}

async function makeContext(browser, viewport, token, admin = false) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  if (token) {
    await context.addCookies([
      { name: "session_token", value: token, url: BASE_URL, sameSite: "Lax" },
      ...(admin ? [{ name: "admin_token", value: token, url: BASE_URL, sameSite: "Lax" }] : [])
    ]);
  }
  return context;
}

async function checkPage(context, route, viewportName, options = {}) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !shouldIgnoreConsole(message.text())) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const url = routeUrl(route);
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

  const status = response?.status() || 0;
  const finalUrl = page.url();
  if (status >= 400) throw new Error(`${viewportName} ${route} returned HTTP ${status}`);
  if (options.mustStayOnRoute && new URL(finalUrl).pathname !== new URL(url).pathname) {
    throw new Error(`${viewportName} ${route} redirected to ${finalUrl}`);
  }
  if (consoleErrors.length) throw new Error(`${viewportName} ${route} console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  if (pageErrors.length) throw new Error(`${viewportName} ${route} page errors: ${pageErrors.slice(0, 3).join(" | ")}`);

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth;
  });
  if (overflow > 4) throw new Error(`${viewportName} ${route} has horizontal overflow of ${overflow}px`);

  const canonicalHrefs = await page.locator('link[rel="canonical"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") || ""));
  if (canonicalHrefs.length > 1) throw new Error(`${viewportName} ${route} has duplicate canonical tags`);
  if (options.expectCanonical && canonicalHrefs.length === 1) {
    const canonical = new URL(canonicalHrefs[0], BASE_URL);
    if (canonical.origin !== base.origin) throw new Error(`${viewportName} ${route} canonical origin mismatch: ${canonical.href}`);
  }

  const links = await page.locator("a[href]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") || ""));
  await page.close();
  return links.map(normalizeInternalHref).filter(Boolean);
}

async function checkLinks(context, routes, groupName) {
  const unique = [...new Set(routes)].sort();
  const broken = [];
  for (const route of unique) {
    const response = await context.request.get(routeUrl(route), { maxRedirects: 5, timeout: 15_000 }).catch((error) => ({ status: () => 0, error }));
    const status = response.status();
    if (status >= 400 || status === 0) broken.push(`${route} -> ${status || response.error?.message}`);
  }
  if (broken.length) throw new Error(`${groupName} broken links:\n${broken.join("\n")}`);
}

async function run() {
  const browser = await chromium.launch({ channel: "chrome" });
  const adminToken = await login("admin@example.com", "Admin@12345");
  const ownerToken = await login("owner@example.com", "Owner@12345");
  const reviewerToken = await login("reviewer@example.com", "Review@12345");
  const sitemap = await sitemapRoutes();
  const publicRoutes = [...new Set([...publicExtraRoutes, ...sitemap])].sort();
  const seoRoutes = new Set(sitemap);
  const failures = [];

  for (const viewport of viewports) {
    const publicContext = await makeContext(browser, viewport);
    const publicLinks = [];
    for (const route of publicRoutes) {
      try {
        publicLinks.push(...await checkPage(publicContext, route, viewport.name, { expectCanonical: seoRoutes.has(route) }));
      } catch (error) {
        failures.push(error.message);
      }
    }
    try {
      await checkLinks(publicContext, publicLinks, `${viewport.name} public`);
    } catch (error) {
      failures.push(error.message);
    }
    await publicContext.close();

    const adminContext = await makeContext(browser, viewport, adminToken, true);
    const adminLinks = [];
    for (const route of adminRoutes) {
      try {
        adminLinks.push(...await checkPage(adminContext, route, viewport.name, { mustStayOnRoute: true }));
      } catch (error) {
        failures.push(error.message);
      }
    }
    try {
      await checkLinks(adminContext, adminLinks.filter((route) => route.startsWith("/admin")), `${viewport.name} admin`);
    } catch (error) {
      failures.push(error.message);
    }
    await adminContext.close();

    const ownerContext = await makeContext(browser, viewport, ownerToken);
    const ownerLinks = [];
    for (const route of ownerRoutes) {
      try {
        ownerLinks.push(...await checkPage(ownerContext, route, viewport.name, { mustStayOnRoute: true }));
      } catch (error) {
        failures.push(error.message);
      }
    }
    try {
      await checkLinks(ownerContext, ownerLinks.filter((route) => route.startsWith("/dashboard")), `${viewport.name} owner`);
    } catch (error) {
      failures.push(error.message);
    }
    await ownerContext.close();

    const reviewerContext = await makeContext(browser, viewport, reviewerToken);
    const reviewerLinks = [];
    for (const route of reviewerRoutes) {
      try {
        reviewerLinks.push(...await checkPage(reviewerContext, route, viewport.name, { mustStayOnRoute: true }));
      } catch (error) {
        failures.push(error.message);
      }
    }
    try {
      await checkLinks(reviewerContext, reviewerLinks.filter((route) => route.startsWith("/dashboard") || route.startsWith("/listings")), `${viewport.name} reviewer`);
    } catch (error) {
      failures.push(error.message);
    }
    await reviewerContext.close();
  }

  await browser.close();
  if (failures.length) {
    console.error(`Site audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`Site audit passed: ${publicRoutes.length} public routes plus admin/owner/reviewer routes across desktop and mobile.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
