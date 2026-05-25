export const FEATURED_DURATIONS = [3, 7, 10, 15, 30];
export const FEATURED_PAGE_TYPES = ['CITY_CATEGORY', 'CITY', 'CATEGORY', 'COUNTRY', 'HOME'];
export const FEATURED_CURRENCY = 'INR';

const DEFAULT_PRICE_TABLE = {
  CITY_CATEGORY: { 3: 299, 7: 599, 10: 799, 15: 1099, 30: 1999 },
  CITY: { 3: 399, 7: 799, 10: 1099, 15: 1599, 30: 2799 },
  CATEGORY: { 3: 499, 7: 999, 10: 1399, 15: 1999, 30: 3499 },
  COUNTRY: { 3: 799, 7: 1499, 10: 1999, 15: 2999, 30: 5499 },
  HOME: { 3: 1499, 7: 2999, 10: 3999, 15: 5499, 30: 9999 }
};

function clean(value) {
  return String(value || '').trim().toLowerCase();
}

function citySlug(profile) {
  return clean(profile?.city?.slug || profile?.citySlug || profile?.cityId);
}

function categorySlug(profile) {
  return clean(profile?.category?.slug || profile?.categoryId);
}

function countryCode(profile) {
  return clean(profile?.country?.code || profile?.countryId);
}

function cityName(profile) {
  return profile?.city?.name || citySlug(profile);
}

function categoryName(profile) {
  return profile?.category?.name || categorySlug(profile);
}

function countryName(profile) {
  return profile?.country?.name || countryCode(profile).toUpperCase();
}

export function normalizeFeaturedDays(value, fallback = 7) {
  const days = Number(value || fallback);
  return FEATURED_DURATIONS.includes(days) ? days : fallback;
}

export function normalizeFeaturedPageType(value, fallback = 'CITY_CATEGORY') {
  const normalized = String(value || fallback).trim().toUpperCase().replace(/[-\s]+/g, '_');
  if (normalized === 'CATEGORY_LOCAL' || normalized === 'CITYCATEGORY') return 'CITY_CATEGORY';
  if (normalized === 'COUNTRY_PAGE') return 'COUNTRY';
  if (normalized === 'HOME_PAGE') return 'HOME';
  if (FEATURED_PAGE_TYPES.includes(normalized)) return normalized;
  return fallback;
}

export function pricingScopeKey({ pageType, countryId, citySlug: city, categoryId }) {
  const type = normalizeFeaturedPageType(pageType);
  const country = clean(countryId);
  const cityValue = clean(city);
  const category = clean(categoryId);

  if (type === 'HOME') return 'HOME';
  if (type === 'COUNTRY') return `COUNTRY:${country}`;
  if (type === 'CITY') return `CITY:${country}/${cityValue}`;
  if (type === 'CATEGORY') return `CATEGORY:${category}`;
  return `CITY_CATEGORY:${country}/${cityValue}/${category}`;
}

export function placementPath({ pageType, countryId, citySlug: city, categoryId }) {
  const type = normalizeFeaturedPageType(pageType);
  const country = clean(countryId);
  const cityValue = clean(city);
  const category = clean(categoryId);

  if (type === 'HOME') return '/';
  if (type === 'COUNTRY') return `/${country}`;
  if (type === 'CITY') return `/${country}/${cityValue}`;
  if (type === 'CATEGORY') return `/${category}`;
  return `/${country}/${cityValue}/${category}`;
}

export function placementOptionsForProfile(profile) {
  const country = countryCode(profile);
  const city = citySlug(profile);
  const category = categorySlug(profile);
  const optionSeed = [
    {
      pageType: 'CITY_CATEGORY',
      countryId: country,
      citySlug: city,
      categoryId: category,
      label: `${categoryName(profile)} in ${cityName(profile)}`,
      description: 'Most targeted placement on the exact city and category page.'
    },
    {
      pageType: 'CITY',
      countryId: country,
      citySlug: city,
      categoryId: category,
      label: `${cityName(profile)} city page`,
      description: 'Broad local visibility across all categories in this city.'
    },
    {
      pageType: 'CATEGORY',
      countryId: country,
      citySlug: city,
      categoryId: category,
      label: `All ${categoryName(profile)} category page`,
      description: 'Category-wide placement across available cities.'
    },
    {
      pageType: 'COUNTRY',
      countryId: country,
      citySlug: city,
      categoryId: category,
      label: `${countryName(profile)} country page`,
      description: 'Country-level visibility connected to this profile.'
    },
    {
      pageType: 'HOME',
      countryId: country,
      citySlug: city,
      categoryId: category,
      label: 'Home page',
      description: 'Highest visibility placement on the directory homepage.'
    }
  ];

  const seen = new Set();
  return optionSeed.map((option) => {
    const scopeKey = pricingScopeKey(option);
    return {
      ...option,
      scopeKey,
      pagePath: placementPath(option)
    };
  }).filter((option) => {
    if (seen.has(option.scopeKey)) return false;
    seen.add(option.scopeKey);
    return true;
  });
}

