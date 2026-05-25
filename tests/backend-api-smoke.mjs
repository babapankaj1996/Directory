const API = process.env.API_BASE || "http://localhost:4000";

async function json(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed ${response.status}: ${payload.error || response.statusText}`);
  }
  return payload;
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function login(email, password) {
  return json("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

const admin = await login("admin@example.com", "Admin@12345");
const owner = await login("owner@example.com", "Owner@12345");
const reviewer = await login("reviewer@example.com", "Review@12345");

assert(admin.data.role === "ADMIN", "admin role mismatch");
assert(owner.data.role === "OWNER", "owner role mismatch");
assert(reviewer.data.role === "USER", "reviewer role mismatch");

const normalProfiles = await json("/api/profiles");
const adultProfile = normalProfiles.data.find((item) => item.isAdult === true);

const nonAdultProfiles = await json("/api/profiles?adult=false");
if (adultProfile) {
  assert(!nonAdultProfiles.data.some((item) => item.slug === adultProfile.slug), "adult=false public profiles should exclude 18+ listings");
}

const adultProfiles = await json("/api/profiles?adult=true");
if (adultProfile) {
  assert(adultProfiles.data.some((item) => item.slug === adultProfile.slug && item.isAdult === true), "18+ listing missing from adult public profiles");
}

const missingSlug = await fetch(`${API}/api/profiles`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Missing Slug Smoke",
    description: "Submitting a non-draft public profile must require an owner-entered slug.",
    ownerName: "Smoke Admin",
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: "astrologer",
    address: "Delhi"
  })
});
assert(missingSlug.status === 400, "non-draft profile submission without slug must return 400");

const tooManyGalleryImages = await fetch(`${API}/api/admin/listings`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Codex Gallery Limit Smoke",
    slug: `codex-gallery-limit-${Date.now()}`,
    description: "Temporary payload used to verify gallery upload limits.",
    ownerName: "Smoke Admin",
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: "astrologer",
    address: "Delhi",
    gallery: Array.from({ length: 11 }, (_, index) => ({
      imageUrl: `https://example.com/gallery-${index}.jpg`,
      title: `Gallery ${index + 1}`,
      category: "Work Photos"
    }))
  })
});
const tooManyGalleryPayload = await tooManyGalleryImages.json().catch(() => ({}));
assert(tooManyGalleryImages.status === 400, "profile gallery above 10 images must return 400");
assert(String(tooManyGalleryPayload.error || "").includes("up to 10"), "gallery limit error message missing");

const underscoreSlug = `api_smoke_slug_${Date.now()}`;
const underscoreProfile = await json("/api/profiles", {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Underscore Slug Smoke",
    slug: underscoreSlug,
    description: "Temporary profile used by the backend API smoke test.",
    ownerName: "Smoke Admin",
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: "astrologer",
    address: "Delhi"
  })
});
assert(underscoreProfile.data.slug === underscoreSlug.replaceAll("_", "-"), "profile slug should normalize underscores to hyphens");
await json(`/api/profiles/${underscoreProfile.data.slug}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${admin.token}` }
});

const verificationDocuments = await json("/api/admin/listings/verification-documents", {
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(Array.isArray(verificationDocuments.data), "verification document queue must return an array");
if (verificationDocuments.data.length) {
  const document = verificationDocuments.data[0];
  const originalStatus = document.status;
  const originalNotes = document.adminNotes || "";
  const smokeNote = "API smoke verification note";
  const pendingDocument = await json(`/api/admin/listings/verification-documents/${document.id}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${admin.token}` },
    body: JSON.stringify({ status: "PENDING", adminNotes: smokeNote })
  });
  assert(pendingDocument.data.status === "PENDING", "verification document status update failed");
  assert(pendingDocument.data.adminNotes === smokeNote, "verification document admin note update failed");
  await json(`/api/admin/listings/verification-documents/${document.id}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${admin.token}` },
    body: JSON.stringify({ status: originalStatus, adminNotes: originalNotes })
  });
}

