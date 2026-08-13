import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ||
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
const supabaseSource = supabaseUrl ? ` ${supabaseUrl.origin}` : "";
const backendSource = ` ${apiUrl.origin}`;
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `connect-src 'self' ${apiOrigin}${backendSource}${supabaseSource} https://api.razorpay.com`,
  `img-src 'self' data: blob: ${apiOrigin}${backendSource}${supabaseSource} https://images.unsplash.com`,
  `media-src 'self' blob: ${apiOrigin}${backendSource}${supabaseSource}`,
  "font-src 'self' data:",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  ...(isProduction ? ["upgrade-insecure-requests"] : [])
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
