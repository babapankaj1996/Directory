const HOT_SCORE = 75;
const WARM_SCORE = 45;

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function qualityFromScore(score) {
  if (score >= HOT_SCORE) return 'HOT';
  if (score >= WARM_SCORE) return 'WARM';
  return 'COLD';
}

export function scoreLead({
  email,
  phone,
  whatsapp,
  serviceNeeded,
  preferredDate,
  preferredTime,
  message,
  budget,
  timeline,
  contactPreference,
  userId
}) {
  const digits = String(phone || '').replace(/\D/g, '');
  let score = 20;
  if (digits.length >= 10) score += 12;
  else if (digits.length >= 7) score += 7;
  if (email) score += 10;
  if (whatsapp) score += 8;
  if (serviceNeeded) score += 10;
  if (preferredDate) score += 10;
  if (preferredTime) score += 5;
  if (budget) score += 10;
  if (timeline) score += 7;
  if (contactPreference) score += 5;
  if (userId) score += 8;

  const messageLength = String(message || '').trim().length;
  if (messageLength >= 160) score += 10;
  else if (messageLength >= 60) score += 6;
  else if (messageLength > 0) score += 3;

  const leadScore = clampScore(score);
  return {
    leadScore,
    leadQuality: qualityFromScore(leadScore)
  };
}

export function statusTimestampData(existingLead, nextStatus) {
  const now = new Date();
  const data = {};
  const current = existingLead?.status;
  if (current === nextStatus) return data;
  if ((nextStatus === 'CONTACTED' || nextStatus === 'CONVERTED') && !existingLead?.responseAt) {
    data.responseAt = now;
  }
  if (nextStatus === 'CONVERTED' && !existingLead?.convertedAt) {
    data.convertedAt = now;
  }
  return data;
}

export function responseMinutes(lead) {
  if (!lead?.responseAt || !lead?.createdAt) return null;
  const created = new Date(lead.createdAt).getTime();
  const responded = new Date(lead.responseAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(responded) || responded < created) return null;
  return Math.round((responded - created) / 60000);
}

export function leadQualitySummary(leads = [], insights = {}) {
  const total = leads.length;
  const hot = leads.filter((lead) => lead.leadQuality === 'HOT').length;
  const warm = leads.filter((lead) => lead.leadQuality === 'WARM').length;
  const cold = leads.filter((lead) => lead.leadQuality === 'COLD').length;
  const converted = leads.filter((lead) => lead.status === 'CONVERTED').length;
  const contacted = leads.filter((lead) => ['CONTACTED', 'CONVERTED', 'LOST'].includes(lead.status)).length;
  const scoreSum = leads.reduce((sum, lead) => sum + Number(lead.leadScore || 0), 0);
  const responseTimes = leads.map(responseMinutes).filter((value) => typeof value === 'number');
  const totalViews = Number(insights.PROFILE_VIEW || insights.TOTAL_VIEW_COUNT || 0);

  return {
    total,
    hot,
    warm,
    cold,
    contacted,
    converted,
    avgScore: total ? Math.round(scoreSum / total) : 0,
    avgResponseMinutes: responseTimes.length
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : null,
    conversionRate: total ? Math.round((converted / total) * 100) : 0,
    contactRate: total ? Math.round((contacted / total) * 100) : 0,
    viewToLeadRate: totalViews ? Number(((total / totalViews) * 100).toFixed(1)) : 0,
    viewsPerLead: total ? Math.round(totalViews / total) : null
  };
}

export function breakdownBy(leads, keyFn) {
  const map = new Map();
  leads.forEach((lead) => {
    const key = keyFn(lead) || 'Unknown';
    const current = map.get(key) || [];
    current.push(lead);
    map.set(key, current);
  });
  return [...map.entries()]
    .map(([label, items]) => ({
      label,
      ...leadQualitySummary(items)
    }))
    .sort((first, second) => second.total - first.total || second.avgScore - first.avgScore);
}
