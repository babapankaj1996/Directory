export const MAX_PROFILE_GALLERY_IMAGES = 10;

export function activeGalleryPayloads(items) {
  return (Array.isArray(items) ? items : []).filter((item) => String(item?.imageUrl || '').trim());
}

export function enforceGalleryBatchLimit(items) {
  if (items.length <= MAX_PROFILE_GALLERY_IMAGES) return;
  const error = new Error(`A profile can have up to ${MAX_PROFILE_GALLERY_IMAGES} gallery images.`);
  error.statusCode = 400;
  throw error;
}

export async function assertGallerySlotAvailable(prisma, profileId) {
  const count = await prisma.profileGallery.count({ where: { profileId } });
  if (count < MAX_PROFILE_GALLERY_IMAGES) return count;
  const error = new Error(`A profile can have up to ${MAX_PROFILE_GALLERY_IMAGES} gallery images.`);
  error.statusCode = 400;
  throw error;
}
