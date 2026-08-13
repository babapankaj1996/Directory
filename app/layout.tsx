import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

function cspOrigin(value: string | undefined) {
  if (!value) return "";
  try {
    return ` ${new URL(value).origin}`;
  } catch {
    return "";
  }
}

const appSource = cspOrigin(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_PUBLIC_URL);
const backendSource = cspOrigin(process.env.BACKEND_API_URL);
const supabaseSource = cspOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
const browserContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  `connect-src 'self'${appSource}${backendSource}${supabaseSource} https://api.razorpay.com`,
  `img-src 'self' data: blob:${appSource}${backendSource}${supabaseSource} https://images.unsplash.com`,
  `media-src 'self' blob:${appSource}${backendSource}${supabaseSource}`,
  "font-src 'self' data:",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "upgrade-insecure-requests"
].join("; ");

export const metadata: Metadata = {
  title: {
    default: "Luxury Directory | Verified Service Providers Worldwide",
    template: "%s | Luxury Directory"
  },
  description: "Discover verified service providers worldwide. Compare professionals by location, category, reviews, pricing, availability and profile details before you contact or book.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: "/favicon.svg"
  },
  openGraph: {
    title: "Luxury Directory",
    description: "Find trusted professionals, compare service profiles, read reviews and contact or book providers worldwide.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={browserContentSecurityPolicy} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
