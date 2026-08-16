import { getApiBase } from "@/lib/profiles";

/**
 * Reads the operator-controlled site settings for use in page metadata.
 *
 * Cached for a minute rather than fetched per request: these values change
 * rarely, every page render needs them, and a directory page should not wait on
 * a settings round-trip. If the API is unreachable the built-in defaults are
 * returned, so the site keeps rendering with sensible metadata.
 */
export type SiteSettings = {
  siteName: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  faviconUrl: string;
  ogImageUrl: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  social: { twitter: string; facebook: string; instagram: string; linkedin: string; youtube: string };
  analytics: { googleAnalyticsId: string; googleSiteVerification: string; bingSiteVerification: string };
  homepage: {
    heroTitle: string;
    heroSubtitle: string;
    heroCtaLabel: string;
    featuredLimit: number;
    showTrending: boolean;
    showCategories: boolean;
  };
  seo: { titleTemplate: string; robotsIndex: boolean; canonicalHost: string };
};

export const SITE_SETTINGS_FALLBACK: SiteSettings = {
  siteName: "Profinr",
  tagline: "Verified service providers worldwide",
  metaTitle: "Verified Global Service Provider Directory",
  metaDescription:
    "Discover verified service providers worldwide. Compare local experts by category, location, rating, experience, pricing, availability and reviews before you contact or book.",
  metaKeywords: "",
  faviconUrl: "",
  ogImageUrl: "",
  logoUrl: "",
  contactEmail: "support@profinr.com",
  contactPhone: "",
  addressLine: "",
  social: { twitter: "", facebook: "", instagram: "", linkedin: "", youtube: "" },
  analytics: { googleAnalyticsId: "", googleSiteVerification: "", bingSiteVerification: "" },
  homepage: {
    heroTitle: "",
    heroSubtitle: "",
    heroCtaLabel: "",
    featuredLimit: 6,
    showTrending: true,
    showCategories: true
  },
  seo: { titleTemplate: "%s | Profinr", robotsIndex: true, canonicalHost: "" }
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const response = await fetch(`${getApiBase()}/api/site-settings`, {
      next: { revalidate: 60, tags: ["site-settings"] }
    });
    if (!response.ok) return SITE_SETTINGS_FALLBACK;
    const payload = (await response.json()) as { data?: Partial<SiteSettings> };
    if (!payload.data) return SITE_SETTINGS_FALLBACK;
    // Merge so a field added to the app but missing from a stored row still resolves.
    return {
      ...SITE_SETTINGS_FALLBACK,
      ...payload.data,
      social: { ...SITE_SETTINGS_FALLBACK.social, ...(payload.data.social || {}) },
      analytics: { ...SITE_SETTINGS_FALLBACK.analytics, ...(payload.data.analytics || {}) },
      homepage: { ...SITE_SETTINGS_FALLBACK.homepage, ...(payload.data.homepage || {}) },
      seo: { ...SITE_SETTINGS_FALLBACK.seo, ...(payload.data.seo || {}) }
    };
  } catch {
    return SITE_SETTINGS_FALLBACK;
  }
}
