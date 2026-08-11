import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const BASE_URL = (process.env.TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const testId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const adminEmail = `browser-admin-${testId}@example.invalid`;
const ownerEmail = `browser-owner-${testId}@example.invalid`;
const signupEmail = `browser-signup-${testId}@example.invalid`;
const adminPassword = `AdminBrowser-${testId}!`;
const ownerPassword = `OwnerBrowser-${testId}!`;
const signupPassword = `SignupBrowser-${testId}!`;
const emails = [adminEmail, ownerEmail, signupEmail];
const requireFromBackend = createRequire(new URL("../backend/package.json", import.meta.url));
const dotenv = requireFromBackend("dotenv");
dotenv.config({ path: fileURLToPath(new URL("../backend/.env", import.meta.url)), quiet: true });
const { PrismaClient } = requireFromBackend("@prisma/client");
const bcrypt = requireFromBackend("bcryptjs");
const testDatabaseUrl = new URL(process.env.DATABASE_URL);
testDatabaseUrl.searchParams.set("connection_limit", "1");
testDatabaseUrl.searchParams.set("pool_timeout", "20");
const prisma = new PrismaClient({ datasourceUrl: testDatabaseUrl.toString() });
let browser;

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Email Address").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

try {
  await prisma.user.createMany({
    data: [
      {
        name: "Browser Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true
      },
      {
        name: "Browser Owner",
        email: ownerEmail,
        passwordHash: await bcrypt.hash(ownerPassword, 12),
        role: "OWNER",
        status: "ACTIVE",
        emailVerified: true
      }
    ]
  });

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/signup`);
  await page.getByLabel("Full Name").fill("Browser Signup");
  await page.getByLabel("Email Address").fill(signupEmail);
  await page.locator('input[autocomplete="new-password"]').fill(signupPassword);
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.getByText(/please verify your email/i).waitFor({ state: "visible" });
  const signupUser = await prisma.user.findUnique({ where: { email: signupEmail } });
  assert(signupUser?.role === "USER", "browser signup did not create a normal user");

  await context.clearCookies();
  await page.goto(`${BASE_URL}/admin/listings`);
  await page.waitForURL(/\/login/);
  await login(page, adminEmail, adminPassword);
  await page.waitForURL(/\/admin/);
  await page.goto(`${BASE_URL}/admin/listings`);
  await page.getByRole("heading", { name: /manage listings/i }).waitFor({ state: "visible" });

  await context.clearCookies();
  await login(page, ownerEmail, ownerPassword);
  await page.waitForURL(/\/dashboard/);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.getByRole("heading", { name: /quote performance/i }).waitFor({ state: "visible" });

  console.log(JSON.stringify({ browserSignup: "passed", browserAdminLogin: "passed", browserOwnerLogin: "passed" }));
} finally {
  if (browser) await browser.close();
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
}
