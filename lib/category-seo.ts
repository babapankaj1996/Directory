import { getCitiesForCountry, publicCountries, type Category, type Listing } from "@/lib/data";
import { getCategorySearchContent, localizeCategoryContent } from "@/lib/seo-content";
import { formatRouteName } from "@/lib/utils";

export type CategoryFaq = {
  question: string;
  answer: string;
};

export type CategorySeoContent = {
  cityName: string;
  countryName: string;
  categoryName: string;
  primaryKeyword: string;
  title: string;
  description: string;
  heroDescription: string;
  introTitle: string;
  intro: string;
  trustTitle: string;
  trustPoints: string[];
  compareTitle: string;
  comparePoints: string[];
  localTitle: string;
  localCopy: string;
  intentTitle: string;
  intentCopy: string;
  decisionPoints: string[];
  profileSignals: string[];
  longTailKeywords: string[];
  faq: CategoryFaq[];
  relatedCityLinks: Array<{ label: string; href: string }>;
  relatedCategoryLinks: Array<{ label: string; href: string }>;
};

type CategorySeoInput = {
  country: string;
  city: string;
  category: Category;
  categoryOptions?: Category[];
  listings?: Listing[];
};

function lower(value: string) {
  return value.toLowerCase();
}

function countryName(code: string) {
  return publicCountries.find((item) => item.code === code)?.name || code.toUpperCase();
}

function approvedCountText(count: number) {
  if (count <= 0) return "approved profiles";
  if (count === 1) return "1 approved profile";
  return `${count} approved profiles`;
}

function cleanCategoryName(category: Category) {
  return category.name || formatRouteName(category.slug);
}