const verificationSlug = `codex-verification-flow-${Date.now()}`;
const verificationProfile = await json("/api/admin/listings", {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Codex Verification Flow Smoke",
    slug: verificationSlug,
    description: "Temporary approved profile used to verify document status rollups.",
    ownerName: "Demo Business Owner",
    ownerEmail: owner.data.email,
    ownerUserId: owner.data.id,
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: "astrologer",
    address: "Delhi",
    status: "APPROVED"
  })
});
assert(verificationProfile.data.slug === verificationSlug, "verification smoke listing creation failed");

const businessLicense = await json(`/api/admin/listings/${verificationSlug}/verification-documents`, {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    type: "BUSINESS_LICENSE",
    fileUrl: "/api/uploads/private/smoke-license.png",
    originalName: "smoke-license.png"
  })
});
const certificate = await json(`/api/admin/listings/${verificationSlug}/verification-documents`, {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    type: "CERTIFICATE",
    fileUrl: "/api/uploads/private/smoke-certificate.png",
    originalName: "smoke-certificate.png"
  })
});

await json(`/api/admin/listings/verification-documents/${businessLicense.data.id}/status`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ status: "VERIFIED", adminNotes: "" })
});
await json(`/api/admin/listings/verification-documents/${certificate.data.id}/status`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ status: "VERIFIED", adminNotes: "" })
});
const verifiedRollup = await json(`/api/admin/listings/${verificationSlug}`, {
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(verifiedRollup.data.verificationStatus === "VERIFIED", "all verified documents should mark profile verification verified");
const ownerVerifiedRollup = await json("/api/dashboard/listings", {
  headers: { Authorization: `Bearer ${owner.token}` }
});
assert(ownerVerifiedRollup.data.some((item) => item.slug === verificationSlug && item.verificationStatus === "VERIFIED"), "owner dashboard should receive verified rollup status");

await json(`/api/admin/listings/${verificationSlug}/verification`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    verificationStatus: "PENDING",
    verificationNotes: "Smoke stale profile status",
    documents: [
      { id: businessLicense.data.id, status: "VERIFIED" },
      { id: certificate.data.id, status: "VERIFIED" }
    ]
  })
});
const publicComputedRollup = await json(`/api/profiles/${verificationSlug}`);
assert(publicComputedRollup.data.verificationStatus === "VERIFIED", "public profile should derive verified status from verified documents");
assert(!("verificationDocuments" in publicComputedRollup.data), "public profile response should not expose private verification documents");
const ownerComputedRollup = await json("/api/dashboard/listings", {
  headers: { Authorization: `Bearer ${owner.token}` }
});
assert(ownerComputedRollup.data.some((item) => item.slug === verificationSlug && item.verificationStatus === "VERIFIED"), "owner dashboard should derive verified status from verified documents");
const adminComputedRollup = await json("/api/admin/listings", {
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(adminComputedRollup.data.some((item) => item.slug === verificationSlug && item.verificationStatus === "VERIFIED"), "admin listings should derive verified status from verified documents");

const rejectedRollupDocument = await json(`/api/admin/listings/verification-documents/${businessLicense.data.id}/status`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ status: "REJECTED", adminNotes: "Smoke rejection note" })
});
assert(rejectedRollupDocument.data.profile.verificationStatus === "REJECTED", "rejected document should mark profile verification rejected");
const ownerRejectedRollup = await json("/api/dashboard/listings", {
  headers: { Authorization: `Bearer ${owner.token}` }
});
assert(ownerRejectedRollup.data.some((item) => item.slug === verificationSlug && item.verificationStatus === "REJECTED"), "owner dashboard should receive rejected rollup status");
const adminRejectedRollup = await json("/api/admin/listings", {
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(adminRejectedRollup.data.some((item) => item.slug === verificationSlug && item.verificationStatus === "REJECTED"), "admin listings should receive rejected rollup status");

await json(`/api/admin/listings/${verificationSlug}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${admin.token}` }
});

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
const form = new FormData();
form.set("type", "avatar");
form.set("image", new Blob([png], { type: "image/png" }), "smoke.png");
const upload = await json("/api/uploads/image", {
  method: "POST",
  headers: { Authorization: `Bearer ${owner.token}` },
  body: form
});
assert(upload.data.url.includes("/uploads/images/avatar-"), "upload URL missing");

