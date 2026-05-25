import type { ProfileVerificationDocument } from "@/lib/data";

type VerificationDocumentLike = Pick<ProfileVerificationDocument, "type" | "status" | "createdAt" | "updatedAt">;

type VerificationStatusInput = {
  profileStatus?: string | null;
  documents?: VerificationDocumentLike[] | null;
  isAdult?: boolean;
};

const adultRequiredTypes = ["GOV_ID", "AGE_SELFIE"];

function normalizeStatus(status?: string | null) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized || "";
}

function latestDocumentsByType(documents: VerificationDocumentLike[]) {
  const latest = new Map<string, VerificationDocumentLike>();
  [...documents]
    .sort((a, b) => {
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    })
    .forEach((document) => {
      const type = String(document.type || "OTHER").toUpperCase();
      if (!latest.has(type)) latest.set(type, document);
    });
  return latest;
}

export function effectiveVerificationStatus({ profileStatus, documents, isAdult }: VerificationStatusInput) {
  const normalizedProfileStatus = normalizeStatus(profileStatus);
  const rows = Array.isArray(documents) ? documents : [];
  if (!rows.length) {
    if (normalizedProfileStatus && normalizedProfileStatus !== "NOT_REQUIRED") return normalizedProfileStatus;
    return isAdult ? "PENDING" : normalizedProfileStatus || "NOT_REQUIRED";
  }

  const latest = latestDocumentsByType(rows);
  const requiredTypes = isAdult ? adultRequiredTypes : [...latest.keys()];
  const requiredDocuments = requiredTypes.map((type) => latest.get(type));

  if (requiredDocuments.some((document) => normalizeStatus(document?.status) === "REJECTED")) return "REJECTED";
  if (normalizedProfileStatus === "REJECTED") return "REJECTED";
  if (requiredDocuments.some((document) => !document)) return "PENDING";
  if (requiredDocuments.length && requiredDocuments.every((document) => normalizeStatus(document?.status) === "VERIFIED")) return "VERIFIED";
  return "PENDING";
}
