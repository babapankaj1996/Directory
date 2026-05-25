import { getCitiesForCountry, getListingUrl, isFeaturedActive, isIdVerifiedListing, type Listing } from "@/lib/data";
import { getCategorySearchContent, localizeCategoryContent } from "@/lib/seo-content";

export type SeoFaq = {
  question: string;
  answer: string;
};

export type ProfileSeoContent = {
  title: string;
  description: string;
  keywords: string[];
  primaryKeyword: string;
  serviceName: string;
  serviceArea: string;
  summaryTitle: string;
  summary: string;
  trustTitle: string;
  trustPoints: string[];
  compareTitle: string;
  comparePoints: string[];
  localTitle: string;
  localCopy: string;
  serviceSignals: string[];
  localSearchAngles: string[];
  faq: SeoFaq[];
  internalLinks: Array<{ label: string; href: string }>;
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function lower(value: string) {
  return value.toLowerCase();
}

function firstSentence(value?: string) {
  const text = compact(value || "");
  if (!text) return "";
  const match = text.match(/^(.{40,220}?[.!?])\s/);
  return match ? match[1] : text.slice(0, 220);
}

function profileSummary(listing: Listing) {
  return firstSentence(listing.seoDescription || listing.shortDescription || listing.about);
}

function cleanServiceLines(listing: Listing) {
  return (listing.services || [])
    .filter((item) => !/^(age|available for|orientation|height|body type|ethnicity|languages spoken|booking type|minimum booking duration):/i.test(item))
    .slice(0, 5);
}

export function buildProfileSeoContent(listing: Listing, galleryCount = listing.gallery?.length || 0): ProfileSeoContent {
  const serviceArea = listing.cityName || listing.location;
  const serviceName = `${listing.category} in ${serviceArea}`;
  const primaryKeyword = `${listing.name} - ${serviceName}`;
  const isAdult = Boolean(listing.isAdult);
  const categoryContent = localizeCategoryContent(getCategorySearchContent({
    slug: listing.categorySlug,
    name: listing.category,
    count: 0,
    description: "",
    iconName: "Star",
    isAdult
  }), {
    category: listing.category,
    city: serviceArea,
    country: listing.country.toUpperCase()
  });
  const idVerified = isIdVerifiedListing(listing);
  const activeFeatured = isFeaturedActive(listing);
  const services = cleanServiceLines(listing);
  const title = isAdult
    ? `${listing.name} - ${listing.category} in ${serviceArea} | 18+ Profile`
    : `${listing.name} - ${listing.category} in ${serviceArea}`;
  const summary = profileSummary(listing);
  const description = isAdult
    ? compact(`${listing.name} is an approved 18+ ${lower(listing.category)} profile in ${serviceArea}. Compare verification status, gallery, availability, rates and contact options before connecting.`)
    : compact(`${listing.name} is an approved ${lower(listing.category)} profile in ${serviceArea}. Compare services, reviews, gallery, location, pricing notes and contact options before connecting.`);

  const trustPoints = isAdult
    ? [
      "This public profile is visible only after admin approval.",
      idVerified ? "ID verification is completed and shown with a blue verification signal." : "ID verification is not completed, so visitors should treat the profile as not ID verified.",
      activeFeatured ? "This profile has active featured placement and may appear higher on relevant listing pages." : "This profile appears in normal approved listing rotation.",
      galleryCount ? `The gallery includes ${galleryCount} media item${galleryCount === 1 ? "" : "s"} for profile review.` : "Gallery media can be added by the owner or admin for more visual detail."
    ]
    : [
      "This public profile is visible only after admin approval.",
      listing.verified ? "The profile is marked verified for stronger trust signals." : "The profile is approved and can receive quote requests.",
      activeFeatured ? "This profile has active featured placement and may appear higher on relevant listing pages." : "This profile appears in normal approved listing rotation.",
      galleryCount ? `The gallery includes ${galleryCount} media item${galleryCount === 1 ? "" : "s"} for profile review.` : "Gallery media can be added by the owner or admin for more visual detail."
    ];

  const comparePoints = isAdult
    ? [
      "Check age-restricted status, verification signal, public details and gallery before making contact.",
      "Review rates, booking duration, availability and location notes where the provider has supplied them.",
      "Use the category and city links below to compare this profile with other approved local profiles."
    ]
    : [
      "Check services, pricing notes, gallery media, reviews and location details before sending a request.",
      "Use the quote request form when you want the provider to respond with availability and next steps.",
      "Use the category and city links below to compare this profile with other approved local providers."
    ];

  const faq: SeoFaq[] = isAdult
    ? [
      {
        question: `Is ${listing.name} an approved 18+ profile?`,
        answer: `Yes. ${listing.name} is shown publicly only after admin approval. The profile page also displays whether ID verification is completed.`
      },
      {
        question: `Where is ${listing.name} listed?`,
        answer: `${listing.name} is listed under ${listing.category} in ${serviceArea}. The canonical profile URL is ${getListingUrl(listing)}.`
      },
      {
        question: "What should I check before contacting this profile?",
        answer: `Review ${categoryContent.profileFields.join(", ")}, verification status and the contact details shown on the page.`
      },
      {
        question: "Is this profile page age restricted?",
        answer: "Yes. This profile belongs to an 18+ category and is intended only for adults aged 18 or older and for legal services only."
      }
    ]
    : [
      {
        question: `What services does ${listing.name} offer?`,
        answer: services.length ? `${listing.name} lists services including ${services.join(", ")}.` : `${listing.name} lists public service details such as ${categoryContent.profileFields.slice(0, 4).join(", ")} on this profile page.`
      },
      {
        question: `Where is ${listing.name} located?`,
        answer: `${listing.name} is listed under ${listing.category} in ${serviceArea}. The profile location is ${listing.address || listing.location}.`
      },
      {
        question: "How can I contact this provider?",
        answer: "Use the call, WhatsApp, website or quote request actions on the profile page when those options are available."
      },
      {
        question: "Why is this profile visible in search pages?",
        answer: "Public profile pages show approved listings only. Pending, rejected and suspended profiles stay hidden from public SEO routes."
      }
    ];

  const nearbyCity = getCitiesForCountry(listing.country)
    .filter((item) => item.slug !== listing.city)
    .slice(0, 3)
    .map((item) => ({
      label: `${listing.category} in ${item.name}`,
      href: `/${listing.country}/${item.slug}/${listing.categorySlug}`
    }));

  return {
    title,
    description,
    keywords: [
      primaryKeyword,
      `${listing.name} ${listing.cityName}`,
      `${listing.category} ${listing.cityName}`,
      `${listing.category} profile ${listing.cityName}`,
      ...services.map((service) => `${service} ${listing.cityName}`)
    ],
    primaryKeyword,
    serviceName,
    serviceArea,
    summaryTitle: "Profile overview",
    summary: summary || description,
    trustTitle: isAdult ? "Trust and verification" : "Trust and profile signals",
    trustPoints,
    compareTitle: isAdult ? "Before contacting" : "Before sending a request",
    comparePoints,
    localTitle: `${listing.category} profile serving ${serviceArea}`,
    localCopy: `${listing.name} is listed under ${listing.category} in ${serviceArea} so visitors can compare this provider against nearby professionals with the same service focus. Review services, gallery media, reviews, pricing notes, availability and contact options before sending an enquiry or booking request. ${categoryContent.summary}`,
    serviceSignals: categoryContent.profileFields,
    localSearchAngles: categoryContent.longTail.map((term) => `${listing.category} ${term} in ${serviceArea}`),
    faq,
    internalLinks: [
      { label: `${listing.category} in ${serviceArea}`, href: `/${listing.country}/${listing.city}/${listing.categorySlug}` },
      { label: `Services in ${serviceArea}`, href: `/${listing.country}/${listing.city}` },
      ...nearbyCity
    ]
  };
}
