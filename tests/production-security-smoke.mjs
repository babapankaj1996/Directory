import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const BASE_URL = (process.env.TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const testId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const adminEmail = `security-admin-${testId}@example.invalid`;
const ownerEmail = `security-owner-${testId}@example.invalid`;
const roleEmail = `security-role-${testId}@example.invalid`;
const adminPassword = `AdminSecurity-${testId}!`;
const ownerPassword = `OwnerSecurity-${testId}!`;
const rolePassword = `RoleSecurity-${testId}!`;
const testEmails = [adminEmail, ownerEmail, roleEmail];
const requireFromBackend = createRequire(new URL("../backend/package.json", import.meta.url));
const dotenv = requireFromBackend("dotenv");
dotenv.config({ path: fileURLToPath(new URL("../backend/.env", import.meta.url)), quiet: true });
const { PrismaClient } = requireFromBackend("@prisma/client");
const bcrypt = requireFromBackend("bcryptjs");
const sharp = requireFromBackend("sharp");
const testDatabaseUrl = new URL(process.env.DATABASE_URL);
testDatabaseUrl.searchParams.set("connection_limit", "1");
testDatabaseUrl.searchParams.set("pool_timeout", "20");
const prisma = new PrismaClient({ datasourceUrl: testDatabaseUrl.toString() });
const uploadsToRemove = new Set();
const locationCode = `sx${crypto.randomBytes(3).toString("hex")}`;
const categorySlug = `security-adult-${testId}`;
const citySlug = `security-city-${testId}`;

function assert(value, message) {
  if (!value) throw new Error(message);
}

function setCookies(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
  const value = response.headers.get("set-cookie");
  return value ? [value] : [];
}

function cookieHeader(response) {
  return setCookies(response).map((cookie) => cookie.split(";", 1)[0]).join("; ");
}

async function jsonRequest(pathname, init = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, init);
  const contentType = response.headers.get("content-type") || "";
  assert(contentType.includes("application/json"), `${pathname} returned ${contentType || "no content type"} instead of JSON`);
  const payload = await response.json();
  return { response, payload };
}

function browserJson(method, body, cookie, origin = BASE_URL) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Mode": "cookie",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body)
  };
}

async function cleanup() {
  await prisma.profile.deleteMany({ where: { countryId: locationCode } });
  await prisma.city.deleteMany({ where: { countryCode: locationCode } });
  await prisma.category.deleteMany({ where: { slug: categorySlug } });
  await prisma.country.deleteMany({ where: { code: locationCode } });
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
  const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backend/uploads/images");
  for (const fileName of uploadsToRemove) {
    await fs.rm(path.join(uploadsRoot, fileName), { force: true });
  }
  await prisma.$disconnect();
}