const ownerListings = await json("/api/dashboard/listings", {
  headers: { Authorization: `Bearer ${owner.token}` }
});
assert(ownerListings.data.length === 1, "owner should have one listing");

const ownerLeadQuality = await json("/api/dashboard/leads/quality", {
  headers: { Authorization: `Bearer ${owner.token}` }
});
assert(typeof ownerLeadQuality.data.summary.avgScore === "number", "owner lead quality summary missing avgScore");
assert(typeof ownerLeadQuality.data.summary.conversionRate === "number", "owner lead quality summary missing conversionRate");

const adminLeadQuality = await json("/api/admin/quotes/quality", {
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(typeof adminLeadQuality.data.summary.avgScore === "number", "admin lead quality summary missing avgScore");

const featureSlug = `codex-feature-request-${Date.now()}`;
const featureListing = await json("/api/admin/listings", {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Codex Feature Request Smoke",
    slug: featureSlug,
    description: "Temporary approved profile used to verify featured placement requests.",
    ownerName: "Smoke Admin",
    ownerEmail: "codex-feature-smoke@example.com",
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: "astrologer",
    address: "Delhi",
    status: "APPROVED"
  })
});
assert(featureListing.data.status === "APPROVED", "feature smoke listing should be approved");

const featureRequest = await json(`/api/dashboard/listings/${featureSlug}/featured-request`, {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ requestedDays: 7, requestedPage: "CATEGORY" })
});
assert(featureRequest.data.request.status === "PENDING", "featured request should start pending");
assert(featureRequest.data.request.requestedDays === 7, "featured request duration mismatch");
assert(featureRequest.data.request.requestedPagePath === "/in/delhi/astrologer", "featured request page path mismatch");
assert(featureRequest.data.request.priceAmount > 0, "featured request should include price snapshot");
assert(featureRequest.data.request.placementKey, "featured request should include placement key");

const adminFeatureListing = await json(`/api/admin/listings/${featureSlug}`, {
  headers: { Authorization: `Bearer ${admin.token}` }
});
const pendingFeatureRequest = adminFeatureListing.data.featuredPlacementRequests?.find((item) => item.status === "PENDING");
assert(pendingFeatureRequest?.id === featureRequest.data.request.id, "admin listing detail missing pending featured request");

const approvedFeatureRequest = await json(`/api/admin/listings/featured-requests/${featureRequest.data.request.id}/status`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ status: "APPROVED" })
});
assert(approvedFeatureRequest.data.status === "APPROVED", "featured request approval failed");
assert(approvedFeatureRequest.profile.isFeatured === true, "featured request approval should mark profile featured");
assert(approvedFeatureRequest.profile.featuredUntil, "featured request approval should set expiry");
assert(approvedFeatureRequest.data.campaigns?.some((campaign) => campaign.pagePath === "/in/delhi/astrologer"), "featured request approval should create scoped campaign");

await json(`/api/admin/listings/${featureSlug}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${admin.token}` }
});

const billingSettings = await json("/api/admin/billing/settings", {
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(["WALLET", "RAZORPAY", "BOTH"].includes(billingSettings.data.mode), "billing settings should expose featured payment mode");

await json("/api/admin/billing/settings", {
  method: "PUT",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ mode: "BOTH", currency: "INR", razorpayKeyId: "rzp_test_smoke_key" })
});

