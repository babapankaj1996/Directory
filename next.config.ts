import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:4000";
const apiUrl = new URL(apiOrigin);
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `connect-src 'self' ${apiOrigin} https://api.razorpay.com`,
  `img-src 'self' data: blob: ${apiOrigin} https://images.unsplash.com`,
  `media-src 'self' blob: ${apiOrigin}`,
  "font-src 'self' data:",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  ...(isProduction ? ["upgrade-insecure-requests"] : [])
].join("; ");

const nextConfig: NextConfig = {
  agentRules: false,
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
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000"
      }
    ]
  },
  // Type checking is still available through `npm run type-check`.
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
