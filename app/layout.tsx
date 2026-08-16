import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { getSiteSettings } from "@/lib/site-settings";

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

/**
 * Metadata is generated per request from the operator's site settings, so the
 * title, description, favicon, share image and search-console verification can
 * all be changed from the admin without a deploy. Falls back to built-in values
 * whenever the settings API is unreachable.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const favicon = settings.faviconUrl || "/favicon.svg";
  const verification: Record<string, string> = {};
  if (settings.analytics.googleSiteVerification) verification.google = settings.analytics.googleSiteVerification;
  if (settings.analytics.bingSiteVerification) verification.other = settings.analytics.bingSiteVerification;

  return {
    title: {
      default: `${settings.siteName} | ${settings.tagline}`,
      template: settings.seo.titleTemplate.includes("%s") ? settings.seo.titleTemplate : `%s | ${settings.siteName}`
    },
    description: settings.metaDescription,
    keywords: settings.metaKeywords ? settings.metaKeywords.split(",").map((k: string) => k.trim()).filter(Boolean) : undefined,
    metadataBase: new URL(
      settings.seo.canonicalHost || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ),
    icons: { icon: favicon, shortcut: favicon, apple: favicon },
    // Turning indexing off is a deliberate staging switch in the admin.
    robots: settings.seo.robotsIndex ? undefined : { index: false, follow: false },
    verification: Object.keys(verification).length ? verification : undefined,
    openGraph: {
      title: settings.siteName,
      description: settings.metaDescription,
      siteName: settings.siteName,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      images: settings.ogImageUrl ? [settings.ogImageUrl] : undefined
    }
  };
}

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

  // The nonce Next.js issued for this request, recovered from the CSP so the
  // theme script below is allowed to run under 'strict-dynamic'.
  const nonce = (requestHeaders.get("content-security-policy") || "").match(/'nonce-([^']+)'/)?.[1];

  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      {/* Rendered without a wrapping <head>: declaring one here takes the head
          away from Next's Metadata API, which then emitted <meta name="
          description"> into the <body> where crawlers do not count it. React
          hoists this tag into the head on its own. */}
      {metaCsp ? <meta httpEquiv="Content-Security-Policy" content={metaCsp} /> : null}
      {/* Replays a stored theme choice before first paint. Without this the
          page renders in the system palette and then snaps to the chosen one,
          which is visible as a flash on every navigation. Absence of the
          attribute means "follow the system", handled entirely in CSS. */}
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('profinr-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}"
        }}
      />
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