export function buildCategorySeoContent({
  country,
  city,
  category,
  categoryOptions = [],
  listings = []
}: CategorySeoInput): CategorySeoContent {
  const cityName = formatRouteName(city);
  const categoryName = cleanCategoryName(category);
  const currentCountryName = countryName(country);
  const primaryKeyword = `${categoryName} in ${cityName}`;
  const isAdult = Boolean(category.isAdult);
  const countText = approvedCountText(listings.length);
  const intentContent = localizeCategoryContent(getCategorySearchContent(category), {
    category: categoryName,
    city: cityName,
    country: currentCountryName
  });
  const title = isAdult
    ? `${categoryName} in ${cityName} | Verified 18+ Profiles`
    : `${categoryName} in ${cityName} | Verified Local Profiles`;
  const description = isAdult
    ? `Browse ${countText} for ${lower(categoryName)} in ${cityName}. Compare ${intentContent.profileFields.slice(0, 4).join(", ")}, verification and contact options. Adults 18+ only.`
    : `Browse ${countText} for ${lower(categoryName)} in ${cityName}. Compare ${intentContent.profileFields.slice(0, 4).join(", ")}, reviews and contact options.`;
  const heroDescription = isAdult
    ? `Browse approved ${lower(categoryName)} in ${cityName} with ${intentContent.profileFields.slice(0, 5).join(", ")} and direct contact options. This age-restricted directory page is for adults 18+ only.`
    : `Browse approved ${lower(categoryName)} in ${cityName} with ${intentContent.profileFields.slice(0, 5).join(", ")} and direct contact options.`;

  const relatedCityLinks = getCitiesForCountry(country)
    .filter((item) => item.slug !== city)
    .slice(0, 6)
    .map((item) => ({
      label: `${categoryName} in ${item.name}`,
      href: `/${country}/${item.slug}/${category.slug}`
    }));

  const relatedCategoryLinks = categoryOptions
    .filter((item) => item.slug !== category.slug && Boolean(item.isAdult) === isAdult)
    .slice(0, 8)
    .map((item) => ({
      label: `${cleanCategoryName(item)} in ${cityName}`,
      href: `/${country}/${city}/${item.slug}`
    }));

  const trustPoints = isAdult
    ? [
      "Only approved public profiles are shown on this page.",
      "ID verification status is visible so visitors can quickly identify verified adult profiles.",
      "Featured profiles rotate fairly while normal profiles stay ordered by latest approved activity.",
      "Profile pages include galleries, availability, booking notes and contact options when provided."
    ]
    : [
      "Only approved public profiles are shown on this page.",
      "Verified badges, reviews and profile details help visitors compare providers faster.",
      "Featured profiles rotate fairly while normal profiles stay ordered by latest approved activity.",
      "Profile pages include services, gallery media, contact options and quote requests when provided."
    ];

  const comparePoints = isAdult
    ? [
      ...intentContent.compare.slice(0, 2),
      "Check ID verification, age-restricted status and public profile details before contacting.",
      "Compare availability, minimum booking duration, rates and location notes from each profile.",
      "Use the Featured only and Verified only filters when you want a shorter, trust-focused shortlist."
    ]
    : [
      ...intentContent.compare.slice(0, 2),
      "Compare services, prices, reviews, gallery media and response options before contacting.",
      "Use the search box for service terms, locality names, provider names and specialist keywords.",
      "Use the Featured only and Verified only filters when you want a shorter, trust-focused shortlist."
    ];

  const faq: CategoryFaq[] = isAdult
    ? [
      {
        question: `How are ${lower(categoryName)} in ${cityName} listed here?`,
        answer: `Profiles on this page are public only after admin approval. Adult categories are age-restricted and may show ID verification status, gallery media, rates and availability details when the provider has supplied them.`
      },
      {
        question: `What details should I compare on ${primaryKeyword} profiles?`,
        answer: `Compare ${intentContent.profileFields.join(", ")}, verification signals and contact options. Adult profiles should be used only by visitors aged 18 or older and only for legal services.`
      },
      {
        question: "What does ID verified mean?",
        answer: "ID verified means the profile has submitted verification documents that were reviewed by the admin. Profiles without the blue verification signal should be treated as not ID verified."
      },
      {
        question: "Can I see only verified or featured profiles?",
        answer: "Yes. Use the filters at the top of the page to show featured profiles only or ID verified profiles only."
      },
      {
        question: `Is this ${cityName} page for adults only?`,
        answer: `Yes. ${primaryKeyword} is an age-restricted category page intended only for adults aged 18 or older and for legal services only.`
      }
    ]
    : [
      {
        question: `How are ${lower(categoryName)} in ${cityName} ranked?`,
        answer: "Active featured profiles appear first and rotate fairly. Normal approved profiles are then shown by latest activity so newer approved listings are easy to discover."
      },
      {
        question: `What details should I compare before choosing ${lower(categoryName)}?`,
        answer: `Compare ${intentContent.profileFields.join(", ")}, reviews, location fit and response options before contacting a provider.`
      },
      {
        question: "Why do some listings show a verified badge?",
        answer: "Verified badges are shown only when the profile has completed the relevant verification step. Public pages only show approved profiles."
      },
      {
        question: `Can I search inside ${primaryKeyword}?`,
        answer: "Yes. Use the search field for provider names, services, local areas and specialist terms. You can also filter to featured or verified profiles."
      },
      {
        question: "How do I contact a provider?",
        answer: "Open the profile page to review details, gallery media, services and contact options. Featured profiles may show direct call or WhatsApp actions."
      }
    ];

  return {
    cityName,
    countryName: currentCountryName,
    categoryName,
    primaryKeyword,
    title,
    description,
    heroDescription,
    introTitle: isAdult ? `About ${primaryKeyword}` : `Find ${primaryKeyword}`,
    intro: `${intentContent.summary} The page is focused on ${cityName}, ${currentCountryName}, so visitors can compare one city and one category without mixing unrelated results.`,
    trustTitle: isAdult ? "Trust and verification signals" : "Trust signals on this page",
    trustPoints,
    compareTitle: isAdult ? "How to compare profiles" : "How to compare providers",
    comparePoints,
    localTitle: `${categoryName} serving clients in ${cityName}`,
    localCopy: `Use this page to compare ${lower(categoryName)} who serve clients in ${cityName}, ${currentCountryName}. Review profile details, service coverage, pricing notes, availability, gallery media, reviews and contact methods before you call, message or send a booking request.`,
    intentTitle: `Search intent for ${primaryKeyword}`,
    intentCopy: intentContent.audience,
    decisionPoints: intentContent.compare,
    profileSignals: intentContent.profileFields,
    longTailKeywords: intentContent.longTail.map((term) => `${categoryName} ${term} in ${cityName}`),
    faq,
    relatedCityLinks,
    relatedCategoryLinks
  };
}
