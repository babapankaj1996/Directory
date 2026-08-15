import { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

function originOf(value: string | undefined) {
  if (!value) return "";
  try {
    return ` ${new URL(value).origin}`;
  } catch {
    return "";
  }
}

const appSource = originOf(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_PUBLIC_URL);
const backendSource = originOf(process.env.BACKEND_API_URL);
const supabaseSource = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);

/**
 * Per-request CSP. `script-src` is nonce-based rather than 'unsafe-inline':
 * Next.js picks the nonce out of the CSP on the *request* headers and stamps it
 * onto its own bootstrap scripts, and our own inline JSON-LD reads it through
 * the <JsonLd> component. 'strict-dynamic' lets those trusted scripts load the
 * chunks they need without whitelisting every path.
 */
function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `connect-src 'self'${appSource}${backendSource}${supabaseSource} https://api.razorpay.com`,
    `img-src 'self' data: blob:${appSource}${backendSource}${supabaseSource} https://images.unsplash.com`,
    `media-src 'self' blob:${appSource}${backendSource}${supabaseSource}`,
    "font-src 'self' data:",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com${isProduction ? "" : " 'unsafe-eval'"}`,
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    // Tailwind and React style attributes still need inline styles.
    "style-src 'self' 'unsafe-inline'",
    ...(isProduction ? ["upgrade-insecure-requests"] : [])
  ].join("; ");
}

function securityHeaders(response: NextResponse, csp?: string) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  if (csp) response.headers.set("Content-Security-Policy", csp);
  if (isProduction) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

function adminSecret() {
  const value = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_JWT_SECRET or JWT_SECRET must be configured in production.");
  }
  return "local-development-admin-secret";
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - base64.length % 4) % 4)}`;
  return atob(padded);
}

function encodeBase64Url(bytes: Uint8Array) {
  let raw = "";
  bytes.forEach((byte) => {
    raw += String.fromCharCode(byte);
  });
  return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signPayload(encodedPayload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(adminSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return encodeBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

async function getUsableTokenPayload(token?: string, requiredRole?: "ADMIN") {
  if (!token) return null;
  try {
    const rawToken = decodeURIComponent(token);
    const parts = rawToken.split(".");
    if (parts.length !== 2) return null;
    const [payloadPart, signaturePart] = parts;
    if (!payloadPart || !signaturePart) return null;
    if (!timingSafeEqual(await signPayload(payloadPart), signaturePart)) return null;

    const payload = JSON.parse(decodeBase64Url(payloadPart)) as {
      role?: string;
      status?: string;
      exp?: number;
    };
    const valid = (!requiredRole || payload.role === requiredRole) &&
      payload.status === "ACTIVE" &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000);
    return valid ? payload : null;
  } catch {
    return null;
  }
}

function attachOwnerSignupIntent(response: NextResponse) {
  response.cookies.set("signup_intent", "OWNER_ADD_PROFILE", {
    path: "/",
    maxAge: 15 * 60,
    sameSite: "lax"
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nonce = btoa(crypto.randomUUID().replace(/-/g, ""));
  const csp = contentSecurityPolicy(nonce);

  // Next.js reads the nonce back off the *request* headers to stamp its own
  // script tags, so the policy has to travel inbound as well as outbound.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const forward = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (pathname === "/signup") {
    const roleParam = request.nextUrl.searchParams.get("role")?.toUpperCase();
    const nextParam = request.nextUrl.searchParams.get("next") || "";
    if (roleParam === "OWNER" || nextParam.startsWith("/dashboard/add-profile")) {
      return securityHeaders(attachOwnerSignupIntent(NextResponse.redirect(new URL("/signup", request.url))), csp);
    }
    return securityHeaders(forward(), csp);
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  if (!isAdminRoute && !isDashboardRoute) {
    return securityHeaders(forward(), csp);
  }

  const adminToken = request.cookies.get("admin_token")?.value;
  const sessionToken = request.cookies.get("session_token")?.value || adminToken;
  const payload = isAdminRoute
    ? await getUsableTokenPayload(adminToken, "ADMIN")
    : await getUsableTokenPayload(sessionToken);

  if (payload) {
    if (pathname.startsWith("/dashboard") && payload.role === "ADMIN") {
      return securityHeaders(NextResponse.redirect(new URL("/admin", request.url)), csp);
    }
    return securityHeaders(forward(), csp);
  }

  if (pathname === "/dashboard/add-profile") {
    const signupUrl = new URL("/signup", request.url);
    return securityHeaders(attachOwnerSignupIntent(NextResponse.redirect(signupUrl)), csp);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return securityHeaders(NextResponse.redirect(loginUrl), csp);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
