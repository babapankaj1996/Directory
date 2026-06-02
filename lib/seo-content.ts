import { type Category, type Listing } from "@/lib/data";
import { formatRouteName } from "@/lib/utils";

type CopyVars = {
  category: string;
  city: string;
  country: string;
};

export type CategorySearchContent = {
  summary: string;
  audience: string;
  compare: string[];
  profileFields: string[];
  longTail: string[];
  trust: string[];
};

const standardFallback: CategorySearchContent = {
  summary: "{category} pages help visitors compare approved local providers by service focus, profile detail, reviews, gallery media and direct response options.",
  audience: "Use this page when you want a focused shortlist of professionals who match your location, budget, availability and service requirement.",
  compare: [
    "Service focus, experience, portfolio or gallery quality.",
    "Location fit, response options, pricing notes and profile completeness.",
    "Verification signals, reviews and featured placement status."
  ],
  profileFields: ["services", "pricing notes", "gallery", "reviews", "contact options"],
  longTail: ["near me", "verified profiles", "with reviews", "same day contact", "quote request"],
  trust: ["admin approved profiles", "verified signals", "review history", "clear contact paths"]
};

const adultFallback: CategorySearchContent = {
  summary: "{category} pages are age-restricted directory pages for adults who want to compare approved profiles by verification, gallery, rates, availability and booking notes.",
  audience: "Use this page only if you are 18 or older and looking for legal adult companionship or related social services.",
  compare: [
    "ID verification status, age-restricted profile details and gallery quality.",
    "Availability, booking type, minimum duration, rates or donation notes.",
    "Location fit, language preferences and safe contact options."
  ],
  profileFields: ["ID status", "gallery", "availability", "rates", "booking type"],
  longTail: ["18+ verified profiles", "with rates", "with gallery", "available by appointment", "local adult profiles"],
  trust: ["18+ category labeling", "admin approval", "ID verification signals", "legal services only"]
};