const walletCredit = await json(`/api/admin/billing/wallets/${owner.data.id}/credit`, {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ amount: 2500, currency: "INR", reason: "API smoke wallet credit" })
});
assert(walletCredit.data.wallet.availableBalance >= 2500, "admin should be able to credit owner wallet");

const ownerTopupRequest = await json("/api/dashboard/wallet/topups", {
  method: "POST",
  headers: { Authorization: `Bearer ${owner.token}` },
  body: JSON.stringify({ amount: 1234, reason: "API smoke owner top-up request" })
});
assert(ownerTopupRequest.data.transaction.status === "PENDING", "owner wallet top-up request should start pending");
assert(ownerTopupRequest.data.transaction.referenceType === "WALLET_TOPUP_REQUEST", "owner wallet top-up should use wallet top-up reference");

const pendingTopups = await json("/api/admin/billing/topups?status=PENDING", {
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(pendingTopups.data.some((item) => item.id === ownerTopupRequest.data.transaction.id), "admin wallet page API should list pending owner top-up");

const approvedTopup = await json(`/api/admin/billing/topups/${ownerTopupRequest.data.transaction.id}/status`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ status: "APPROVED" })
});
assert(approvedTopup.data.transaction.status === "APPROVED", "admin should approve owner wallet top-up request");
assert(approvedTopup.data.transaction.user.wallet.availableBalance >= walletCredit.data.wallet.availableBalance + 1234, "approved owner top-up should add wallet balance");

const walletFeatureSlug = `codex-wallet-feature-${Date.now()}`;
const walletFeatureListing = await json("/api/admin/listings", {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Codex Wallet Feature Smoke",
    slug: walletFeatureSlug,
    description: "Temporary approved profile used to verify wallet-funded featured placement requests.",
    ownerName: owner.data.name,
    ownerEmail: owner.data.email,
    ownerUserId: owner.data.id,
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: "astrologer",
    address: "Delhi",
    status: "APPROVED"
  })
});
assert(walletFeatureListing.data.status === "APPROVED", "wallet feature smoke listing should be approved");

const walletFeatureRequest = await json(`/api/dashboard/listings/${walletFeatureSlug}/featured-request`, {
  method: "POST",
  headers: { Authorization: `Bearer ${owner.token}` },
  body: JSON.stringify({ requestedDays: 3, requestedPage: "CITY_CATEGORY", paymentMethod: "WALLET" })
});
assert(walletFeatureRequest.data.request.status === "PENDING", "wallet featured request should wait for admin review");
assert(walletFeatureRequest.data.request.paymentProvider === "WALLET", "wallet featured request should record wallet provider");
assert(walletFeatureRequest.data.request.paymentStatus === "WALLET_HOLD", "wallet featured request should hold funds");

const walletHoldSummary = await json("/api/dashboard/wallet", {
  headers: { Authorization: `Bearer ${owner.token}` }
});
assert(walletHoldSummary.data.wallet.heldBalance >= walletFeatureRequest.data.request.priceAmount, "wallet hold should be visible to owner");

const approvedWalletFeatureRequest = await json(`/api/admin/listings/featured-requests/${walletFeatureRequest.data.request.id}/status`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ status: "APPROVED" })
});
assert(approvedWalletFeatureRequest.data.paymentStatus === "WALLET_CAPTURED", "wallet approval should capture held balance");
assert(approvedWalletFeatureRequest.profile.isFeatured === true, "wallet feature approval should mark profile featured");

await json(`/api/admin/listings/${walletFeatureSlug}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${admin.token}` }
});

const deleteCategorySlug = `codex-delete-category-${Date.now()}`;
const deleteCategory = await json("/api/categories", {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Codex Delete Category Smoke",
    slug: deleteCategorySlug,
    description: "Temporary category used to verify deleting a category removes linked profiles.",
    status: "ACTIVE"
  })
});
assert(deleteCategory.data.slug === deleteCategorySlug, "temporary category creation failed");

