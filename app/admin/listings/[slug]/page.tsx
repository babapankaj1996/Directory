import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminListingReview } from "@/components/admin/admin-listing-review";
import { getGalleryByProfileSlug } from "@/lib/data";
import { getAdminListing } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Listing Review"
};

export default async function AdminListingReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const listing = await getAdminListing(slug, token);

  if (!listing) {
    notFound();
  }

  const gallery = listing.gallery?.length ? listing.gallery : getGalleryByProfileSlug(listing.slug);

  return <AdminListingReview listing={listing} gallery={gallery} />;
}
