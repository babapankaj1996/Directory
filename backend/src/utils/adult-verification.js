const DOCUMENT_TYPES = ['GOV_ID', 'AGE_SELFIE'];

function normalizeType(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/[-\s]+/g, '_');
  return DOCUMENT_TYPES.includes(normalized) ? normalized : undefined;
}

function normalizeFileUrl(value) {
  const url = String(value || '').trim();
  return url.startsWith('/api/uploads/private/') ? url : '';
}

export function adultDocumentPayloads(body) {
  const raw = Array.isArray(body.adultVerificationDocuments)
    ? body.adultVerificationDocuments
    : Array.isArray(body.verificationDocuments)
      ? body.verificationDocuments
      : [];

  return raw
    .map((item) => {
      const type = normalizeType(item?.type);
      const fileUrl = normalizeFileUrl(item?.fileUrl || item?.url);
      if (!type || !fileUrl) return null;
      return {
        type,
        fileUrl,
        originalName: item.originalName || null,
        status: 'PENDING'
      };
    })
    .filter(Boolean);
}

export function validateAdultSubmission({ body, profileData, isDraft = false }) {
  if (!profileData.isAdult || isDraft) return;

  if (!body.adultDisclaimerAcceptedAt && !body.adultLegalConfirmed) {
    const error = new Error('18+ listings require legal responsibility confirmation.');
    error.statusCode = 400;
    throw error;
  }

  const docs = adultDocumentPayloads(body);
  const types = new Set(docs.map((doc) => doc.type));
  const missing = [
    !types.has('GOV_ID') && 'government ID',
    !types.has('AGE_SELFIE') && 'latest photo holding DOB paper'
  ].filter(Boolean);
  if (missing.length) {
    const error = new Error(`18+ listings require verification document(s): ${missing.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }
}

export function profileVerificationData(profileData, isDraft = false) {
  if (!profileData.isAdult) {
    return {
      isAdult: false,
      ageRestricted: false,
      adultLevel: 'NONE',
      verificationStatus: 'NOT_REQUIRED'
    };
  }

  return {
    isAdult: true,
    ageRestricted: true,
    adultLevel: profileData.adultLevel || 'AGE_RESTRICTED',
    adultDisclaimerAcceptedAt: profileData.adultDisclaimerAcceptedAt || new Date(),
    verificationStatus: isDraft ? 'PENDING' : profileData.verificationStatus || 'PENDING'
  };
}

export function documentStatus(value, fallback = 'PENDING') {
  const normalized = String(value || fallback).trim().toUpperCase();
  return ['PENDING', 'VERIFIED', 'REJECTED'].includes(normalized) ? normalized : fallback;
}
