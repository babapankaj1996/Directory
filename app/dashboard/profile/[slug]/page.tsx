import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ProfileDetail } from "@/components/profile-detail";
import { getDashboardListing } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Owner Profile Preview",
  robots: { index: false, follow: false }
};

export default async function OwnerProfilePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  const listing = token ? await getDashboardListing(slug, token) : undefined;

  if (!listing) {
    notFound();
  }

  return <ProfileDetail listing={listing} gallery={listing.gallery || []} previewMode />;
}