export function defaultFeaturedPrice(pageType, durationDays) {
  const type = normalizeFeaturedPageType(pageType);
  return DEFAULT_PRICE_TABLE[type]?.[durationDays] ?? DEFAULT_PRICE_TABLE.CITY_CATEGORY[durationDays] ?? 0;
}

export function normalizeCurrency(value) {
  const currency = String(value || FEATURED_CURRENCY).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : FEATURED_CURRENCY;
}

function priceFromRule(rule, option, days) {
  return {
    days,
    priceAmount: rule?.priceAmount ?? defaultFeaturedPrice(option.pageType, days),
    currency: rule?.currency || FEATURED_CURRENCY,
    custom: Boolean(rule)
  };
}

export async function pricedPlacementOptions(prisma, profile, currency = FEATURED_CURRENCY) {
  const normalizedCurrency = normalizeCurrency(currency);
  const options = placementOptionsForProfile(profile);
  const scopeKeys = options.map((option) => option.scopeKey);
  const rules = scopeKeys.length ? await prisma.featuredPlacementPrice.findMany({
    where: {
      scopeKey: { in: scopeKeys },
      durationDays: { in: FEATURED_DURATIONS },
      currency: normalizedCurrency,
      isActive: true
    }
  }) : [];
  const ruleMap = new Map(rules.map((rule) => [`${rule.scopeKey}:${rule.durationDays}:${rule.currency}`, rule]));

  return options.map((option) => ({
    ...option,
    durations: FEATURED_DURATIONS.map((days) => priceFromRule(ruleMap.get(`${option.scopeKey}:${days}:${normalizedCurrency}`), option, days))
  }));
}

export async function resolvePlacementSelection(prisma, profile, body = {}) {
  const currency = normalizeCurrency(body.currency);
  const requestedDays = normalizeFeaturedDays(body.requestedDays || body.days || body.duration);
  const rawType = body.requestedPage || body.pageType || body.page || body.placement;
  const isLegacyCategoryRequest = !body.placementKey && !body.scopeKey && !body.pageType && String(rawType || '').trim().toUpperCase() === 'CATEGORY';
  const requestedType = isLegacyCategoryRequest ? 'CITY_CATEGORY' : normalizeFeaturedPageType(rawType);
  const requestedKey = String(body.placementKey || body.scopeKey || '').trim();
  const options = await pricedPlacementOptions(prisma, profile, currency);
  const option = options.find((item) => item.scopeKey === requestedKey)
    || options.find((item) => item.pageType === requestedType)
    || options[0];
  const price = option.durations.find((item) => item.days === requestedDays) || option.durations[0];

  return {
    ...option,
    requestedDays,
    priceAmount: price.priceAmount,
    currency: price.currency,
    customPrice: price.custom
  };
}

export function normalizePricingScope(body = {}) {
  const pageType = normalizeFeaturedPageType(body.pageType || body.requestedPage || body.placement);
  const countryId = clean(body.countryId || body.country);
  const city = clean(body.citySlug || body.city);
  const categoryId = clean(body.categoryId || body.category);

  if (pageType === 'COUNTRY' && !countryId) throw Object.assign(new Error('Country is required for country pricing.'), { statusCode: 400 });
  if (pageType === 'CITY' && (!countryId || !city)) throw Object.assign(new Error('Country and city are required for city pricing.'), { statusCode: 400 });
  if (pageType === 'CATEGORY' && !categoryId) throw Object.assign(new Error('Category is required for category pricing.'), { statusCode: 400 });
  if (pageType === 'CITY_CATEGORY' && (!countryId || !city || !categoryId)) {
    throw Object.assign(new Error('Country, city and category are required for city/category pricing.'), { statusCode: 400 });
  }

  const scope = {
    pageType,
    countryId: pageType === 'HOME' || pageType === 'CATEGORY' ? null : countryId,
    citySlug: pageType === 'CITY' || pageType === 'CITY_CATEGORY' ? city : null,
    categoryId: pageType === 'CATEGORY' || pageType === 'CITY_CATEGORY' ? categoryId : null
  };

  return {
    ...scope,
    scopeKey: pricingScopeKey(scope),
    pagePath: placementPath(scope)
  };
}
