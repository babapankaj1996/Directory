const DAY_MS = 24 * 60 * 60 * 1000;

function time(value) {
  const date = value ? new Date(value) : null;
  const stamp = date?.getTime() || 0;
  return Number.isFinite(stamp) ? stamp : 0;
}

export function normalizePlacementPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw === '*' || raw.toUpperCase() === 'ALL') return 'ALL';
  const withoutOrigin = raw.replace(/^https?:\/\/[^/]+/i, '');
  const path = withoutOrigin.startsWith('/') ? withoutOrigin : `/${withoutOrigin}`;
  return path.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

function activeCampaignWindow(campaign, now) {
  if (!campaign || String(campaign.status || '').toUpperCase() !== 'ACTIVE') return false;
  const nowStamp = now.getTime();
  const startsAt = time(campaign.startsAt);
  const endsAt = time(campaign.endsAt);
  return (!startsAt || startsAt <= nowStamp) && (!endsAt || endsAt >= nowStamp);
}

export function isActivePlacementCampaign(campaign, pagePath, now = new Date()) {
  if (!activeCampaignWindow(campaign, now)) return false;
  const normalizedPage = normalizePlacementPath(pagePath);
  const campaignPath = normalizePlacementPath(campaign.pagePath);
  const pageType = String(campaign.pageType || '').toUpperCase();
  if (!normalizedPage) return true;
  return campaignPath === normalizedPage || campaignPath === 'ALL' || pageType === 'ALL';
}

export function activeFeaturedCampaign(profile, pagePath, now = new Date()) {
  const campaigns = Array.isArray(profile?.featuredPlacementCampaigns) ? profile.featuredPlacementCampaigns : [];
  return campaigns.find((campaign) => isActivePlacementCampaign(campaign, pagePath, now));
}

export function activePlacementCampaignWhere(pagePath, now = new Date()) {
  const normalizedPage = normalizePlacementPath(pagePath);
  const windowWhere = {
    status: 'ACTIVE',
    startsAt: { lte: now },
    OR: [
      { endsAt: null },
      { endsAt: { gte: now } }
    ]
  };
  if (!normalizedPage) return windowWhere;
  return {
    AND: [
      windowWhere,
      {
        OR: [
          { pagePath: normalizedPage },
          { pagePath: 'ALL' },
          { pageType: 'ALL' }
        ]
      }
    ]
  };
}

export function activeFeaturedWhere(now = new Date()) {
  return {
    isFeatured: true,
    OR: [
      { featuredUntil: null },
      { featuredUntil: { gte: now } }
    ]
  };
}

export function inactiveFeaturedWhere(now = new Date()) {
  return {
    OR: [
      { isFeatured: false },
      { featuredUntil: { lt: now } }
    ]
  };
}

export function expiredFeaturedWhere(now = new Date()) {
  return {
    isFeatured: true,
    featuredUntil: { lt: now }
  };
}

export function isActiveFeatured(profile, nowOrPath = new Date(), pagePath) {
  const now = nowOrPath instanceof Date ? nowOrPath : new Date();
  const placementPath = typeof nowOrPath === 'string' ? nowOrPath : pagePath;
  if (activeFeaturedCampaign(profile, placementPath, now)) return true;
  if (placementPath && Array.isArray(profile?.featuredPlacementCampaigns) && profile.featuredPlacementCampaigns.length) return false;
  if (!profile?.isFeatured) return false;
  const expiresAt = time(profile.featuredUntil);
  return !expiresAt || expiresAt >= now.getTime();
}

export function sortProfilesByFeatured(profiles, nowOrPath = new Date(), pagePath) {
  const now = nowOrPath instanceof Date ? nowOrPath : new Date();
  const placementPath = typeof nowOrPath === 'string' ? nowOrPath : pagePath;
  return [...profiles].sort((first, second) => {
    const featuredDiff = Number(isActiveFeatured(second, now, placementPath)) - Number(isActiveFeatured(first, now, placementPath));
    if (featuredDiff) return featuredDiff;
    const verifiedDiff = Number(second.verificationStatus === 'VERIFIED') - Number(first.verificationStatus === 'VERIFIED');
    if (verifiedDiff) return verifiedDiff;
    const ratingDiff = Number(second.rating || 0) - Number(first.rating || 0);
    if (ratingDiff) return ratingDiff;
    const reviewDiff = Number(second.reviewCount || 0) - Number(first.reviewCount || 0);
    if (reviewDiff) return reviewDiff;
    return time(second.createdAt) - time(first.createdAt);
  });
}

export function defaultFeaturedUntil(days = 30) {
  return new Date(Date.now() + days * DAY_MS);
}
