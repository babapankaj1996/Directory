const ADULT_REQUIRED_TYPES = ['GOV_ID', 'AGE_SELFIE'];

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized || '';
}

function latestDocumentsByType(documents = []) {
  const latest = new Map();
  [...documents]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .forEach((document) => {
      const type = String(document.type || 'OTHER').toUpperCase();
      if (!latest.has(type)) latest.set(type, document);
    });
  return latest;
}

export function computedVerificationStatus(profile = {}) {
  const documents = profile.verificationDocuments || [];
  const stored = normalizeStatus(profile.verificationStatus);
  if (!documents.length) {
    if (stored && stored !== 'NOT_REQUIRED') return stored;
    return profile.isAdult ? 'PENDING' : stored || 'NOT_REQUIRED';
  }

  const latest = latestDocumentsByType(documents);
  const requiredTypes = profile.isAdult ? ADULT_REQUIRED_TYPES : [...latest.keys()];
  const requiredDocuments = requiredTypes.map((type) => latest.get(type));

  if (requiredDocuments.some((document) => normalizeStatus(document?.status) === 'REJECTED')) return 'REJECTED';
  if (requiredDocuments.some((document) => !document)) return 'PENDING';
  if (requiredDocuments.length && requiredDocuments.every((document) => normalizeStatus(document?.status) === 'VERIFIED')) return 'VERIFIED';
  return 'PENDING';
}

export function withComputedVerificationStatus(profile, { stripDocuments = false } = {}) {
  if (!profile) return profile;
  const next = {
    ...profile,
    verificationStatus: computedVerificationStatus(profile)
  };
  if (stripDocuments) delete next.verificationDocuments;
  return next;
}