const categoryCopy: Record<string, CategorySearchContent> = {
  astrologer: {
    summary: "{category} pages focus on kundli, horoscope, vastu, numerology, palmistry and spiritual consultation profiles in one local result page.",
    audience: "Useful for visitors comparing astrologers by tradition, consultation style, languages, review history and response options.",
    compare: [
      "Specialties such as kundli matching, vastu, numerology, palmistry or birth chart readings.",
      "Consultation format, language, experience, profile details and client reviews.",
      "Verified signals, gallery media, direct contact options and quote request availability."
    ],
    profileFields: ["kundli services", "vastu guidance", "languages", "reviews", "contact options"],
    longTail: ["kundli matching", "vastu consultant", "birth chart reading", "palmist", "online astrology"],
    trust: ["approved astrology profiles", "review signals", "service details", "verified badge where available"]
  },
  lawyers: {
    summary: "{category} pages organize advocates and legal consultants by practice area, city, documentation support and consultation availability.",
    audience: "Useful for users comparing legal help before booking a call or sending case details.",
    compare: [
      "Practice areas such as family, property, business, criminal, civil or documentation support.",
      "Court or jurisdiction relevance, consultation mode, experience and response time.",
      "Verified status, review history, contact options and profile completeness."
    ],
    profileFields: ["practice areas", "consultation mode", "location", "reviews", "quote request"],
    longTail: ["legal consultant", "property lawyer", "family lawyer", "documentation help", "advocate near me"],
    trust: ["approved legal profiles", "practice details", "review signals", "direct inquiry flow"]
  },
  doctors: {
    summary: "{category} pages help patients compare clinics and medical professionals by specialty, location, appointment details and public profile quality.",
    audience: "Useful when visitors need to shortlist healthcare providers before calling or requesting an appointment.",
    compare: [
      "Specialty, clinic location, appointment availability and consultation notes.",
      "Reviews, gallery or clinic media, profile completeness and contact methods.",
      "Verification signals and whether the profile gives clear next steps."
    ],
    profileFields: ["specialty", "clinic details", "appointment notes", "reviews", "contact options"],
    longTail: ["clinic appointment", "family doctor", "specialist near me", "verified doctor", "health consultation"],
    trust: ["approved healthcare profiles", "location details", "reviews", "clear contact paths"]
  },
  "home-tutors": {
    summary: "{category} pages group private teachers, subject experts and online tutors by grade level, subject, city and learning format.",
    audience: "Useful for parents and students comparing tutoring help before starting a class or trial session.",
    compare: [
      "Subjects, grade level, board, online or home visit format.",
      "Teaching experience, availability, pricing notes and location fit.",
      "Reviews, profile detail and quote request options."
    ],
    profileFields: ["subjects", "grade level", "teaching mode", "availability", "fees"],
    longTail: ["math tutor", "science tutor", "home tuition", "online tutor", "private classes"],
    trust: ["approved tutor profiles", "subject details", "review signals", "quote request flow"]
  },
  "makeup-artists": {
    summary: "{category} pages focus on bridal, party, engagement and event makeup providers with portfolios and booking notes.",
    audience: "Useful for comparing style, service packages, travel availability and event date fit.",
    compare: [
      "Portfolio quality, bridal or party specialization, package notes and venue travel.",
      "Trial availability, pricing notes, reviews and gallery media.",
      "Contact options for date checks and quote requests."
    ],
    profileFields: ["portfolio", "bridal packages", "event travel", "reviews", "pricing notes"],
    longTail: ["bridal makeup", "party makeup", "makeup trial", "wedding artist", "event makeup"],
    trust: ["approved artist profiles", "gallery media", "review signals", "clear booking details"]
  },
  photographers: {
    summary: "{category} pages help visitors compare wedding, event, portrait and commercial photographers by portfolio, location and package notes.",
    audience: "Useful for shortlisting photographers before sharing event dates, venues or shoot requirements.",
    compare: [
      "Portfolio style, shoot type, deliverables, team size and editing notes.",
      "Availability, package details, reviews and location coverage.",
      "Gallery quality and direct quote request options."
    ],
    profileFields: ["portfolio", "shoot type", "packages", "delivery notes", "reviews"],
    longTail: ["wedding photographer", "event photographer", "portfolio shoot", "portrait studio", "commercial photos"],
    trust: ["approved photographer profiles", "portfolio media", "review signals", "quote requests"]
  },
  "fitness-trainers": {
    summary: "{category} pages organize personal trainers, yoga coaches and wellness instructors by training style, location and availability.",
    audience: "Useful for comparing coaching formats before booking a session or sending goals.",
    compare: [
      "Training style, certification notes, gym or home visit availability and online coaching.",
      "Program focus, pricing notes, reviews and contact options.",
      "Profile completeness and verification signals where available."
    ],
    profileFields: ["training style", "session format", "goals", "fees", "reviews"],
    longTail: ["personal trainer", "yoga coach", "weight loss trainer", "home workout", "online fitness"],
    trust: ["approved trainer profiles", "program details", "review signals", "clear response options"]
  },
  "real-estate-agents": {
    summary: "{category} pages help buyers, sellers and renters compare property advisors by city, property type, local knowledge and contact options.",
    audience: "Useful for visitors who need local property help before scheduling a site visit.",
    compare: [
      "Property type, locality knowledge, buying, selling or rental support.",
      "Site visit coordination, pricing notes, reviews and response channels.",
      "Profile completeness and verified signals."
    ],
    profileFields: ["property type", "locality focus", "site visit", "reviews", "contact options"],
    longTail: ["property broker", "rental agent", "home sale", "site visit", "real estate advisor"],
    trust: ["approved property profiles", "local details", "review signals", "direct contact"]
  },
  "financial-advisors": {
    summary: "{category} pages group tax, insurance, investment and financial planning professionals by service area and consultation fit.",
    audience: "Useful for comparing finance help before sharing financial goals or requesting a call.",
    compare: [
      "Service focus such as tax, insurance, investment, retirement or business finance.",
      "Consultation format, experience notes, pricing model and response options.",
      "Verified status, reviews and profile detail."
    ],
    profileFields: ["finance services", "consultation mode", "experience", "pricing notes", "reviews"],
    longTail: ["tax advisor", "insurance advisor", "investment consultant", "financial planning", "business finance"],
    trust: ["approved finance profiles", "service details", "review signals", "quote requests"]
  },
  "web-designers": {
    summary: "{category} pages help businesses compare website designers by portfolio, service scope, platform experience and project fit.",
    audience: "Useful for founders, local businesses and service providers planning a new website or redesign.",
    compare: [
      "Portfolio quality, landing page, ecommerce, UI design or redesign experience.",
      "Delivery timeline, maintenance notes, pricing model and communication style.",
      "Profile detail, reviews and direct quote request options."
    ],
    profileFields: ["portfolio", "platforms", "project scope", "timeline", "pricing notes"],
    longTail: ["website designer", "landing page design", "ecommerce website", "UI design", "business website"],
    trust: ["approved web profiles", "portfolio signals", "review history", "quote request flow"]
  },
  "digital-marketers": {
    summary: "{category} pages organize SEO, ads, social media and lead generation specialists by channel focus and local business fit.",
    audience: "Useful for businesses comparing marketing support before requesting a campaign plan.",
    compare: [
      "Channel focus such as SEO, paid ads, social media, content or local lead generation.",
      "Case notes, packages, reporting style, reviews and response options.",
      "Profile completeness and verified signals."
    ],
    profileFields: ["marketing channels", "campaign scope", "reporting", "packages", "reviews"],
    longTail: ["SEO expert", "Google Ads consultant", "social media marketing", "lead generation", "local SEO"],
    trust: ["approved marketing profiles", "service scope", "review signals", "quote requests"]
  },
  electricians: {
    summary: "{category} pages help visitors compare residential and commercial electrical repair providers by location, urgency and service detail.",
    audience: "Useful for homeowners and businesses looking for repair, installation or maintenance support.",
    compare: [
      "Repair type, emergency availability, residential or commercial scope.",
      "Location coverage, pricing notes, reviews and direct contact options.",
      "Profile approval, verified signals and response paths."
    ],
    profileFields: ["repair type", "availability", "service area", "pricing notes", "contact options"],
    longTail: ["wiring repair", "emergency electrician", "switchboard repair", "home electrician", "commercial electrician"],
    trust: ["approved repair profiles", "service details", "reviews", "call options"]
  },
  plumbers: {
    summary: "{category} pages group plumbing repair and fitting providers by city, service type, urgency and contact availability.",
    audience: "Useful for visitors who need leak repair, fitting work, maintenance or emergency plumbing help.",
    compare: [
      "Leak repair, bathroom fitting, pipe work, maintenance or emergency support.",
      "Location coverage, pricing notes, response time and reviews.",
      "Approved profile status and direct contact options."
    ],
    profileFields: ["service type", "response time", "location", "pricing notes", "reviews"],
    longTail: ["leak repair", "emergency plumber", "bathroom fitting", "pipe repair", "plumber near me"],
    trust: ["approved plumbing profiles", "repair details", "review signals", "call options"]
  },
  "car-mechanics": {
    summary: "{category} pages help vehicle owners compare garages, mobile mechanics and inspection providers by service type and location.",
    audience: "Useful before booking repairs, maintenance, detailing, diagnostics or inspection help.",
    compare: [
      "Vehicle service type, diagnostic support, garage or doorstep availability.",
      "Pricing notes, turnaround time, reviews and contact methods.",
      "Profile detail, gallery media and verified signals."
    ],
    profileFields: ["vehicle services", "garage details", "turnaround", "pricing notes", "reviews"],
    longTail: ["car repair", "mechanic near me", "vehicle inspection", "car service", "detailing"],
    trust: ["approved mechanic profiles", "service detail", "review history", "direct contact"]
  },
  "interior-designers": {
    summary: "{category} pages organize home, office and commercial interior designers by project type, portfolio and local coverage.",
    audience: "Useful when comparing design style, execution support, budgets and consultation fit.",
    compare: [
      "Portfolio style, residential or commercial scope, consultation and execution support.",
      "Budget notes, timeline, reviews and gallery media.",
      "Verified signals and quote request options."
    ],
    profileFields: ["portfolio", "project type", "budget notes", "timeline", "reviews"],
    longTail: ["home interior", "office interior", "modular design", "renovation design", "interior consultant"],
    trust: ["approved designer profiles", "portfolio media", "review signals", "quote request"]
  },
  "event-planners": {
    summary: "{category} pages help users compare wedding, party and corporate event planners by event type, city and execution capability.",
    audience: "Useful before sharing event dates, guest count, venue details or budget.",
    compare: [
      "Event type, venue support, decor, vendor coordination and planning packages.",
      "Gallery media, reviews, pricing notes and availability.",
      "Profile completeness and contact options."
    ],
    profileFields: ["event type", "packages", "venue support", "gallery", "reviews"],
    longTail: ["wedding planner", "party planner", "corporate events", "decor planning", "event management"],
    trust: ["approved planner profiles", "gallery media", "review signals", "quote requests"]
  },
  "female-escorts": {
    ...adultFallback,
    summary: "{category} pages are 18+ local directories for adults comparing approved female companionship profiles by ID status, gallery, rates and availability.",
    longTail: ["female companions", "18+ verified profiles", "with rates", "with gallery", "by appointment"]
  },
  "male-escorts": {
    ...adultFallback,
    summary: "{category} pages are 18+ local directories for adults comparing approved male companionship profiles by ID status, availability, gallery and booking notes.",
    longTail: ["male companions", "18+ verified profiles", "with gallery", "event date", "by appointment"]
  },
  "trans-escorts": {
    ...adultFallback,
    summary: "{category} pages are 18+ directories for adults comparing approved trans companionship profiles with clear verification, availability and contact details.",
    longTail: ["trans companions", "18+ verified profiles", "with gallery", "local adult profiles", "by appointment"]
  },
  "independent-escorts": {
    ...adultFallback,
    summary: "{category} pages focus on independent 18+ companionship profiles with admin approval, verification signals, gallery media and booking details.",
    longTail: ["independent companions", "verified adult profiles", "with rates", "with gallery", "local adult directory"]
  },
  "vip-companions": {
    ...adultFallback,
    summary: "{category} pages are 18+ directories for premium social companionship profiles, focused on verified details, availability, events and travel notes.",
    longTail: ["vip companions", "premium companion", "event date", "travel date", "verified adult profiles"]
  },
  "dating-companions": {
    ...adultFallback,
    summary: "{category} pages help adults compare social date and public outing companion profiles by location, availability, rates and verification signals.",
    longTail: ["dating companions", "public outing", "dinner date", "event date", "18+ profiles"]
  },
  "party-companions": {
    ...adultFallback,
    summary: "{category} pages help adults compare approved social companions for public parties, events and nightlife plans with clear booking notes.",
    longTail: ["party companions", "event companion", "public event", "late night availability", "18+ profiles"]
  },
  "travel-companions": {
    ...adultFallback,
    summary: "{category} pages help adults compare approved travel companion profiles by destination fit, availability, duration and verification signals.",
    longTail: ["travel companions", "extended booking", "travel date", "overnight", "verified adult profiles"]
  },
  "rent-a-girlfriend": {
    ...adultFallback,
    summary: "{category} pages focus on 18+ social companionship and public outing profiles with availability, rates, gallery and contact details.",
    longTail: ["rent a girlfriend", "public outing", "dinner date", "event date", "18+ companion"]
  },
  "rent-a-boyfriend": {
    ...adultFallback,
    summary: "{category} pages focus on 18+ social companionship and public outing profiles with verification signals, availability, rates and gallery details.",
    longTail: ["rent a boyfriend", "public outing", "dinner date", "event date", "18+ companion"]
  },
  "massage-services": {
    ...adultFallback,
    summary: "{category} pages are age-restricted directories for adult massage and bodywork profiles with verification, availability and rate details.",
    longTail: ["massage services", "bodywork", "with rates", "by appointment", "18+ profiles"]
  },
  "adult-massage-services": {
    ...adultFallback,
    summary: "{category} pages are 18+ directories for adult massage and bodywork profiles with clear verification, gallery and booking details.",
    longTail: ["adult massage", "bodywork profiles", "with rates", "by appointment", "18+ verified profiles"]
  },
  "adult-models": {
    ...adultFallback,
    summary: "{category} pages help adults compare approved adult model profiles by portfolio, gallery, availability and verification status.",
    longTail: ["adult models", "portfolio profiles", "with gallery", "event booking", "18+ verified profiles"]
  },
  "social-companions": {
    ...adultFallback,
    summary: "{category} pages help adults compare approved social companionship profiles for public outings, events and appointments.",
    longTail: ["social companions", "public outing", "event date", "dinner date", "18+ profiles"]
  }
};

