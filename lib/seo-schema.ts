import { getListingUrl, type Listing } from "@/lib/data";
import type { CategorySeoContent } from "@/lib/category-seo";
import type { CitySeoContent } from "@/lib/city-seo";
import type { ProfileSeoContent, SeoFaq } from "@/lib/profile-seo";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function profileJsonLd(listing: Listing) {
  const url = `${siteUrl()}${getListingUrl(listing)}`;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#business`,
    name: listing.name,
    url,
    image: listing.coverImage || listing.image,
    logo: listing.avatarImage || listing.image,
    description: listing.seoDescription || listing.shortDescription || listing.about,
    telephone: listing.phone,
    email: listing.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address || listing.location,
      addressLocality: listing.cityName,
      addressCountry: listing.country.toUpperCase()
    },
    aggregateRating: listing.reviews > 0 ? {
      "@type": "AggregateRating",
      ratingValue: listing.rating,
      reviewCount: listing.reviews
    } : undefined,
    makesOffer: listing.services?.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service
      }
    }))
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl()}#website`,
    url: siteUrl(),
    name: "Profinr",
    description: "Global service provider directory for comparing professionals by country, city, category, reviews, pricing, availability and profile details.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl()}/listings?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl()}#organization`,
    name: "Profinr",
    url: siteUrl(),
    sameAs: []
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl()}${item.path}`
    }))
  };
}

export function categoryItemListJsonLd(path: string, listings: Listing[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: `${siteUrl()}${path}`,
    numberOfItems: listings.length,
    itemListElement: listings.map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl()}${getListingUrl(listing)}`,
      name: listing.name
    }))
  };
}

export function categoryCollectionJsonLd(path: string, seo: CategorySeoContent, listings: Listing[]) {
  const url = `${siteUrl()}${path}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: seo.title,
    description: seo.description,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      url: siteUrl(),
      name: "Profinr"
    },
    about: {
      "@type": "Service",
      name: seo.primaryKeyword,
      areaServed: {
        "@type": "City",
        name: seo.cityName
      }
    },
    audience: seo.description.includes("18+ only") ? {
      "@type": "PeopleAudience",
      suggestedMinAge: 18
    } : undefined,
    mainEntity: categoryItemListJsonLd(path, listings)
  };
}

export function cityCollectionJsonLd(path: string, seo: CitySeoContent, listings: Listing[]) {
  const url = `${siteUrl()}${path}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#city-directory`,
    url,
    name: seo.title,
    description: seo.description,
    inLanguage: "en",
    about: {
      "@type": "City",
      name: seo.cityName
    },
    mainEntity: categoryItemListJsonLd(path, listings.slice(0, 20))
  };
}

export function profileServiceJsonLd(listing: Listing, seo: ProfileSeoContent) {
  const url = `${siteUrl()}${getListingUrl(listing)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: seo.serviceName,
    serviceType: listing.category,
    url,
    description: seo.description,
    provider: {
      "@type": "LocalBusiness",
      "@id": `${url}#business`,
      name: listing.name
    },
    areaServed: {
      "@type": "City",
      name: listing.cityName
    },
    offers: listing.pricing?.length ? listing.pricing.map((price) => ({
      "@type": "Offer",
      name: price,
      availability: "https://schema.org/InStock"
    })) : undefined
  };
}

export function faqJsonLd(faq: SeoFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}
