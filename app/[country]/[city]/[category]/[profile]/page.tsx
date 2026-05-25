import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileDetail } from "@/components/profile-detail";
import { getListingUrl, type Listing } from "@/lib/data";
import { buildProfileSeoContent } from "@/lib/profile-seo";
import { getProfileGallery, getPublicProfileByPath } from "@/lib/profiles";
import { breadcrumbJsonLd, faqJsonLd, profileJsonLd, profileServiceJsonLd } from "@/lib/seo-schema";

function profileDescription(listing: Listing, generatedDescription: string) {
  const base = (listing.seoDescription || listing.about || listing.shortDescription || "").trim();
  if (listing.seoDescription && base.length < 90) return generatedDescription;
  if (base.length >= 40) return base;
  return `${listing.name} is an approved ${listing.category} profile in ${listing.cityName}. Browse services, reviews, contact details and gallery before sending a request.`;
}

export async function generateMetadata({ params }: { params: Promise<{ country: string; city: string; category: string; profile: string }> }): Promise<Metadata> {
  const { country, city, category, profile } = await params;
  const listing = await getPublicProfileByPath(country, city, category, profile);

  if (!listing) {
    return { title: "Profile Not Found" };
  }

  const seo = buildProfileSeoContent(listing);
  const description = profileDescription(listing, seo.description);
  const title = listing.seoTitle || seo.title;

  return {
    title,
    description,
    keywords: seo.keywords,
    alternates: { canonical: getListingUrl(listing) },
    openGraph: {
      title,
      description,
      url: getListingUrl(listing),
      images: [listing.coverImage || listing.image],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [listing.coverImage || listing.image]
    },
    robots: { index: true, follow: true },
    other: listing.isAdult ? { rating: "adult" } : undefined
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ country: string; city: string; category: string; profile: string }> }) {
  const { country, city, category, profile } = await params;
  const listing = await getPublicProfileByPath(country, city, category, profile);

  if (!listing) {
    notFound();
  }

  const gallery = listing.gallery?.length ? listing.gallery : await getProfileGallery(listing.id || listing.slug);
  const seo = buildProfileSeoContent(listing, gallery.length);

  const path = getListingUrl(listing);
  const jsonLd = [
    profileJsonLd(listing),
    profileServiceJsonLd(listing, seo),
    faqJsonLd(seo.faq),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: listing.country.toUpperCase(), path: `/${listing.country}` },
      { name: listing.cityName, path: `/${listing.country}/${listing.city}` },
      { name: listing.category, path: `/${listing.country}/${listing.city}/${listing.categorySlug}` },
      { name: listing.name, path }
    ])
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProfileDetail listing={listing} gallery={gallery} seoContent={seo} />
    </>
  );
}
