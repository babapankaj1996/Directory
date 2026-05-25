import { NextRequest, NextResponse } from "next/server";

function adminSecret() {
  return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "local-development-admin-secret";
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

async function getUsableTokenPayload(token?: string, requiredRole?: "ADMIN") {
  if (!token) return null;
  try {
    const rawToken = decodeURIComponent(token);
    const parts = rawToken.split(".");
    if (parts.length !== 2) return null;
    const [payloadPart, signaturePart] = parts;
    if (!payloadPart || !signaturePart) return null;
    if (await signPayload(payloadPart) !== signaturePart) return null;

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
  if (pathname === "/signup") {
    const roleParam = request.nextUrl.searchParams.get("role")?.toUpperCase();
    const nextParam = request.nextUrl.searchParams.get("next") || "";
    if (roleParam === "OWNER" || nextParam.startsWith("/dashboard/add-profile")) {
      return attachOwnerSignupIntent(NextResponse.redirect(new URL("/signup", request.url)));
    }
    return NextResponse.next();
  }

  const adminToken = request.cookies.get("admin_token")?.value;
  const sessionToken = request.cookies.get("session_token")?.value || adminToken;
  const isAdminRoute = pathname.startsWith("/admin");
  const payload = isAdminRoute
    ? await getUsableTokenPayload(adminToken, "ADMIN")
    : await getUsableTokenPayload(sessionToken);

  if (payload) {
    if (pathname.startsWith("/dashboard") && payload.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/dashboard/add-profile") {
    const signupUrl = new URL("/signup", request.url);
    return attachOwnerSignupIntent(NextResponse.redirect(signupUrl));
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/signup"]
};
