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

  /*
   * Authorisation is NOT decided here.
   *
   * Middleware runs in an edge sandbox whose access to non-public environment
   * variables is unreliable when self-hosted. Verifying the session signature
   * here meant a correctly signed-in administrator could be told their token
   * was forged, with no way to tell the two cases apart — the symptom was an
   * endless bounce back to /login?next=/admin.
   *
   * The guard now lives in the route layouts, which run in the Node runtime
   * where the signing secret is reliably present. See lib/session-guard.ts.
   * A visitor with no session cookie at all is still sent to the login page
   * here, since that needs no secret and saves rendering a shell nobody will
   * see.
   */
  const hasAnySession = Boolean(
    request.cookies.get("admin_token")?.value || request.cookies.get("session_token")?.value
  );

  if (hasAnySession) {
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
