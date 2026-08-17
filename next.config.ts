import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
// NEXT_PUBLIC_API_URL may be a site-relative path (the browser reaches the API
// through a same-origin proxy), which is not a parseable URL. Only an absolute
// value can contribute an image remote pattern, so fall back for that purpose.
const rawApiOrigin = process.env.NEXT_PUBLIC_API_URL || "";
const apiOrigin = (rawApiOrigin.startsWith("http") ? rawApiOrigin : "") ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";
const backendOrigin = process.env.BACKEND_API_URL || (isProduction ? "" : "http://127.0.0.1:4000");
if (!backendOrigin) {
  throw new Error("BACKEND_API_URL is required for a production frontend build.");
}
const apiUrl = new URL(backendOrigin);
const publicApiUrl = new URL(apiOrigin);
const supabaseUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
})();
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next streams metadata into the body for anything it does not recognise as a
  // no-JS crawler, and only relocates it with an inline script. For an SEO-led
  // directory the title/description/canonical must be in the served <head> for
  // every client, so streaming metadata is switched off by treating every user
  // agent as HTML-limited. Metadata here is cheap to resolve, so blocking on it
  // costs little.
  htmlLimitedBots: /.*/,
  turbopack: {
    root: process.cwd()
  },
  // The Content-Security-Policy is set per-request in middleware.ts because it
  // carries a fresh nonce. Only the static headers live here, so that assets
  // excluded from the middleware matcher still get them.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : [])
        ]
      }
    ];
  },
  images: {
    // AVIF first: the listing photos are the LCP element on every results page,
    // and AVIF lands materially smaller than WebP. The long cache TTL keeps the
    // optimizer from re-fetching and re-encoding from the origin, so only the
    // first visitor after a deploy pays for the conversion.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port
      },
      {
        protocol: publicApiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: publicApiUrl.hostname,
        port: publicApiUrl.port
      },
      ...(supabaseUrl ? [{
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port
      }] : [])
    ]
  },
  // Type checking is still available through `npm run type-check`.
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
