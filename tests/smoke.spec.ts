import { expect, test } from "@playwright/test";

async function expectNoBrokenVisibleImages(page: import("@playwright/test").Page) {
  await page.waitForTimeout(1500);
  const brokenImages = await page.locator("img").evaluateAll((images) => images
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20 && rect.bottom > 0 && rect.top < window.innerHeight + 600;
    })
    .filter((image) => {
      const img = image as HTMLImageElement;
      return !img.complete || img.naturalWidth < 1 || img.naturalHeight < 1;
    })
    .map((image) => {
      const img = image as HTMLImageElement;
      return img.getAttribute("src") || img.alt;
    }));
  expect(brokenImages).toEqual([]);
}

test("homepage renders public search and no anonymous dashboard link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /discover verified service providers worldwide/i })).toBeVisible();
  if (page.viewportSize()?.width && page.viewportSize()!.width < 768) {
    await page.locator('main button[aria-expanded]').first().click();
  }
  await expect(page.getByPlaceholder(/service, provider, category or city/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /add your profile/i }).first()).toHaveAttribute("href", "/signup");
  const homepageCategories = page.locator("section").filter({ has: page.getByRole("heading", { name: /active service categories/i }) });
  await expect(homepageCategories.getByRole("link", { name: /astrologers/i }).first()).toHaveAttribute("href", "/astrologer");
  await page.getByRole("button", { name: /i am 18\+/i }).click();
  const adultCategories = page.locator("section").filter({ hasText: "Age-restricted service categories" });
  await expect(adultCategories.getByRole("heading", { name: /age-restricted service categories/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  if (page.viewportSize()?.width && page.viewportSize()!.width < 768) {
    await page.getByRole("button", { name: "Open menu" }).click();
  }
  await expect(page.getByRole("link", { name: "Login" }).first()).toBeVisible();
});

test("latest listings and SEO profile routes render", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByRole("heading", { name: /compare service provider listings/i })).toBeVisible();

  await page.goto("/dashboard/add-profile");
  const signupUrl = new URL(page.url());
  expect(signupUrl.pathname).toBe("/signup");
  expect(signupUrl.search).toBe("");
  await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Business Owner Post listings only", exact: true })).toHaveClass(/bg-ink/);

  await page.goto("/signup?role=OWNER&next=/dashboard/add-profile");
  const cleanSignupUrl = new URL(page.url());
  expect(cleanSignupUrl.pathname).toBe("/signup");
  expect(cleanSignupUrl.search).toBe("");
  await expect(page.getByRole("button", { name: "Business Owner Post listings only", exact: true })).toHaveClass(/bg-ink/);

  await page.goto("/astrologer?country=in");
  await expect(page).toHaveURL(/\/astrologer$/);
  if (page.viewportSize()?.width && page.viewportSize()!.width < 768) {
    await page.locator('main button[aria-expanded]').first().click();
  }
  await expect(page.getByText(/Filter by country, city, keyword/i)).toBeVisible();

  await page.goto("/in/delhi/astrologer/aditya-pareek");
  await expect(page.getByRole("heading", { name: /aditya pareek/i })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  const galleryHeading = page.getByRole("heading", { name: /profile gallery/i });
  await expect(galleryHeading).toBeVisible();
  await galleryHeading.scrollIntoViewIfNeeded();
  await expectNoBrokenVisibleImages(page);

  const sitemap = await page.request.get("/sitemap.xml");
  const sitemapXml = await sitemap.text();
  const adultRoute = sitemapXml.match(/http:\/\/localhost:3000(\/[^<]*(?:escort|companion|girlfriend|boyfriend|massage)[^<]*)/)?.[1];
  if (adultRoute) {
    await page.goto(adultRoute);
    await expect(page.locator('meta[name="rating"]')).toHaveAttribute("content", "adult");
  }
});

test("login password reveal toggle works", async ({ page }) => {
  await page.goto("/login");
  const password = page.locator('input[autocomplete="current-password"]');
  await password.fill("Admin@12345");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByLabel("Show password").click();
  await expect(password).toHaveAttribute("type", "text");
});

test("admin listings is protected and works after login", async ({ page }) => {
  await page.goto("/admin/listings");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email Address").fill("admin@example.com");
  await page.locator('input[autocomplete="current-password"]').fill("Admin@12345");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/admin/);
  await page.goto("/admin/listings");
  await expect(page.getByRole("heading", { name: /manage listings/i })).toBeVisible();
  await page.goto("/admin/quotes");
  await expect(page.getByRole("heading", { name: /quote request inbox/i })).toBeVisible();
  await expect(page.getByText(/avg lead score/i)).toBeVisible();
  await page.goto("/admin/verification");
  await expect(page.getByRole("heading", { name: /verify uploaded documents/i })).toBeVisible();
  await expect(page.getByPlaceholder(/search business, owner, city/i)).toBeVisible();
  if (page.viewportSize()?.width && page.viewportSize()!.width < 768) {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Admin menu" }).click();
    await expect(page.getByRole("link", { name: "Verification" })).toBeVisible();
  }
});

test("owner dashboard shows lead quality performance", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("owner@example.com");
  await page.locator('input[autocomplete="current-password"]').fill("Owner@12345");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/dashboard/);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /quote performance/i })).toBeVisible();
  await expect(page.getByText(/avg score/i)).toBeVisible();
});

test("review user dashboard shows saved profiles and review history", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("reviewer@example.com");
  await page.locator('input[autocomplete="current-password"]').fill("Review@12345");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /your saved profiles, reviews and quotes/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /shortlist/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /profiles you reviewed/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /requests you sent/i })).toBeVisible();
});