function cleanTemplate(value: string, vars: CopyVars) {
  return value
    .replaceAll("{category}", vars.category)
    .replaceAll("{city}", vars.city)
    .replaceAll("{country}", vars.country);
}

export function getCategorySearchContent(category: Category): CategorySearchContent {
  const fallback = category.isAdult ? adultFallback : standardFallback;
  const specific = categoryCopy[category.slug] || {};
  return { ...fallback, ...specific };
}

export function localizeCategoryContent(content: CategorySearchContent, vars: CopyVars): CategorySearchContent {
  return {
    summary: cleanTemplate(content.summary, vars),
    audience: cleanTemplate(content.audience, vars),
    compare: content.compare.map((item) => cleanTemplate(item, vars)),
    profileFields: content.profileFields.map((item) => cleanTemplate(item, vars)),
    longTail: content.longTail.map((item) => cleanTemplate(item, vars)),
    trust: content.trust.map((item) => cleanTemplate(item, vars))
  };
}

export function categoryKeywordExamples(category: Category, city?: string) {
  const cityName = city ? formatRouteName(city) : "";
  const content = getCategorySearchContent(category);
  return content.longTail.slice(0, 5).map((term) => {
    const suffix = cityName ? ` in ${cityName}` : "";
    return `${category.name} ${term}${suffix}`;
  });
}

