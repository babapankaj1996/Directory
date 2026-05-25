import { publicCountries, type Category, type Listing } from "@/lib/data";
import { getCategorySearchContent } from "@/lib/seo-content";
import type { SeoFaq } from "@/lib/profile-seo";
import { formatRouteName } from "@/lib/utils";

export type CitySeoContent = {
  title: string;
  description: string;
  cityName: string;
  countryName: string;
  heading: string;
  intro: string;
  trustPoints: string[];
  searchTitle: string;
  searchCopy: string;
  localSearches: string[];
  qualityChecks: string[];
  faq: SeoFaq[];
  categoryLinks: Array<{ label: string; href: string }>;
};

function countryName(code: string) {
  return publicCountries.find((item) => item.code === code)?.name || code.toUpperCase();
}

function countText(count: number) {
  if (count === 1) return "1 approved profile";
  return `${count} approved profiles`;
}

export function buildCitySeoContent({
  country,
  city,
  listings,
  categories
}: {
  country: string;
  city: string;
  listings: Listing[];
  categories: Category[];
}): CitySeoContent {
  const cityName = formatRouteName(city);
  const currentCountryName = countryName(country);
  const approvedCount = listings.length;
  const categoryCount = categories.length;
  const standardCategories = categories.filter((category) => !category.isAdult);
  const adultCategories = categories.filter((category) => category.isAdult);
  const topCategories = standardCategories.slice(0, 5);
  const localSearches = topCategories.flatMap((category) =>
    getCategorySearchContent(category).longTail.slice(0, 2).map((term) => `${category.name} ${term} in ${cityName}`)
  ).slice(0, 8);
  const categoryLinks = categories.slice(0, 12).map((category) => ({
    label: `${category.name} in ${cityName}`,
    href: `/${country}/${city}/${category.slug}`
  }));

  return {
    title: `Best Service Providers in ${cityName} | Verified Professionals`,
    description: `Discover ${countText(approvedCount)} across ${categoryCount} categories in ${cityName}, ${currentCountryName}. Compare local experts by services, ratings, reviews, prices, availability and contact options.`,
    cityName,
    countryName: currentCountryName,
    heading: `Premium services in ${cityName}`,
    intro: `Discover verified service providers in ${cityName}, ${currentCountryName}. Browse professionals across popular categories, compare reviews, view work galleries, check pricing notes and availability, then connect through enquiry, call, chat, video consultation or booking options when available. Popular standard categories include ${topCategories.map((category) => category.name).join(", ") || "local services"}${adultCategories.length ? ", with adult categories kept age-restricted and separate" : ""}.`,
    trustPoints: [
      "Public city pages show approved profiles only.",
      "Featured listings are highlighted while category pages provide deeper comparison.",
      "Adult categories remain age-restricted and are clearly separated from standard service categories.",
      "Clean internal links connect city, category and profile URLs for better discovery."
    ],
    searchTitle: `How people search in ${cityName}`,
    searchCopy: `Visitors often compare broad city results first, then open focused service pages such as ${topCategories.slice(0, 3).map((category) => `${category.name} in ${cityName}`).join(", ") || `services in ${cityName}`}. This helps them move from discovery to a shortlist of nearby professionals who match their service need.`,
    localSearches,
    qualityChecks: [
      "Open the category page when you need one service type in one city.",
      "Use verified badges and profile details to compare trust signals.",
      "Review gallery, reviews, pricing notes and contact options before reaching out.",
      "Use profile pages for canonical provider details and quote requests."
    ],
    faq: [
      {
        question: `How do I find services in ${cityName}?`,
        answer: `Start with a category card on this page, then open the matching ${cityName} category URL to compare approved providers.`
      },
      {
        question: `Are all ${cityName} profiles public?`,
        answer: "Only approved profiles are shown on public city and category pages. Pending, rejected and suspended profiles stay hidden."
      },
      {
        question: "Why are category pages important?",
        answer: "Category pages focus on one city and one service type, which makes them cleaner landing pages for visitors and search engines."
      },
      {
        question: "Can I contact providers from this page?",
        answer: "Open a profile page to review details, gallery media, reviews and contact options before calling, messaging or sending a quote request."
      }
    ],
    categoryLinks
  };
}
