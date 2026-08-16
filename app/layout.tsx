import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

/**
 * `display: "optional"` rather than "swap".
 *
 * Next does not emit <link rel="preload"> for these faces, so the browser only
 * discovers them after parsing the stylesheet — with "swap" the hero headline
 * re-flowed when Fraunces finally arrived, which was measured as a 0.25 CLS on
 * its own. "optional" gives the font a short block period and then commits to
 * whichever face won, so the page never re-flows. The metric-matched fallback
 * next/font generates keeps the first paint close, and repeat visits hit the
 * HTTP cache and get the real face immediately.
 */
const bodyFont = Manrope({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-sans"
});

// Only the optical-size axis is requested: SOFT and WONK roughly doubled the
// woff2 payload for a display face that is already the heaviest asset here.
const displayFont = Fraunces({
  subsets: ["latin"],
  display: "optional",
  axes: ["opsz"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: {
    default: "Profinr | Verified Service Providers Worldwide",
    template: "%s | Profinr"
  },
  description: "Discover verified service providers worldwide. Compare professionals by location, category, reviews, pricing, availability and profile details before you contact or book.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  },
  openGraph: {
    title: "Profinr",
    description: "Find trusted professionals, compare service profiles, read reviews and contact or book providers worldwide.",
    type: "website"
  }
};

/**
 * The Content-Security-Policy carries a per-request nonce (see middleware.ts).
 * A statically prerendered page is built once, so its script tags would carry a
 * nonce from build time — or none at all — and `strict-dynamic` would block
 * them on every request. Rendering dynamically keeps the nonce and the markup
 * in sync. Every data-backed route in this app was already dynamic; this only
 * affects the auth, admin and blog shells, which fetch nothing at build time.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0d0b",
  colorScheme: "dark"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  // Hostinger's CDN rewrites the Content-Security-Policy response header down to
  // a single directive, so the policy is repeated in a meta tag where the edge
  // cannot touch it. `frame-ancestors` is omitted because browsers ignore it in
  // meta form and warn about it — X-Frame-Options: DENY covers framing instead.
  const metaCsp = (requestHeaders.get("content-security-policy") || "")
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => directive && !directive.startsWith("frame-ancestors"))
    .join("; ");

  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      {/* Rendered without a wrapping <head>: declaring one here takes the head
          away from Next's Metadata API, which then emitted <meta name="
          description"> into the <body> where crawlers do not count it. React
          hoists this tag into the head on its own. */}
      {metaCsp ? <meta httpEquiv="Content-Security-Policy" content={metaCsp} /> : null}
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