const deleteCategoryListing = await json("/api/admin/listings", {
  method: "POST",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({
    name: "Codex Category Delete Profile",
    slug: `codex-category-delete-profile-${Date.now()}`,
    description: "Temporary profile used to verify category deletion removes linked profiles.",
    ownerName: "Smoke Admin",
    ownerEmail: "codex-category-delete@example.com",
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: deleteCategorySlug,
    address: "Delhi",
    status: "APPROVED"
  })
});
assert(deleteCategoryListing.data.categoryId === deleteCategorySlug, "temporary profile category mismatch");

const deletedCategory = await json(`/api/categories/${deleteCategorySlug}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${admin.token}` }
});
assert(deletedCategory.deletedProfiles === 1, "category delete should remove linked profiles");

const deletedCategoryProfiles = await json(`/api/profiles?category=${deleteCategorySlug}`);
assert(!deletedCategoryProfiles.data.some((item) => item.slug === deleteCategoryListing.data.slug), "deleted category profile should not remain public");
const missingCategory = await fetch(`${API}/api/categories/${deleteCategorySlug}`);
assert(missingCategory.status === 404, "deleted category should return 404");

const savedProfile = await json("/api/dashboard/saved-profiles/aditya-pareek", {
  method: "POST",
  headers: { Authorization: `Bearer ${reviewer.token}` }
});
assert(savedProfile.data.profile.slug === "aditya-pareek", "reviewer save profile failed");

const savedStatus = await json("/api/dashboard/saved-profiles/aditya-pareek/status", {
  headers: { Authorization: `Bearer ${reviewer.token}` }
});
assert(savedStatus.data.saved === true, "saved profile status should be true");

const savedList = await json("/api/dashboard/saved-profiles", {
  headers: { Authorization: `Bearer ${reviewer.token}` }
});
assert(savedList.data.some((item) => item.profile.slug === "aditya-pareek"), "saved profile list missing saved item");

const duplicate = await fetch(`${API}/api/profiles`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${owner.token}` },
  body: JSON.stringify({
    name: "Blocked API Smoke",
    slug: "blocked-api-smoke",
    description: "Second owner listing should be blocked.",
    ownerName: "Demo Business Owner",
    phone: "+91 90000 00000",
    countryId: "in",
    citySlug: "delhi",
    categoryId: "astrologer",
    address: "Delhi"
  })
});
assert(duplicate.status === 409, "second owner listing must return 409");

const review = await json("/api/profiles/vedic-vision-astro/reviews", {
  method: "POST",
  headers: { Authorization: `Bearer ${reviewer.token}` },
  body: JSON.stringify({
    rating: 5,
    title: "API smoke moderation",
    comment: "Temporary review created by the backend API smoke test."
  })
});
assert(review.data.status === "PENDING", "new reviews should be pending");

const reviewerHistory = await json("/api/dashboard/reviews", {
  headers: { Authorization: `Bearer ${reviewer.token}` }
});
assert(reviewerHistory.data.some((item) => item.id === review.data.id && item.profile.slug === "vedic-vision-astro"), "reviewer dashboard history missing pending review");

const before = await json("/api/profiles/vedic-vision-astro/reviews");
assert(!before.data.some((item) => item.id === review.data.id), "pending review should not be public");

const approved = await json(`/api/admin/reviews/${review.data.id}/status`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ status: "APPROVED" })
});
assert(approved.data.status === "APPROVED", "admin approval failed");

const after = await json("/api/profiles/vedic-vision-astro/reviews");
assert(after.data.some((item) => item.id === review.data.id), "approved review should be public");

await json(`/api/admin/reviews/${review.data.id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${admin.token}` }
});

await json("/api/dashboard/saved-profiles/aditya-pareek", {
  method: "DELETE",
  headers: { Authorization: `Bearer ${reviewer.token}` }
});

console.log("Backend API smoke passed.");