try {
  const health = await jsonRequest("/api/health");
  assert(health.response.status === 200 && health.payload.database === "connected", "health check did not confirm the database connection");

  const signupPage = await fetch(`${BASE_URL}/signup`);
  const csp = signupPage.headers.get("content-security-policy") || "";
  assert(signupPage.status === 200, "signup page is unavailable");
  assert(csp.includes("default-src 'self'"), "Content-Security-Policy header is missing");
  assert(!csp.includes("'unsafe-eval'"), "production CSP permits unsafe-eval");
  assert(signupPage.headers.get("x-content-type-options") === "nosniff", "nosniff header is missing");
  assert(signupPage.headers.get("x-frame-options") === "DENY", "frame protection header is missing");
  assert((signupPage.headers.get("strict-transport-security") || "").includes("max-age="), "HSTS header is missing");

  const unauthenticatedAdmin = await jsonRequest("/api/admin/listings");
  assert(unauthenticatedAdmin.response.status === 401, "unauthenticated admin API request was not rejected");

  const malformed = await jsonRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: "null"
  });
  assert(malformed.response.status === 400, "non-object JSON body was not rejected with HTTP 400");

  const roleSignup = await jsonRequest("/api/auth/signup", browserJson("POST", {
    name: "Role Escalation Check",
    email: roleEmail,
    password: rolePassword,
    role: "ADMIN"
  }));
  assert(roleSignup.response.status === 201, `role escalation signup failed: ${roleSignup.payload.error || roleSignup.response.status}`);
  assert(roleSignup.payload.data?.role === "USER", "public signup allowed an ADMIN role escalation");
  assert(!("token" in roleSignup.payload), "cookie-mode signup exposed a session token in JSON");

  const ownerSignup = await jsonRequest("/api/auth/signup", browserJson("POST", {
    name: "Security Owner",
    email: ownerEmail,
    password: ownerPassword,
    role: "OWNER"
  }));
  assert(ownerSignup.response.status === 201, `owner signup failed: ${ownerSignup.payload.error || ownerSignup.response.status}`);
  assert(ownerSignup.payload.data?.role === "OWNER", "owner signup role mismatch");
  const ownerCookie = cookieHeader(ownerSignup.response);
  const ownerSetCookie = setCookies(ownerSignup.response).join("; ");
  assert(ownerCookie.includes("session_token="), "signup did not set a session cookie");
  assert(/HttpOnly/i.test(ownerSetCookie), "session cookie is not HttpOnly");
  assert(/Secure/i.test(ownerSetCookie), "production session cookie is not Secure");
  assert(/SameSite=Lax/i.test(ownerSetCookie), "session cookie SameSite policy is missing");

  await prisma.user.update({ where: { email: ownerEmail }, data: { emailVerified: true } });
  await prisma.country.create({ data: { code: locationCode, name: "Security Test Country", status: "ACTIVE" } });
  await prisma.city.create({ data: { slug: citySlug, name: "Security Test City", countryCode: locationCode, status: "ACTIVE" } });
  await prisma.category.create({
    data: {
      slug: categorySlug,
      name: "Security Adult Category",
      status: "ACTIVE",
      isAdult: true,
      adultLevel: "AGE_RESTRICTED",
      minimumAge: 18
    }
  });

  const bypassAdultVerification = await jsonRequest("/api/profiles", browserJson("POST", {
    name: "Adult Verification Bypass",
    slug: `adult-bypass-${testId}`,
    description: "This submission must not bypass adult verification requirements.",
    ownerName: "Security Owner",
    phone: "+1 555 0100",
    address: "Security test address",
    countryId: locationCode,
    citySlug,
    categoryId: categorySlug,
    isAdult: false,
    verificationStatus: "VERIFIED",
    status: "APPROVED",
    rating: 5,
    viewCount: 999999
  }, ownerCookie));
  assert(bypassAdultVerification.response.status === 400, "owner bypassed adult verification requirements");

  const protectedDraft = await jsonRequest("/api/profiles", browserJson("POST", {
    name: "Protected Adult Draft",
    slug: `protected-adult-${testId}`,
    description: "Temporary draft for server-owned field checks.",
    ownerName: "Security Owner",
    phone: "+1 555 0100",
    address: "Security test address",
    countryId: locationCode,
    citySlug,
    categoryId: categorySlug,
    isAdult: false,
    verificationStatus: "VERIFIED",
    status: "DRAFT",
    saveMode: "DRAFT",
    rating: 5,
    reviewCount: 500,
    viewCount: 999999
  }, ownerCookie));
  assert(protectedDraft.response.status === 201, `protected draft creation failed: ${protectedDraft.payload.error || protectedDraft.response.status}`);
  assert(protectedDraft.payload.data?.isAdult === true, "owner overrode the adult category classification");
  assert(protectedDraft.payload.data?.verificationStatus === "PENDING", "owner self-verified an adult listing");
  assert(protectedDraft.payload.data?.rating === 0 && protectedDraft.payload.data?.viewCount === 0, "owner changed server-owned profile counters");

  await prisma.user.create({
    data: {
      name: "Security Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true
    }
  });

  const ownerMe = await jsonRequest("/api/auth/me", { headers: { Cookie: ownerCookie } });
  assert(ownerMe.response.status === 200 && ownerMe.payload.data?.role === "OWNER", "cookie session lookup failed");

  const ownerAdmin = await jsonRequest("/api/admin/listings", { headers: { Cookie: ownerCookie } });
  assert(ownerAdmin.response.status === 403, "owner account reached an admin API");

  const evilOrigin = await jsonRequest("/api/auth/logout", browserJson("POST", {}, ownerCookie, "https://attacker.invalid"));
  assert(evilOrigin.response.status === 403, "cross-origin authenticated write was not blocked");

  const badLogin = await jsonRequest("/api/auth/login", browserJson("POST", { email: adminEmail, password: "incorrect-password" }));
  assert(badLogin.response.status === 401 && badLogin.payload.error === "Invalid email or password", "login failure is not generic");

  const adminLogin = await jsonRequest("/api/auth/login", browserJson("POST", { email: adminEmail, password: adminPassword }));
  assert(adminLogin.response.status === 200 && adminLogin.payload.data?.role === "ADMIN", "admin login failed");
  const adminCookie = cookieHeader(adminLogin.response);
  assert(adminCookie.includes("admin_token="), "admin login did not set the protected admin cookie");

  const adminListings = await jsonRequest("/api/admin/listings", { headers: { Cookie: adminCookie } });
  assert(adminListings.response.status === 200 && Array.isArray(adminListings.payload.data), "admin API access failed after login");

  const unauthenticatedUpload = await jsonRequest("/api/uploads/image", { method: "POST", body: new FormData() });
  assert(unauthenticatedUpload.response.status === 401, "unauthenticated upload was not rejected");

  const png = await sharp({
    create: { width: 24, height: 24, channels: 4, background: { r: 20, g: 120, b: 220, alpha: 1 } }
  }).png().toBuffer();
  const validForm = new FormData();
  validForm.set("type", "avatar");
  validForm.set("image", new Blob([png], { type: "image/png" }), "security.png");
  const validUpload = await jsonRequest("/api/uploads/image", {
    method: "POST",
    headers: { Cookie: ownerCookie, Origin: BASE_URL },
    body: validForm
  });
  assert(validUpload.response.status === 201 && validUpload.payload.data?.mediaType === "image", "valid image upload failed");
  const uploadedName = path.basename(new URL(validUpload.payload.data.webpUrl).pathname);
  uploadsToRemove.add(uploadedName);
  uploadsToRemove.add(uploadedName.replace(/\.webp$/i, ".avif"));

  const fakeVideoForm = new FormData();
  fakeVideoForm.set("type", "gallery");
  fakeVideoForm.set("image", new Blob([Buffer.from("not-a-video")], { type: "video/mp4" }), "fake.mp4");
  const fakeVideo = await jsonRequest("/api/uploads/image", {
    method: "POST",
    headers: { Cookie: ownerCookie, Origin: BASE_URL },
    body: fakeVideoForm
  });
  assert(fakeVideo.response.status === 400, "spoofed video content was accepted");

  console.log(JSON.stringify({
    health: "passed",
    signup: "passed",
    login: "passed",
    adminIsolation: "passed",
    csrf: "passed",
    uploads: "passed",
    ownerFieldIsolation: "passed",
    securityHeaders: "passed"
  }));
} finally {
  await cleanup();
}
