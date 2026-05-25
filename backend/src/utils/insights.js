import crypto from 'crypto';

export const INSIGHT_TYPES = new Set([
  'PROFILE_VIEW',
  'WHATSAPP_CLICK',
  'PHONE_CLICK',
  'WEBSITE_CLICK',
  'CONTACT_CLICK',
  'LEAD_SUBMITTED'
]);

export function normalizeInsightType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return INSIGHT_TYPES.has(normalized) ? normalized : undefined;
}

export function hashSignal(value) {
  return value ? crypto.createHash('sha256').update(String(value)).digest('hex') : null;
}

export function insightPayload(req, type, profileId) {
  return {
    profileId,
    type,
    referrer: req.get('referer') || req.get('referrer') || null,
    ipHash: hashSignal(req.ip || req.socket?.remoteAddress),
    userAgentHash: hashSignal(req.get('user-agent'))
  };
}

export function countsFromGroups(groups) {
  return groups.reduce((summary, item) => {
    summary[item.type] = item._count?._all || 0;
    return summary;
  }, {
    PROFILE_VIEW: 0,
    WHATSAPP_CLICK: 0,
    PHONE_CLICK: 0,
    WEBSITE_CLICK: 0,
    CONTACT_CLICK: 0,
    LEAD_SUBMITTED: 0
  });
}

export async function profileInsightSummary(prisma, profileIds, days = 30) {
  const ids = Array.isArray(profileIds) ? profileIds.filter(Boolean) : [];
  if (!ids.length) return countsFromGroups([]);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const groups = await prisma.profileInsightEvent.groupBy({
    by: ['type'],
    where: {
      profileId: { in: ids },
      createdAt: { gte: since }
    },
    _count: { _all: true }
  });
  return countsFromGroups(groups);
}