type ActiveCitySource = {
  slug: string;
  name: string;
  countryCode?: string;
};

type GlobalCitySource = {
  country: string;
  city: string;
  cityName: string;
};

export function activeCityLinks(country: string, listings: Listing[], activeCities: ActiveCitySource[] = [], limit = 8) {
  const counts = new Map<string, number>();
  listings.forEach((listing) => {
    if (listing.country === country) counts.set(listing.city, (counts.get(listing.city) || 0) + 1);
  });
  return activeCities
    .map((city) => ({ ...city, count: counts.get(city.slug) || 0 }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))
    .slice(0, limit)
    .map((city) => ({
      label: `${city.name} service providers`,
      href: `/${country}/${city.slug}`,
      count: city.count
    }));
}

export function globalCategoryCityLinks(category: Category, listings: Listing[], activeCities: GlobalCitySource[] = [], limit = 8) {
  const activeKeys = new Set(activeCities.map((city) => `${city.country}/${city.city}`));
  const listingKeys = new Set<string>();
  const fromListings = listings
    .filter((listing) => listing.categorySlug === category.slug)
    .map((listing) => ({
      country: listing.country,
      city: listing.city,
      cityName: listing.cityName || formatRouteName(listing.city),
      count: listings.filter((item) => item.categorySlug === category.slug && item.country === listing.country && item.city === listing.city).length
    }))
    .filter((item) => {
      const key = `${item.country}/${item.city}`;
      if (!activeKeys.has(key)) return false;
      if (listingKeys.has(key)) return false;
      listingKeys.add(key);
      return true;
    });

  const emitted = new Set<string>();
  return [
    ...fromListings,
    ...activeCities.map((city) => ({ ...city, count: 0 }))
  ]
    .filter((item) => {
      const key = `${item.country}/${item.city}`;
      if (emitted.has(key)) return false;
      emitted.add(key);
      return true;
    })
    .sort((first, second) => second.count - first.count || first.cityName.localeCompare(second.cityName))
    .slice(0, limit)
    .map((item) => ({
      label: `${category.name} in ${item.cityName}`,
      href: `/${item.country}/${item.city}/${category.slug}`,
      count: item.count
    }));
}
